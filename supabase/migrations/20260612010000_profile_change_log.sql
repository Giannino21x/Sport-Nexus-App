-- Profilmutations-Log (Feedback 5, Pascal 2026-06-12): Wenn Member ihre
-- CRM-relevanten Profilfelder ändern, soll das Admin-Team die Änderungen in
-- einer Liste prüfen können (analog Tischwunsch) und relevante Mutationen
-- manuell in HubSpot nachziehen.
--
-- Modellierung: eine Zeile PRO GEÄNDERTEM FELD (nicht pro Speichern) — so kann
-- der Admin einzelne Felder als "übernommen" abhaken und sieht alt → neu
-- direkt. Nicht-CRM-Felder (Bio, Suche/Biete, Banner-Farbe, Sichtbarkeits-
-- Toggles, Avatar) werden bewusst NICHT geloggt, damit die Liste nicht
-- zurauscht.

create table if not exists public.profile_changes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now(),
  -- Vom Admin als "im CRM übernommen / geprüft" markiert (analog
  -- table_wishes.considered_at).
  reviewed_at timestamptz
);

create index if not exists profile_changes_member_idx on public.profile_changes (member_id);
create index if not exists profile_changes_changed_idx on public.profile_changes (changed_at desc);

alter table public.profile_changes enable row level security;

-- Nur Admins lesen das Log. Member sehen ihre eigenen Änderungen nicht —
-- die Liste ist ein reines Admin-Werkzeug.
create policy "profile_changes select admin"
  on public.profile_changes for select
  using (public.is_admin());

-- Admins dürfen reviewed_at setzen/zurücksetzen.
create policy "profile_changes update admin"
  on public.profile_changes for update
  using (public.is_admin()) with check (public.is_admin());

-- KEINE Insert-Policy: Zeilen entstehen ausschliesslich über den
-- SECURITY-DEFINER-Trigger unten.

-- Loggt jede Änderung der CRM-relevanten Member-Felder. Läuft als AFTER-
-- Trigger, beeinflusst das Update selbst also nicht.
create or replace function public.log_member_profile_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f text;
  oldj jsonb := to_jsonb(old);
  newj jsonb := to_jsonb(new);
  ov text;
  nv text;
  -- Feldliste = HubSpot-gepflegte Properties (siehe docs/HUBSPOT-SYNC.md).
  fields text[] := array[
    'first','last','company','role','branch','sub','work','home',
    'email','mobile','web','linkedin','since','date_of_birth',
    'additional_roles','sports'
  ];
begin
  foreach f in array fields loop
    if oldj->f is distinct from newj->f then
      if f = 'sports' then
        ov := nullif(array_to_string(old.sports, ', '), '');
        nv := nullif(array_to_string(new.sports, ', '), '');
      else
        ov := nullif(oldj->>f, '');
        nv := nullif(newj->>f, '');
      end if;
      insert into public.profile_changes (member_id, field, old_value, new_value)
      values (new.id, f, ov, nv);
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists members_log_profile_changes on public.members;
create trigger members_log_profile_changes
  after update on public.members
  for each row
  when (old.* is distinct from new.*)
  execute function public.log_member_profile_changes();
