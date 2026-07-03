insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'liji-capture-attachments',
  'liji-capture-attachments',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "capture attachments own object read" on storage.objects
  for select using (
    bucket_id = 'liji-capture-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "capture attachments own object insert" on storage.objects
  for insert with check (
    bucket_id = 'liji-capture-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "capture attachments own object update" on storage.objects
  for update using (
    bucket_id = 'liji-capture-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'liji-capture-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "capture attachments own object delete" on storage.objects
  for delete using (
    bucket_id = 'liji-capture-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
