-- Schema v2: decouple members from auth.users, add posts, richer RLS.

-- Drop old in correct order (reverse deps)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop trigger if exists members_set_updated_at on public.members;
drop function if exists public.set_updated_at();

drop table if exists public.notifications cascade;
drop table if exists public.messages cascade;
drop table if exists public.event_registrations cascade;
drop table if exists public.events cascade;
drop table if exists public.members cascade;
drop table if exists public.posts cascade;

-- ========== members (standalone, optionally linked to auth.users) ==========
create table public.members (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  auth_id uuid unique references auth.users(id) on delete set null,
  first text not null default '',
  last text not null default '',
  company text default '',
  role text default '',
  extra text default '',
  branch text default '',
  sub text default '',
  work text default '',
  home text default '',
  offer text default '',
  search text default '',
  sports text[] default '{}',
  since date,
  email text default '',
  mobile text default '',
  web text default '',
  bio text default '',
  color text default '#C7916A',
  show_mobile boolean default true,
  show_email boolean default true,
  matchmaking boolean default true,
  linkedin text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index members_branch_idx on public.members (branch);
create index members_work_idx on public.members (work);
create index members_role_idx on public.members (role);
create index members_auth_idx on public.members (auth_id);

-- ========== events ==========
create table public.events (
  id text primary key,
  title text not null,
  subtitle text default '',
  date date not null,
  time text default '',
  city text default '',
  venue text default '',
  address text default '',
  guests int default 0,
  status text not null check (status in ('upcoming','past')),
  featured boolean default false,
  description text default '',
  image_url text default '',
  long_description text default '',
  speakers jsonb default '[]'::jsonb,
  agenda jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index events_status_idx on public.events (status);
create index events_date_idx on public.events (date);

-- ========== event_registrations ==========
create table public.event_registrations (
  event_id text not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

-- ========== messages ==========
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.members(id) on delete cascade,
  recipient_id uuid not null references public.members(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_sender_idx on public.messages (sender_id, created_at desc);
create index messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index messages_pair_idx on public.messages (sender_id, recipient_id, created_at desc);

-- ========== notifications ==========
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  kind text not null,
  title text not null,
  preview text default '',
  unread boolean default true,
  created_at timestamptz not null default now()
);

create index notifications_member_idx on public.notifications (member_id, created_at desc);

-- ========== posts (Community Feed) ==========
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.members(id) on delete cascade,
  body text not null,
  kind text default 'share' check (kind in ('deal','search','share','event')),
  tag text default '',
  meta text default '',
  likes int default 0,
  replies int default 0,
  created_at timestamptz not null default now()
);

create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_recent_idx on public.posts (created_at desc);

-- ========== helpers ==========
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger members_set_updated_at before update on public.members
  for each row execute function public.set_updated_at();

-- Resolve the current authenticated member id (or null).
create or replace function public.current_member_id() returns uuid
language sql security definer set search_path = public stable as $$
  select id from public.members where auth_id = auth.uid() limit 1
$$;

-- Auto-link auth.users to an existing member row on signup (by email match),
-- otherwise create a fresh member row for the new user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_member_id uuid;
  v_slug text;
begin
  -- Try to link by email first
  update public.members
    set auth_id = new.id
    where auth_id is null and lower(email) = lower(new.email)
    returning id into v_member_id;

  if v_member_id is null then
    -- Create a fresh member row
    v_slug := coalesce(nullif(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]+', '-', 'g'), ''), substr(new.id::text, 1, 8));
    -- Ensure uniqueness
    while exists (select 1 from public.members where slug = v_slug) loop
      v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
    end loop;
    insert into public.members (slug, auth_id, first, last, email, since)
    values (
      v_slug,
      new.id,
      coalesce(new.raw_user_meta_data->>'first', ''),
      coalesce(new.raw_user_meta_data->>'last', ''),
      coalesce(new.email, ''),
      current_date
    );
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== RLS ==========
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.posts enable row level security;

-- Members: any authenticated user reads all; only owner (linked auth) updates self.
create policy members_read on public.members
  for select using (auth.role() = 'authenticated');
create policy members_update_self on public.members
  for update using (auth_id = auth.uid()) with check (auth_id = auth.uid());

-- Events: any authenticated read; seeds loaded via service_role.
create policy events_read on public.events
  for select using (auth.role() = 'authenticated');

-- Event registrations: authenticated read, only self writes/deletes own.
create policy event_regs_read on public.event_registrations
  for select using (auth.role() = 'authenticated');
create policy event_regs_insert_self on public.event_registrations
  for insert with check (member_id = public.current_member_id());
create policy event_regs_delete_self on public.event_registrations
  for delete using (member_id = public.current_member_id());

-- Messages: sender or recipient reads; only self inserts as sender; recipient can mark read.
create policy messages_read_own on public.messages
  for select using (
    sender_id = public.current_member_id() or recipient_id = public.current_member_id()
  );
create policy messages_insert_sender on public.messages
  for insert with check (sender_id = public.current_member_id());
create policy messages_update_recipient on public.messages
  for update using (recipient_id = public.current_member_id())
  with check (recipient_id = public.current_member_id());

-- Notifications: only owner reads/updates.
create policy notifications_read_self on public.notifications
  for select using (member_id = public.current_member_id());
create policy notifications_update_self on public.notifications
  for update using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- Posts: authenticated read all; author writes/updates own.
create policy posts_read on public.posts
  for select using (auth.role() = 'authenticated');
create policy posts_insert_self on public.posts
  for insert with check (author_id = public.current_member_id());
create policy posts_update_self on public.posts
  for update using (author_id = public.current_member_id())
  with check (author_id = public.current_member_id());
create policy posts_delete_self on public.posts
  for delete using (author_id = public.current_member_id());
