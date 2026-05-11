-- Tischwünsche: Members können Kontakte markieren, die sie an einem
-- anstehenden Event kennenlernen möchten. Admins nutzen die Liste, um die
-- (vorerst manuelle) Tischzuweisung zu unterstützen.
--
-- Modellierung: simples requester/target-Paar. Es gibt KEINE Zuordnung zu
-- einem konkreten Event — der Tischwunsch gilt für das nächste anstehende
-- Event, an dem beide teilnehmen. Wenn wir später per-Event-Zuordnung
-- brauchen, hängen wir eine event_id-Spalte dran.

create table if not exists public.table_wishes (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.members(id) on delete cascade,
  target_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Ein Member kann pro Target nur EINEN offenen Wunsch haben — re-toggle ist
  -- Delete + Insert, nicht Duplikat. Self-Wishes (requester = target) sind
  -- nicht erlaubt.
  constraint table_wishes_self_check check (requester_id <> target_id),
  constraint table_wishes_unique unique (requester_id, target_id)
);

create index if not exists table_wishes_requester_idx on public.table_wishes (requester_id);
create index if not exists table_wishes_target_idx on public.table_wishes (target_id);

alter table public.table_wishes enable row level security;

-- Member sehen nur ihre eigenen Wünsche (was sie sich gewünscht haben).
-- Admins sehen alles.
create policy "table_wishes select own or admin"
  on public.table_wishes for select
  using (
    requester_id = (select id from public.members where auth_id = auth.uid() limit 1)
    or public.is_admin()
  );

-- Member dürfen nur eigene Wünsche einfügen.
create policy "table_wishes insert own"
  on public.table_wishes for insert
  with check (
    requester_id = (select id from public.members where auth_id = auth.uid() limit 1)
  );

-- Member dürfen nur eigene Wünsche löschen. Admins dürfen alles löschen
-- (z.B. nach Event-Abschluss).
create policy "table_wishes delete own or admin"
  on public.table_wishes for delete
  using (
    requester_id = (select id from public.members where auth_id = auth.uid() limit 1)
    or public.is_admin()
  );
