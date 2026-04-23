-- Post interactions: per-user likes (toggle) + replies.
-- Replaces the old single-counter increment_post_likes approach.

-- ========== post_likes (per-user toggle) ==========
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);
create index if not exists post_likes_member_idx on public.post_likes (member_id);

alter table public.post_likes enable row level security;

drop policy if exists post_likes_read on public.post_likes;
drop policy if exists post_likes_insert_self on public.post_likes;
drop policy if exists post_likes_delete_self on public.post_likes;

create policy post_likes_read on public.post_likes
  for select using (auth.role() = 'authenticated');
create policy post_likes_insert_self on public.post_likes
  for insert with check (member_id = public.current_member_id());
create policy post_likes_delete_self on public.post_likes
  for delete using (member_id = public.current_member_id());

-- Keep posts.likes cache in sync with the like table.
create or replace function public.sync_post_likes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes = coalesce(likes, 0) + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set likes = greatest(0, coalesce(likes, 0) - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists post_likes_sync_count on public.post_likes;
create trigger post_likes_sync_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_post_likes();

-- Toggle: delete if exists, insert otherwise. Returns new state.
create or replace function public.toggle_post_like(p_post_id uuid)
returns table(liked boolean, likes_count int)
language plpgsql security definer set search_path = public as $$
declare
  v_member_id uuid;
  v_deleted int;
begin
  v_member_id := public.current_member_id();
  if v_member_id is null then raise exception 'no member profile'; end if;

  delete from public.post_likes
    where post_id = p_post_id and member_id = v_member_id;
  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    insert into public.post_likes (post_id, member_id) values (p_post_id, v_member_id);
    liked := true;
  else
    liked := false;
  end if;

  select coalesce(p.likes, 0) into likes_count from public.posts p where p.id = p_post_id;
  return next;
end $$;

revoke all on function public.toggle_post_like(uuid) from public;
grant execute on function public.toggle_post_like(uuid) to authenticated;

-- Old one-way incrementer is no longer used; drop it.
drop function if exists public.increment_post_likes(uuid);

-- ========== post_replies ==========
create table if not exists public.post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.members(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_replies_post_idx on public.post_replies (post_id, created_at asc);

alter table public.post_replies enable row level security;

drop policy if exists post_replies_read on public.post_replies;
drop policy if exists post_replies_insert_self on public.post_replies;
drop policy if exists post_replies_delete_self on public.post_replies;

create policy post_replies_read on public.post_replies
  for select using (auth.role() = 'authenticated');
create policy post_replies_insert_self on public.post_replies
  for insert with check (author_id = public.current_member_id());
create policy post_replies_delete_self on public.post_replies
  for delete using (author_id = public.current_member_id());

-- Keep posts.replies cache in sync with reply table.
create or replace function public.sync_post_replies() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set replies = coalesce(replies, 0) + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set replies = greatest(0, coalesce(replies, 0) - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists post_replies_sync_count on public.post_replies;
create trigger post_replies_sync_count
  after insert or delete on public.post_replies
  for each row execute function public.sync_post_replies();
