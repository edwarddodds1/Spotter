-- Public feed in demo / signed-out sessions:
-- allow anon reads of non-private, non-pending scan rows and the
-- corresponding storage objects in the private `scans` bucket.
--
-- This is intentionally limited to rows already considered feed-safe.

drop policy if exists "scans_select_public_non_private_anon" on public.scans;
create policy "scans_select_public_non_private_anon"
  on public.scans for select
  to anon
  using (
    coalesce(is_private, false) = false
    and coalesce(is_pending_breed, false) = false
  );

drop policy if exists "scans_public_read_anon" on storage.objects;
create policy "scans_public_read_anon"
  on storage.objects for select
  to anon
  using (
    bucket_id = 'scans'
    and exists (
      select 1
      from public.scans s
      where coalesce(s.is_private, false) = false
        and coalesce(s.is_pending_breed, false) = false
        and s.photo_url like '%' || name
    )
  );
