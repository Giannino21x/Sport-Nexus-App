-- Glocke mit echtem Inhalt füllen (2026-07-20): Bisher schrieb nichts in
-- public.notifications — der Unread-Punkt war faktisch tot. Wie beim Feed-
-- Trigger (20260601000000) laufen die Inserts als SECURITY DEFINER, weil
-- notifications bewusst keine Insert-Policy für Members hat.

-- Neue Direktnachricht → Notification beim Empfänger.
create or replace function public.notify_recipient_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  select trim(coalesce(first, '') || ' ' || coalesce(last, ''))
    into sender_name
    from public.members
    where id = NEW.sender_id;

  insert into public.notifications (member_id, kind, title, preview)
  values (
    NEW.recipient_id,
    'message',
    'Neue Nachricht von ' || coalesce(nullif(sender_name, ''), 'einem Member'),
    left(coalesce(NEW.body, ''), 120)
  );
  return NEW;
end;
$$;

drop trigger if exists messages_notify_recipient on public.messages;
create trigger messages_notify_recipient
  after insert on public.messages
  for each row execute function public.notify_recipient_on_message();

-- Neues KOMMENDES Event → Notification an alle Members. Der Datums-Check
-- verhindert Spam, falls je wieder vergangene Events nachimportiert werden.
create or replace function public.notify_members_on_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.date >= (now() at time zone 'Europe/Zurich')::date then
    insert into public.notifications (member_id, kind, title, preview)
    select
      m.id,
      'calendar',
      'Neues Event: ' || coalesce(nullif(NEW.title, ''), 'SportNexus-Event'),
      coalesce(nullif(NEW.subtitle, ''), left(coalesce(NEW.description, ''), 120))
    from public.members m;
  end if;
  return NEW;
end;
$$;

drop trigger if exists events_notify_members on public.events;
create trigger events_notify_members
  after insert on public.events
  for each row execute function public.notify_members_on_event();
