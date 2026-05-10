-- Allow designated admin(s) to insert a breed row when the DB was migrated but not seeded (update otherwise affects 0 rows).
create policy "breeds_insert_admin_email"
  on public.breeds for insert
  to authenticated
  with check (lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'doddsy2005@gmail.com');
