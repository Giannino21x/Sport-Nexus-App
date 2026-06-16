// Hebt NUR rate_limit_email_sent an (Default war 2/h, zu wenig fürs Onboarding).
// Bewusst KEIN smtp_*-Feld im PATCH — sonst würden die übrigen SMTP-Felder
// genullt (siehe Memory smtp_pending). PATCH eines Nicht-SMTP-Felds lässt den
// SMTP-Block unangetastet. Danach GET zur Verifikation.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);
const PAT = env.SUPABASE_ACCESS_TOKEN;
const REF = "zufeezcdzikwiutksyou";
const NEW = Number(process.argv[2] ?? 30);

const headers = { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" };

const p = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH", headers, body: JSON.stringify({ rate_limit_email_sent: NEW }),
});
console.log("PATCH:", p.status, p.ok ? "ok" : await p.text());

const g = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, { headers })).json();
console.log("Verifikation:");
console.log("  rate_limit_email_sent:", g.rate_limit_email_sent);
console.log("  smtp_host:", g.smtp_host, "| smtp_user:", g.smtp_user, "| smtp_admin_email:", g.smtp_admin_email);
console.log("  → SMTP intakt:", Boolean(g.smtp_host && g.smtp_user && g.smtp_admin_email));
