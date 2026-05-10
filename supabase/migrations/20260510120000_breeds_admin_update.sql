-- Allow designated admin(s) to update breed profile copy shown app-wide (display fields only in UI; DB allows full row update).
create policy "breeds_update_admin_email"
  on public.breeds for update
  to authenticated
  using (lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'doddsy2005@gmail.com')
  with check (lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'doddsy2005@gmail.com');
