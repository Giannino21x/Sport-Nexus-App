-- Members can record additional functions / companies they hold ("Zusatzfunktionen
-- / -unternehmen"). This is separate from the admin-only `extra` badge (which
-- carries honorary titles like "Admin" and is gated by a trigger). The
-- additional_roles field is editable by the member themselves.

alter table public.members
  add column if not exists additional_roles text not null default '';
