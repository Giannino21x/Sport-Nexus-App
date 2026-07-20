-- Bildergallerie für vergangene Events (Pascal-Feedback 2026-07-20):
-- Link zur externen Foto-Gallerie + optionales Passwort. Beides wird manuell
-- von Admins gepflegt (Inline-Edit auf der Event-Detailseite).
alter table public.events
  add column if not exists gallery_url text not null default '',
  add column if not exists gallery_password text not null default '';
