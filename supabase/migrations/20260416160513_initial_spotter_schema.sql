create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'breed_rarity') then
    create type public.breed_rarity as enum ('common', 'uncommon', 'rare', 'legendary');
  end if;

  if not exists (select 1 from pg_type where typname = 'friendship_status') then
    create type public.friendship_status as enum ('pending', 'accepted', 'declined');
  end if;

  if not exists (select 1 from pg_type where typname = 'badge_type') then
    create type public.badge_type as enum (
      'first_spot',
      'ten_breeds',
      'quarter_dex',
      'half_dex',
      'full_dex',
      'rare_finder',
      'legend_spotter',
      'featured_hunter',
      'century',
      'social_pup',
      'top_dog_owner'
    );
  end if;
end
$$;

create or replace function public.current_week_start_aest(input_ts timestamptz default now())
returns date
language sql
immutable
as $$
  select (
    date_trunc('week', timezone('Australia/Sydney', input_ts)::timestamp)::date
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, avatar_url, total_scans, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'spotter_' || left(new.id::text, 8)),
    new.raw_user_meta_data ->> 'avatar_url',
    0,
    coalesce(new.created_at, now())
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  avatar_url text,
  total_scans integer not null default 0 check (total_scans >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.breeds (
  id text primary key,
  name text not null unique,
  rarity public.breed_rarity not null,
  points integer not null check (points >= 0),
  description text not null,
  origin text not null,
  temperament text not null,
  size text not null,
  lifespan text not null,
  reference_photo_url text
);

create table if not exists public.dog_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  breed_id text not null references public.breeds (id) on delete cascade,
  owner_id uuid references public.users (id) on delete set null,
  total_scans integer not null default 0 check (total_scans >= 0),
  created_at timestamptz not null default now(),
  unique (breed_id, normalized_name)
);

create table if not exists public.friendships (
  user_id uuid not null references public.users (id) on delete cascade,
  friend_id uuid not null references public.users (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create unique index if not exists friendships_pair_unique_idx
  on public.friendships (least(user_id, friend_id), greatest(user_id, friend_id));

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table if not exists public.weekly_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete cascade,
  league_scope_id uuid generated always as (coalesce(league_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  points integer not null default 0 check (points >= 0),
  week_start date not null default public.current_week_start_aest(),
  created_at timestamptz not null default now(),
  unique (user_id, league_scope_id, week_start)
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  badge_type public.badge_type not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_type)
);

create table if not exists public.featured_breeds (
  id uuid primary key default gen_random_uuid(),
  breed_id text not null references public.breeds (id) on delete cascade,
  feature_date date not null unique,
  is_active boolean not null default false
);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  breed_id text references public.breeds (id) on delete set null,
  photo_url text not null,
  dog_name text,
  dog_profile_id uuid references public.dog_profiles (id) on delete set null,
  location_lat double precision,
  location_lng double precision,
  scanned_at timestamptz not null default now(),
  is_pending_breed boolean not null default false,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  matched_featured_breed boolean not null default false
);

create index if not exists scans_user_scanned_at_idx on public.scans (user_id, scanned_at desc);
create index if not exists scans_breed_idx on public.scans (breed_id);
create index if not exists scans_dog_name_idx on public.scans (dog_name);
create index if not exists friendships_user_status_idx on public.friendships (user_id, status);
create index if not exists weekly_scores_league_week_points_idx on public.weekly_scores (league_id, week_start, points desc);
create index if not exists featured_breeds_feature_date_idx on public.featured_breeds (feature_date);

create or replace function public.award_scan_badges(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_scan_count integer;
  breed_count integer;
  rare_count integer;
  legendary_count integer;
begin
  select count(*) into total_scan_count from public.scans where user_id = target_user_id;
  select count(distinct breed_id) into breed_count from public.scans where user_id = target_user_id and breed_id is not null and is_pending_breed = false;
  select count(*) into rare_count
  from public.scans s
  join public.breeds b on b.id = s.breed_id
  where s.user_id = target_user_id and b.rarity = 'rare';
  select count(*) into legendary_count
  from public.scans s
  join public.breeds b on b.id = s.breed_id
  where s.user_id = target_user_id and b.rarity = 'legendary';

  if total_scan_count >= 1 then
    insert into public.badges (user_id, badge_type) values (target_user_id, 'first_spot') on conflict do nothing;
  end if;

  if total_scan_count >= 100 then
    insert into public.badges (user_id, badge_type) values (target_user_id, 'century') on conflict do nothing;
  end if;

  if breed_count >= 10 then
    insert into public.badges (user_id, badge_type) values (target_user_id, 'ten_breeds') on conflict do nothing;
  end if;

  if breed_count >= 25 then
    insert into public.badges (user_id, badge_type) values (target_user_id, 'quarter_dex') on conflict do nothing;
    insert into public.badges (user_id, badge_type) values (target_user_id, 'half_dex') on conflict do nothing;
  end if;

  if breed_count >= 50 then
    insert into public.badges (user_id, badge_type) values (target_user_id, 'full_dex') on conflict do nothing;
  end if;

  if rare_count >= 1 then
    insert into public.badges (user_id, badge_type) values (target_user_id, 'rare_finder') on conflict do nothing;
  end if;

  if legendary_count >= 1 then
    insert into public.badges (user_id, badge_type) values (target_user_id, 'legend_spotter') on conflict do nothing;
  end if;

  if exists (select 1 from public.scans where user_id = target_user_id and matched_featured_breed = true) then
    insert into public.badges (user_id, badge_type) values (target_user_id, 'featured_hunter') on conflict do nothing;
  end if;
end;
$$;

create or replace function public.handle_scan_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_week date := public.current_week_start_aest(new.scanned_at);
begin
  update public.users
  set total_scans = (
    select count(*) from public.scans where user_id = new.user_id
  )
  where id = new.user_id;

  insert into public.weekly_scores (user_id, league_id, points, week_start)
  values (new.user_id, null, new.points_awarded, current_week)
  on conflict (user_id, league_scope_id, week_start)
  do update set points = public.weekly_scores.points + excluded.points;

  insert into public.weekly_scores (user_id, league_id, points, week_start)
  select new.user_id, lm.league_id, new.points_awarded, current_week
  from public.league_members lm
  where lm.user_id = new.user_id
  on conflict (user_id, league_scope_id, week_start)
  do update set points = public.weekly_scores.points + excluded.points;

  perform public.award_scan_badges(new.user_id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists scans_after_insert on public.scans;
create trigger scans_after_insert
  after insert on public.scans
  for each row execute procedure public.handle_scan_progress();

alter table public.users enable row level security;
alter table public.breeds enable row level security;
alter table public.scans enable row level security;
alter table public.dog_profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.weekly_scores enable row level security;
alter table public.badges enable row level security;
alter table public.featured_breeds enable row level security;

create policy "users_read_authenticated"
  on public.users for select
  to authenticated
  using (true);

create policy "users_update_self"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "breeds_read_authenticated"
  on public.breeds for select
  to authenticated
  using (true);

create policy "featured_breeds_read_authenticated"
  on public.featured_breeds for select
  to authenticated
  using (true);

create policy "scans_select_owner_or_friends"
  on public.scans for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = auth.uid() and f.friend_id = public.scans.user_id)
          or (f.friend_id = auth.uid() and f.user_id = public.scans.user_id)
        )
    )
  );

