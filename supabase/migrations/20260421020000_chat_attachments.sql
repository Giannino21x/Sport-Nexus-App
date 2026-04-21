-- Chat attachments: add image URL column + dedicated storage bucket.

alter table public.messages add column if not exists attachment_url text;

-- Bucket (public-read so <img> tags render without signed URLs)
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do update set public = true;

-- Clean policies in case they exist from a prior run
drop policy if exists "chat_attachments_read" on storage.objects;
drop policy if exists "chat_attachments_insert_own" on storage.objects;
drop policy if exists "chat_attachments_delete_own" on storage.objects;

-- Anyone authenticated can read chat-attachments (bucket is public).
create policy "chat_attachments_read" on storage.objects
  for select using (bucket_id = 'chat-attachments');

-- Authenticated users can upload only into their own uid-folder.
create policy "chat_attachments_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'chat-attachments'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "chat_attachments_delete_own" on storage.objects
  for delete using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
