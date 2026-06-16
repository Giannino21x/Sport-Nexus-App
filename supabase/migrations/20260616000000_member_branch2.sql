-- Zweitbranche (Feedback 6, Pascal 2026-06-16): "Zweitbranche bitte auch noch
-- anzeigen." Mappt auf das HubSpot-Dropdown `zweitbranche_dropdown` (gleiche
-- Werteliste wie `branche_dropdown`). Wird im Profil pflegbar und auf der
-- Member-Detailseite angezeigt. Wenige Werte pflegt SportNexus manuell.

alter table public.members add column if not exists branch2 text not null default '';

-- Profilmutations-Log: Zweitbranche ebenfalls als CRM-relevantes Feld tracken
-- (Feldliste analog 20260612010000_profile_change_log.sql, hier um 'branch2'
-- ergänzt — sonst unverändert).
create or replace function public.log_member_profile_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f text;
  oldj jsonb := to_jsonb(old);
  newj jsonb := to_jsonb(new);
  ov text;
  nv text;
  fields text[] := array[
    'first','last','company','role','branch','sub','branch2','work','home',
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