create policy "scans_insert_self"
  on public.scans for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "scans_update_self"
  on public.scans for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dog_profiles_read_authenticated"
  on public.dog_profiles for select
  to authenticated
  using (true);

create policy "dog_profiles_insert_authenticated"
  on public.dog_profiles for insert
  to authenticated
  with check (true);

create policy "dog_profiles_update_authenticated"
  on public.dog_profiles for update
  to authenticated
  using (true)
  with check (true);

create policy "friendships_select_participants"
  on public.friendships for select
  to authenticated
  using (auth.uid() in (user_id, friend_id));

create policy "friendships_insert_self"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "friendships_update_participants"
  on public.friendships for update
  to authenticated
  using (auth.uid() in (user_id, friend_id))
  with check (auth.uid() in (user_id, friend_id));

create policy "leagues_select_members"
  on public.leagues for select
  to authenticated
  using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = public.leagues.id
        and lm.user_id = auth.uid()
    )
    or created_by = auth.uid()
  );

create policy "leagues_insert_self"
  on public.leagues for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "leagues_update_creator"
  on public.leagues for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "league_members_select_member"
  on public.league_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.league_members own_membership
      where own_membership.league_id = public.league_members.league_id
        and own_membership.user_id = auth.uid()
    )
  );

create policy "league_members_insert_creator_or_self"
  on public.league_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.leagues l
      where l.id = league_id and l.created_by = auth.uid()
    )
  );

create policy "weekly_scores_select_visible"
  on public.weekly_scores for select
  to authenticated
  using (
    league_id is null
    or exists (
      select 1 from public.league_members lm
      where lm.league_id = public.weekly_scores.league_id
        and lm.user_id = auth.uid()
    )
  );

create policy "badges_select_authenticated"
  on public.badges for select
  to authenticated
  using (true);

create policy "badges_insert_service_or_self"
  on public.badges for insert
  to authenticated
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('breed-reference', 'breed-reference', true),
  ('scans', 'scans', false)
on conflict (id) do nothing;

create policy "avatars_public_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "scans_owner_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'scans'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.scans s
        join public.friendships f
          on f.status = 'accepted'
         and (
           (f.user_id = auth.uid() and f.friend_id = s.user_id)
           or (f.friend_id = auth.uid() and f.user_id = s.user_id)
         )
        where s.photo_url like '%' || name
      )
    )
  );

create policy "scans_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "scans_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "breed_reference_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'breed-reference');
