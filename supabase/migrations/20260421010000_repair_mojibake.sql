-- Repair mojibake: text fields whose UTF-8 bytes were read as Latin-1 and
-- re-encoded as UTF-8 (e.g. "Zürich" became "ZÃ¼rich"). Idempotent — only
-- touches rows that still contain the mojibake markers Ã or Â.

create or replace function public.repair_mojibake_text(v text) returns text
language plpgsql immutable as $$
begin
  if v is null then return null; end if;
  if v !~ '[ÃÂ]' then return v; end if;
  begin
    return convert_from(convert_to(v, 'latin1'), 'utf8');
  exception when others then
    return v;
  end;
end $$;

update public.members set
  first   = public.repair_mojibake_text(first),
  last    = public.repair_mojibake_text(last),
  company = public.repair_mojibake_text(company),
  role    = public.repair_mojibake_text(role),
  extra   = public.repair_mojibake_text(extra),
  branch  = public.repair_mojibake_text(branch),
  sub     = public.repair_mojibake_text(sub),
  work    = public.repair_mojibake_text(work),
  home    = public.repair_mojibake_text(home),
  offer   = public.repair_mojibake_text(offer),
  search  = public.repair_mojibake_text(search),
  bio     = public.repair_mojibake_text(bio)
where
  coalesce(first, '')   ~ '[ÃÂ]' or
  coalesce(last, '')    ~ '[ÃÂ]' or
  coalesce(company, '') ~ '[ÃÂ]' or
  coalesce(role, '')    ~ '[ÃÂ]' or
  coalesce(extra, '')   ~ '[ÃÂ]' or
  coalesce(branch, '')  ~ '[ÃÂ]' or
  coalesce(sub, '')     ~ '[ÃÂ]' or
  coalesce(work, '')    ~ '[ÃÂ]' or
  coalesce(home, '')    ~ '[ÃÂ]' or
  coalesce(offer, '')   ~ '[ÃÂ]' or
  coalesce(search, '')  ~ '[ÃÂ]' or
  coalesce(bio, '')     ~ '[ÃÂ]';

update public.events set
  title             = public.repair_mojibake_text(title),
  subtitle          = public.repair_mojibake_text(subtitle),
  city              = public.repair_mojibake_text(city),
  venue             = public.repair_mojibake_text(venue),
  address           = public.repair_mojibake_text(address),
  description       = public.repair_mojibake_text(description),
  long_description  = public.repair_mojibake_text(long_description)
where
  coalesce(title, '')            ~ '[ÃÂ]' or
  coalesce(subtitle, '')         ~ '[ÃÂ]' or
  coalesce(city, '')             ~ '[ÃÂ]' or
  coalesce(venue, '')            ~ '[ÃÂ]' or
  coalesce(address, '')          ~ '[ÃÂ]' or
  coalesce(description, '')      ~ '[ÃÂ]' or
  coalesce(long_description, '') ~ '[ÃÂ]';

drop function public.repair_mojibake_text(text);
