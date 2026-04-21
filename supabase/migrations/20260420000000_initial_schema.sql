-- SportNexus initial schema
-- Relies on Supabase Auth (auth.users) for identity; members.id FKs to auth.users(id).

create extension if not exists "pgcrypto";

-- ========== members ==========
create table public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  slug text unique not null,
  first text not null,
  last text not null,
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

-- ========== auto-update updated_at ==========
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger members_set_updated_at before update on public.members
  for each row execute function public.set_updated_at();

-- ========== RLS ==========
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Members: any authenticated user can read all members; only owner can update self.
create policy members_read on public.members
  for select using (auth.role() = 'authenticated');
create policy members_update_self on public.members
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy members_insert_self on public.members
  for insert with check (id = auth.uid());

-- Events: any authenticated user can read.
create policy events_read on public.events
  for select using (auth.role() = 'authenticated');

-- Event registrations: any authenticated user can read; members manage own registrations.
create policy event_regs_read on public.event_registrations
  for select using (auth.role() = 'authenticated');
create policy event_regs_insert_self on public.event_registrations
  for insert with check (member_id = auth.uid());
create policy event_regs_delete_self on public.event_registrations
  for delete using (member_id = auth.uid());

-- Messages: sender or recipient can read; only sender can insert.
create policy messages_read_own on public.messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy messages_insert_sender on public.messages
  for insert with check (sender_id = auth.uid());
create policy messages_update_recipient on public.messages
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Notifications: only owner can read/update own.
create policy notifications_read_self on public.notifications
  for select using (member_id = auth.uid());
create policy notifications_update_self on public.notifications
  for update using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ========== auto-create member row when user signs up ==========
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.members (id, slug, first, last, email)
  values (
    new.id,
    coalesce(nullif(split_part(new.email, '@', 1), ''), substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'first', ''),
    coalesce(new.raw_user_meta_data->>'last', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
