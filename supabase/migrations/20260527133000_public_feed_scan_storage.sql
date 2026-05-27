-- Public-feed photos: allow authenticated users to read objects in the
-- private `scans` bucket whenever the referencing scan row is non-private
-- and non-pending. The existing owner / accepted-friend storage policy is
-- left in place; this is additive.
--
-- Mirrors the table-level `scans_select_public_non_private` policy added in
-- 20260527113000_public_feed_scans.sql so the social feed can show
-- everyone's public photos (signed URLs still gate the actual bytes).

drop policy if exists "scans_public_read" on storage.objects;
create policy "scans_public_read"
  on storage.objects for select
  to authenticated
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
