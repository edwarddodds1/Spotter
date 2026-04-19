-- League invite code, capacity, and optional season end for friends leagues.
alter table public.leagues
  add column if not exists invite_code text,
  add column if not exists max_members integer not null default 20
    check (max_members >= 2 and max_members <= 500),
  add column if not exists ends_at timestamptz;

create unique index if not exists leagues_invite_code_unique_idx
  on public.leagues (invite_code)
  where invite_code is not null;
