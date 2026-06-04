-- ============================================================================
-- Scans bucket hardening (defense-in-depth for the photo durability pipeline)
-- ============================================================================
--
-- Context
-- -------
-- A client-side bug previously caused the web upload path to fetch a bare
-- storage key (`<uid>/<scanId>.jpg`) which the dev/prod web server resolved to
-- the Spotter SPA's `index.html` (exactly 1599 bytes). That HTML was then
-- uploaded into the private `scans` bucket with `Content-Type: image/jpeg`,
-- silently overwriting the real photo. The client fix landed in
-- `src/lib/supabase/storage.ts` (reject non-image content-types + bare paths),
-- but we want a server-side guard so this class of bug is impossible to
-- reintroduce — no matter what the client says.
--
-- This migration:
-- 1. Restricts `allowed_mime_types` on the `scans` bucket so an upload with a
--    non-image content-type is rejected by Storage before it even reaches us.
-- 2. Sets a generous `file_size_limit` to stop accidental giant uploads.
-- 3. Adds a `BEFORE INSERT OR UPDATE` trigger on `storage.objects` that
--    rejects any scans-bucket object smaller than 4 KB. Real phone photos are
--    always well above this; HTML shells (1599 bytes) and similar accidental
--    text content are not.
--
-- Together (1) blocks the obvious case and (3) blocks the
-- "client lies about content-type" case.

-- 1. Bucket-level guard: only accept actual image MIME types.
update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ],
  file_size_limit = 12 * 1024 * 1024
where id = 'scans';

-- 2. Size-floor guard. Any scans upload smaller than 4 KB is rejected at the
--    metadata insert step, regardless of what the client claims the
--    content-type is.
create or replace function public.enforce_scans_min_object_size()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_size bigint;
begin
  if new.bucket_id is distinct from 'scans' then
    return new;
  end if;

  v_size := coalesce((new.metadata->>'size')::bigint, 0);
  if v_size > 0 and v_size < 4096 then
    raise exception
      'scans bucket rejects objects smaller than 4096 bytes (got % bytes for %)',
      v_size, new.name
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_scans_min_object_size_trg on storage.objects;
create trigger enforce_scans_min_object_size_trg
before insert or update on storage.objects
for each row execute function public.enforce_scans_min_object_size();
