-- Community-Feed: jeder neue Post erscheint als Benachrichtigung bei allen
-- übrigen Members. Der Feed ist vorerst "one-way" (nur Admins posten), daher
-- ist ein Fan-out an alle Members gewünscht.
--
-- Warum ein Trigger statt eines Inserts in der Server-Action? Die Tabelle
-- public.notifications hat BEWUSST keine Insert-Policy — Members dürfen sich
-- gegenseitig keine Notifications schreiben. Der Trigger läuft als SECURITY
-- DEFINER und umgeht damit den RLS-Insert-Block sauber an genau einer Stelle.

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

  insert into public.notifications (member_id, kind, title, preview)
  select
    m.id,
    'feed',
    coalesce(nullif(author_name, ''), 'SportNexus') || ' hat einen Beitrag gepostet',
    left(NEW.body, 120)
  from public.members m
  where m.id <> NEW.author_id;

  return NEW;
end;
$$;

drop trigger if exists posts_notify_members on public.posts;
create trigger posts_notify_members
  after insert on public.posts
  for each row execute function public.notify_members_on_post();
