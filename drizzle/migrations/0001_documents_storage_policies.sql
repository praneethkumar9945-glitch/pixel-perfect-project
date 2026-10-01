
create policy "auth upload documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and owner = auth.uid());
create policy "read own or staff documents" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (owner = auth.uid() or public.is_staff(auth.uid()) or public.has_role(auth.uid(),'hod')));
create policy "delete own documents obj" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (owner = auth.uid() or public.is_staff(auth.uid())));
