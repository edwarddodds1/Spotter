-- ============================================================================
-- Content moderation: user blocks + content reports
-- ============================================================================
--
-- Required by App Store Review Guideline 1.2 (user-generated content): the app
-- must let users report objectionable content and block abusive users. These
-- tables back those flows. Both cascade from public.users so the
-- delete-account edge function wipes them automatically.

-- ---------------------------------------------------------------------------
-- user_blocks: a one-directional block from blocker -> blocked.
-- ---------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_id);

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
  on public.user_blocks for select
  to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

-- ---------------------------------------------------------------------------
-- content_reports: a report filed by a user against a scan and/or another user.
-- ---------------------------------------------------------------------------
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  reported_user_id uuid references public.users (id) on delete cascade,
  scan_id uuid references public.scans (id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists content_reports_reporter_idx on public.content_reports (reporter_id);
create index if not exists content_reports_status_idx on public.content_reports (status);

alter table public.content_reports enable row level security;

-- Reporters can file and see their own reports. Triage/resolution is handled
-- out-of-band with the service role, so no user-facing update/delete policy.
drop policy if exists "content_reports_select_own" on public.content_reports;
create policy "content_reports_select_own"
  on public.content_reports for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "content_reports_insert_own" on public.content_reports;
create policy "content_reports_insert_own"
  on public.content_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());
