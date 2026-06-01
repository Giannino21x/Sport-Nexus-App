-- Admins markieren einen Tischwunsch als "berücksichtigt" (z.B. nachdem er bei
-- der Tischzuweisung für ein Event eingeplant wurde). considered_at hält den
-- Zeitpunkt fest; NULL = noch offen.

alter table public.table_wishes
  add column if not exists considered_at timestamptz;

-- Bisher gab es keine Update-Policy auf table_wishes. Admins dürfen den
-- Berücksichtigt-Status setzen/zurücksetzen.
drop policy if exists "table_wishes update admin" on public.table_wishes;
create policy "table_wishes update admin"
  on public.table_wishes for update
  using (public.is_admin())
  with check (public.is_admin());
