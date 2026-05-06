-- Link our local events to their Guestoo event uuid so we can fetch live
-- visitor data per event from app.guestoo.de.

alter table public.events
  add column if not exists guestoo_id text;

create index if not exists events_guestoo_id_idx on public.events (guestoo_id);
