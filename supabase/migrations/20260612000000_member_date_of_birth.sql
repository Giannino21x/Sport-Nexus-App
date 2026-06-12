-- Feedback 5 (Pascal, 2026-06-12): neues HubSpot-Feld `date_of_birth` auch im
-- App-Profil pflegen. Nullable — Bestandsmember haben (noch) kein Geburtsdatum.

alter table public.members add column if not exists date_of_birth date;
