-- Teilnehmer-Snapshot pro Event (2026-07-20): Die Namensliste ("Wer kommt" /
-- "Wer teilnahm") kam bisher live über die cookie-basierte Guestoo-Visitors-API.
-- Diese Session-Cookies sterben in Prod laufend (Ablauf + Invalidierung durch
-- die 6h-Cron-Logins) — die Namen fehlten deshalb still. Neu schreibt der
-- 6h-Sync (der bei jedem Lauf frische Cookies hat) die Liste hierher, und die
-- App liest sie aus der DB.
alter table public.events
  add column if not exists attendees jsonb not null default '[]'::jsonb,
  add column if not exists attendees_synced_at timestamptz;
