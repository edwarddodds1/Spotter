-- Coat colour captured at scan time (breed-specific palette + optional "other" note).
alter table public.scans
  add column if not exists coat_colour_id text,
  add column if not exists coat_colour_note text;
