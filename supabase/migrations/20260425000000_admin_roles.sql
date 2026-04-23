-- Admin roles: only admins can set members.extra (honorary titles / badges).

alter table public.members add column if not exists is_admin boolean not null default false;

-- Helper: is the current auth user linked to an admin member?
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select is_admin from public.members where auth_id = auth.uid() limit 1),
    false
  )
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Seed the admin accounts BEFORE the trigger is created so the guard does
-- not block the initial bootstrap when run as service_role / from SQL editor.
update public.members
  set is_admin = true, extra = 'Admin'
  where lower(email) in ('giannino.peloso@space-media.ch', 'matthew.mylius@space-media.ch');

-- Admins can update any member row.
drop policy if exists members_update_admin on public.members;
create policy members_update_admin on public.members
  for update using (public.is_admin()) with check (public.is_admin());

-- Defense in depth: block non-admins from touching `extra` or `is_admin`
-- even on their own row. Service role (auth.uid() is null) is allowed
-- through so seed migrations and admin scripts can still modify these fields.
create or replace function public.guard_member_privileged_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.extra is distinct from old.extra) or (new.is_admin is distinct from old.is_admin) then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Only admins can change extra / is_admin';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists members_guard_privileged on public.members;
create trigger members_guard_privileged
  before update on public.members
  for each row execute function public.guard_member_privileged_fields();
