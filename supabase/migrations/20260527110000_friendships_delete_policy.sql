-- Friends system: allow either participant to remove a friendship row.
--
-- The initial schema covers select/insert/update for friendships but never
-- exposed DELETE, so "unfriend" silently no-ops under RLS. This policy lets
-- either side hard-delete a friendship — which is also how we treat decline
-- when the user wants to clear a request rather than soft-decline it.

drop policy if exists "friendships_delete_participants" on public.friendships;
create policy "friendships_delete_participants"
  on public.friendships for delete
  to authenticated
  using (auth.uid() in (user_id, friend_id));
