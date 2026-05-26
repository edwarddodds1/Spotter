-- Pilot hardening migration.
--
-- Adds the missing DELETE policies (scans table + scans storage bucket), a
-- self-insert policy for `public.users` so `ensureUserProfile` recovers when
-- the `handle_new_user` trigger fails, and tightens the friends-select policy
-- on `public.scans` so a user's `is_private` spots never leak through the API
-- even if a UI filter is missed.
--
-- Idempotent: every policy is dropped (if it exists) before being recreated,
-- so re-running this migration is safe.

-- 1. Allow a user to delete their own scan rows.
drop policy if exists "scans_delete_self" on public.scans;
create policy "scans_delete_self"
  on public.scans for delete
  to authenticated
  using (auth.uid() = user_id);

-- 2. Allow a user to delete their own objects in the private `scans` bucket.
--    Mirrors the existing scans_owner_write / _update policies — owner is
--    the first folder segment of the object name (we upload as `{uid}/{scanId}.jpg`).
drop policy if exists "scans_owner_delete" on storage.objects;
create policy "scans_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Allow the signed-in user to insert their own row into public.users.
--    Primary path is still the `handle_new_user` trigger (SECURITY DEFINER) on
--    auth.users insert, but the client-side `ensureUserProfile` upsert needs
--    this when the trigger missed (older accounts, manual cleanups, etc.).
drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

-- 4. Enforce `is_private` at the database layer, not just in the UI.
--    Owners can always read their own scans; friends can only read non-private ones.
drop policy if exists "scans_select_owner_or_friends" on public.scans;
create policy "scans_select_owner_or_friends"
  on public.scans for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      coalesce(is_private, false) = false
      and exists (
        select 1
        from public.friendships f
        where f.status = 'accepted'
          and (
            (f.user_id = auth.uid() and f.friend_id = public.scans.user_id)
            or (f.friend_id = auth.uid() and f.user_id = public.scans.user_id)
          )
      )
    )
  );
