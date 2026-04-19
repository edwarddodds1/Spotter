-- Optional user note on a spot (separate from coat_colour_note for "Other" coat).
alter table public.scans
  add column if not exists spot_comment text;
