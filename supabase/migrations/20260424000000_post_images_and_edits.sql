-- Post images + edit tracking.

alter table public.posts add column if not exists image_url text;
alter table public.posts add column if not exists edited_at timestamptz;

-- Storage bucket for post images (public-read so <img> renders without signed URLs)
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

drop policy if exists "post_images_read" on storage.objects;
drop policy if exists "post_images_insert_own" on storage.objects;
drop policy if exists "post_images_delete_own" on storage.objects;

create policy "post_images_read" on storage.objects
  for select using (bucket_id = 'post-images');

create policy "post_images_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post_images_delete_own" on storage.objects
  for delete using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
