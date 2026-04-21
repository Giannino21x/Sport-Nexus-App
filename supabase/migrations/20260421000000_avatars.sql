-- Avatars: add avatar_url to members, create storage bucket + policies.

alter table public.members add column if not exists avatar_url text default '';

-- Bucket (public-read so <img> tags work without signed URLs)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Clean policies in case they exist from a prior run
drop policy if exists "avatars_read" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

-- Anyone can read avatars (bucket is public).
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Authenticated users can upload only into their own uid-folder.
create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow any authenticated member to increment a post's like count
-- (posts RLS restricts direct updates to the author).
create or replace function public.increment_post_likes(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'not authenticated';
  end if;
  update public.posts
    set likes = coalesce(likes, 0) + 1
    where id = p_post_id
    returning likes into v_new;
  return v_new;
end $$;

revoke all on function public.increment_post_likes(uuid) from public;
grant execute on function public.increment_post_likes(uuid) to authenticated;
