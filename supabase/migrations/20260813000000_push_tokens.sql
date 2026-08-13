-- Push-Notifications-Infrastruktur (2026-08-13).
--
-- 1) push_tokens: Geräte-Tokens der Members (APNs-Token auf iOS, FCM auf
--    Android). RLS an, bewusst OHNE Policies — gelesen/geschrieben wird
--    ausschliesslich über den Service-Role-Key (Server-Actions + Dispatch-
--    Route), nachdem die Session serverseitig geprüft wurde.
-- 2) pg_net-Trigger: Notifications entstehen hier im Haus per DB-Trigger
--    (Nachricht → notify_recipient_on_message, Event → notify_members_on_
--    event). Der Push-Versand hängt sich deshalb ebenfalls an die DB: jede
--    neue notifications-Zeile ruft die Dispatch-Route der Web-App auf, die
--    Tokens + Badge lädt und FCM/APNs schickt. Die Route verifiziert das
--    Secret und lädt die Zeile per Service-Role nach — die HTTP-Payload ist
--    nie die Quelle der Wahrheit.

create table if not exists public.push_tokens (
  token text primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_member_idx on public.push_tokens (member_id);
alter table public.push_tokens enable row level security;

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://sport-nexus-app.vercel.app/api/push/dispatch',
    body := jsonb_build_object('id', NEW.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', 'c23329d609564c6e08d1eea047f41c98a0c4b8850d72fc8f09945eadd489539d'
    )
  );
  return NEW;
exception when others then
  -- Push ist Best-Effort: ein Versandfehler darf nie das Insert der
  -- Notification (und damit die Nachricht / das Event) zurückrollen.
  return NEW;
end;
$$;

drop trigger if exists notifications_dispatch_push on public.notifications;
create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row execute function public.dispatch_push_on_notification();
