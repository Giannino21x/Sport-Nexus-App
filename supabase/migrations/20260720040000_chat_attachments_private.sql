-- Chat-Anhänge privat (2026-07-20): 1:1-Nachrichtenbilder lagen in einem
-- public-read Bucket — jeder mit der URL konnte sie ohne Login abrufen. Der
-- Bucket wird privat; die App rendert signierte URLs (nur für eingeloggte
-- Members erzeugbar). Bestehende gespeicherte Public-URLs bleiben als
-- Pfad-Identifier gültig (die App extrahiert den Pfad daraus).
update storage.buckets set public = false where id = 'chat-attachments';

drop policy if exists "chat_attachments_read" on storage.objects;
create policy "chat_attachments_read" on storage.objects
  for select using (
    bucket_id = 'chat-attachments'
    and auth.role() = 'authenticated'
  );
