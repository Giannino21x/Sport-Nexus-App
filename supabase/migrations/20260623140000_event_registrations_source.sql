-- Herkunft einer Anmeldung: 'self' = vom Member selbst in der App markiert,
-- 'guestoo' = automatisch aus dem Guestoo-Sync übernommen. So kann der Sync
-- nur seine eigenen Einträge abgleichen (inkl. Abmeldungen entfernen), ohne
-- manuelle Self-Marks der Member zu überschreiben/löschen.
alter table public.event_registrations
  add column if not exists source text not null default 'self';

create index if not exists event_registrations_source_idx
  on public.event_registrations (event_id, source);
