// Liest die Supabase-Auth-Config (Management API) und zeigt die für den
// Mailversand relevanten Felder. GET only — keine Mutation.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);
const PAT = env.SUPABASE_ACCESS_TOKEN;
const REF = "zufeezcdzikwiutksyou";

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  headers: { Authorization: `Bearer ${PAT}` },
});
if (!res.ok) { console.error(`HTTP ${res.status}: ${await res.text()}`); process.exit(1); }
const c = await res.json();
const show = (k) => console.log(`  ${k}:`, c[k]);
console.log("Mailer / SMTP:");
["external_email_enabled", "mailer_autoconfirm", "smtp_host", "smtp_port", "smtp_user", "smtp_admin_email", "smtp_sender_name", "smtp_max_frequency"].forEach(show);
console.log("Rate-Limits:");
Object.keys(c).filter((k) => /rate_limit/i.test(k)).forEach(show);
