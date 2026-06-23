-- Profiländerungs-Log: NUR echte, eingeloggte Member-Edits protokollieren.
-- Der HubSpot-Onboarding-/Initialimport läuft über den Service-Role-Key (kein
-- User-JWT → auth.uid() IS NULL) und hat den Log mit Import-Werten geflutet.
-- Fix: im Trigger früh aussteigen, wenn auth.uid() NULL ist.
-- (Member-Profil-Edits laufen über updateProfileAction mit User-Session →
--  auth.uid() gesetzt; Admin-Aktionen berühren keine geloggten CRM-Felder.)

create or replace function public.log_member_profile_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f text;
  oldj jsonb := to_jsonb(old);
  newj jsonb := to_jsonb(new);
  ov text;
  nv text;
  fields text[] := array[
    'first','last','company','role','branch','sub','work','home',
    'email','mobile','web','linkedin','since','date_of_birth',
    'additional_roles','sports'
  ];
begin
  -- Nur echte Member-Edits loggen. Service-Role-Updates (Import/Onboarding)
  -- haben kein User-JWT → auth.uid() ist NULL → nicht protokollieren.
  if auth.uid() is null then
    return new;
  end if;

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

-- Bestehendes Import-Rauschen entfernen (alle Einträge sind unreviewed und
-- stammen aus den Onboarding-Importen 12./16./23.06.) → sauberer Start.
delete from public.profile_changes;
