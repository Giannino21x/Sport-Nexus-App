-- Klickbare Notifications (2026-07-22, Pascal-Feedback): Bisher waren die
-- Glocken-Einträge tote Zeilen ohne Ziel. Wir speichern jetzt pro Notification
-- einen relativen Link und befüllen ihn in den drei bestehenden Triggern
-- (Message → Chat mit dem Absender, Event → Detailseite, Post → Feed).
-- Zusätzlich bekommt die Preview eine echte Ellipsis, sobald der Text > 120
-- Zeichen ist (vorher hartes left() ohne "…").

alter table public.notifications add column if not exists link text;

-- Neue Direktnachricht → Empfänger. Link führt in den Chat mit dem Absender.
create or replace function public.notify_recipient_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  sender_slug text;
begin
  select trim(coalesce(first, '') || ' ' || coalesce(last, '')), slug
    into sender_name, sender_slug
    from public.members
    where id = NEW.sender_id;

  insert into public.notifications (member_id, kind, title, preview, link)
  values (
    NEW.recipient_id,
    'message',
    'Neue Nachricht von ' || coalesce(nullif(sender_name, ''), 'einem Member'),
    case when char_length(coalesce(NEW.body, '')) > 120
         then left(NEW.body, 120) || '…'
         else coalesce(NEW.body, '') end,
    case when nullif(sender_slug, '') is not null
         then '/messages?to=' || sender_slug
         else '/messages' end
  );
  return NEW;
end;
$$;

-- Neues KOMMENDES Event → alle Members. Link führt auf die Event-Detailseite.
create or replace function public.notify_members_on_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.date >= (now() at time zone 'Europe/Zurich')::date then
    insert into public.notifications (member_id, kind, title, preview, link)
    select
      m.id,
      'calendar',
      'Neues Event: ' || coalesce(nullif(NEW.title, ''), 'SportNexus-Event'),
      case
        when nullif(NEW.subtitle, '') is not null then NEW.subtitle
        when char_length(coalesce(NEW.description, '')) > 120 then left(NEW.description, 120) || '…'
        else coalesce(NEW.description, '')
      end,
      '/events/' || NEW.id::text
    from public.members m;
  end if;
  return NEW;
end;
$$;

-- Neuer Community-Post → alle übrigen Members. Link führt in den Feed.
create or replace function public.notify_members_on_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select trim(coalesce(first, '') || ' ' || coalesce(last, ''))
    into author_name
    from public.members
    where id = NEW.author_id;

  insert into public.notifications (member_id, kind, title, preview, link)
  select
    m.id,
    'feed',
    coalesce(nullif(author_name, ''), 'SportNexus') || ' hat einen Beitrag gepostet',
    case when char_length(coalesce(NEW.body, '')) > 120
         then left(NEW.body, 120) || '…'
         else coalesce(NEW.body, '') end,
    '/feed'
  from public.members m
  where m.id <> NEW.author_id;

  return NEW;
end;
$$;
