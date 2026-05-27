-- In-app notifications.
--
-- One row per "something happened to me" event. The signed-in user can read
-- and update (mark read) only their own rows. Inserts happen via SECURITY
-- DEFINER triggers fired by the friendships table, so RLS doesn't need an
-- INSERT policy for end users.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in (
    'friend_request',
    'friend_request_accepted'
  )),
  actor_user_id uuid references public.users (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_self" on public.notifications;
create policy "notifications_update_self"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_self" on public.notifications;
create policy "notifications_delete_self"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = user_id);

-- Triggers on friendships drive notifications. SECURITY DEFINER so the
-- inserts succeed even though the trigger fires under the actor's session.
create or replace function public.handle_friendship_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    if new.status = 'pending' then
      insert into public.notifications (user_id, kind, actor_user_id)
      values (new.friend_id, 'friend_request', new.user_id);
    end if;
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    if new.status = 'accepted' and coalesce(old.status, '') <> 'accepted' then
      -- Notify the original requester that the recipient accepted.
      insert into public.notifications (user_id, kind, actor_user_id)
      values (new.user_id, 'friend_request_accepted', new.friend_id);
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists friendships_after_insert_notify on public.friendships;
create trigger friendships_after_insert_notify
  after insert on public.friendships
  for each row execute procedure public.handle_friendship_notification();

drop trigger if exists friendships_after_update_notify on public.friendships;
create trigger friendships_after_update_notify
  after update on public.friendships
  for each row execute procedure public.handle_friendship_notification();
