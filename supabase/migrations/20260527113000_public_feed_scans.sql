-- Public feed: allow any authenticated user to read non-private,
-- non-pending scans from any author.
--
-- Owners (`scans_select_owner_or_friends`) keep full read access to their own
-- scans (including private + pending). Friends keep their accepted-only read
-- path. This new policy is purely additive for the public feed.

create policy "scans_select_public_non_private"
  on public.scans for select
  to authenticated
  using (
    coalesce(is_private, false) = false
    and coalesce(is_pending_breed, false) = false
  );
