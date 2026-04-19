alter table public.scans
  add column if not exists location_label text;
