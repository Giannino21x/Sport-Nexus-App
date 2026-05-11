// Prüft via Supabase Management API, ob Custom SMTP für Auth-Mails aktiv ist
// und welche Sender-Adresse hinterlegt ist. Das Passwort ist by design NICHT
// auslesbar — wir sehen nur, OB SMTP konfiguriert ist und wer der Sender ist.
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);
const PAT = env.SUPABASE_ACCESS_TOKEN;
const REF = "zufeezcdzikwiutksyou";

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  headers: { Authorization: `Bearer ${PAT}` },
});
const cfg = await res.json();
const smtp = {
  admin_email: cfg.smtp_admin_email,
  host: cfg.smtp_host,
  port: cfg.smtp_port,
  user: cfg.smtp_user,
  // pass: cfg.smtp_pass,  // NICHT ausgeben — wir nutzen es eh nicht (wäre maskiert)
  sender_name: cfg.smtp_sender_name,
  max_frequency_seconds: cfg.smtp_max_frequency,
  email_change_confirm: cfg.mailer_secure_email_change_enabled,
  external_email_enabled: cfg.external_email_enabled,
};
console.log(JSON.stringify(smtp, null, 2));
