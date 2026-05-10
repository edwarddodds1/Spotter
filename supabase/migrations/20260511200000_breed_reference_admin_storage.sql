-- Let the same admin email that can update `public.breeds` replace header images in `breed-reference`.
create policy "breed_reference_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'breed-reference'
    and lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'doddsy2005@gmail.com'
  );

create policy "breed_reference_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'breed-reference'
    and lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'doddsy2005@gmail.com'
  )
  with check (
    bucket_id = 'breed-reference'
    and lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'doddsy2005@gmail.com'
  );

create policy "breed_reference_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'breed-reference'
    and lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'doddsy2005@gmail.com'
  );
