-- Badge unlocks feed source.
--
-- A row per badge a user has earned (one per user/badge pair). The Social feed
-- reads from this table to render "X earned the Y badge" cards alongside
-- scans. RLS lets any authenticated user read all rows so the feed is shared,
-- but inserts are gated to the actor (matches scans' "I can post my own"
-- model).

create table if not exists public.badge_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  badge text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, badge)
);

create index if not exists badge_unlocks_recent_idx
  on public.badge_unlocks (unlocked_at desc);
create index if not exists badge_unlocks_user_idx
  on public.badge_unlocks (user_id, unlocked_at desc);

alter table public.badge_unlocks enable row level security;

drop policy if exists "badge_unlocks_select_authenticated" on public.badge_unlocks;
create policy "badge_unlocks_select_authenticated"
  on public.badge_unlocks for select
  to authenticated
  using (true);

drop policy if exists "badge_unlocks_insert_self" on public.badge_unlocks;
create policy "badge_unlocks_insert_self"
  on public.badge_unlocks for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "badge_unlocks_delete_self" on public.badge_unlocks;
create policy "badge_unlocks_delete_self"
  on public.badge_unlocks for delete
  to authenticated
  using (auth.uid() = user_id);