-- Tote Glocken-Eintraege nachtraeglich verlinken (2026-08-20, User-Report:
-- "bei den notifications muss man auch auf den chat kommen").
-- Der `link` kam erst mit 20260722000000_notification_links dazu; alles was
-- davor entstanden ist, hat kein Ziel — der Klick lief ins Leere. Das Ziel
-- laesst sich rekonstruieren: der Absender steht im Titel, sein Slug in
-- members. Was sich nicht eindeutig aufloesen laesst, bekommt wenigstens die
-- Uebersichtsseite statt gar nichts.

update public.notifications n
set link = '/messages?to=' || m.slug
from public.members m
where n.link is null
  and n.kind = 'message'
  and n.title = 'Neue Nachricht von ' || trim(coalesce(m.first, '') || ' ' || coalesce(m.last, ''))
  and nullif(m.slug, '') is not null;

update public.notifications
set link = '/messages'
where link is null and kind = 'message';

update public.notifications
set link = '/events'
where link is null and kind = 'calendar';

update public.notifications
set link = '/feed'
where link is null and kind = 'feed';
