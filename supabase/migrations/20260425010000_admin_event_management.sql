-- Admins can create / update / delete events.

drop policy if exists events_insert_admin on public.events;
drop policy if exists events_update_admin on public.events;
drop policy if exists events_delete_admin on public.events;

create policy events_insert_admin on public.events
  for insert with check (public.is_admin());
create policy events_update_admin on public.events
  for update using (public.is_admin()) with check (public.is_admin());
create policy events_delete_admin on public.events
  for delete using (public.is_admin());
