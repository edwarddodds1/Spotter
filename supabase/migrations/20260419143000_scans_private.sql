-- Per-scan privacy: excluded from social feed when true
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.scans.is_private IS 'When true, scan is hidden from social feed';
