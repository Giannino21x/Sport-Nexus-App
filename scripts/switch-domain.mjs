// Umstellung der App-URL auf die eigene Domain (Stand 2026-09-08: app.sportnexus.ch).
//
// Voraussetzung: DNS bei Hostpoint gesetzt (A app.sportnexus.ch → 76.76.21.21) und die
// Domain ist in Vercel «Valid Configuration» (npx vercel domains inspect app.sportnexus.ch).
//
//   node scripts/switch-domain.mjs              # prüft nur (DNS, HTTPS, aktueller Stand)
//   node scripts/switch-domain.mjs --apply      # stellt alles um
//
// --apply macht, in dieser Reihenfolge:
//   1. Supabase Auth: site_url → neue Domain (uri_allow_list enthält beide Domains, bleibt).
//   2. Vercel Production-Env APP_URL → neue Domain (+ Redeploy nötig, wird angestossen).
//   3. GitHub-Secret APP_URL → neue Domain (Kickoff-Mail-Workflow, Login-Links).
//   4. .env.local APP_URL → neue Domain (lokale Skripte, Test-Mails).
//
// NICHT umgestellt (bewusst): Die alte Domain sport-nexus-app.vercel.app bleibt aktiv und
// wird NICHT umgeleitet. Die Store-Apps (Capacitor, Repo sport-nexus-desktop) laden die alte
// URL; eine Umleitung würde dort als externer Link in Safari/Chrome öffnen. Erst nach einem
// Store-Update mit der neuen URL darf die alte Domain umgeleitet werden.

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const NEW = "https://app.sportnexus.ch";
const OLD = "https://sport-nexus-app.vercel.app";
const APPLY = process.argv.includes("--apply");

const envText = readFileSync(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]));
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host.split(".")[0];
const H = { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" };

// 1. Erreichbarkeit der neuen Domain (DNS + TLS + App antwortet)
let reachable = false;
try {
  const r = await fetch(`${NEW}/login`, { redirect: "manual" });
  reachable = r.status > 0 && r.status < 500;
  console.log(`${NEW}/login → HTTP ${r.status}`);
} catch (e) {
  console.log(`${NEW} nicht erreichbar: ${e.cause?.code ?? e.message}`);
}
const auth = await (await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, { headers: H })).json();
console.log(`Supabase site_url: ${auth.site_url}`);
console.log(`Supabase uri_allow_list: ${auth.uri_allow_list}`);
console.log(`.env.local APP_URL: ${env.APP_URL}`);

if (!APPLY) { console.log(`\nNur Prüfung. Umstellen mit --apply${reachable ? "" : " (erst wenn die Domain erreichbar ist!)"}.`); process.exit(0); }
if (!reachable) { console.error("\nAbbruch: neue Domain nicht erreichbar. DNS/Vercel zuerst fertigstellen."); process.exit(1); }

// 1. Supabase site_url (nur dieses Feld; SMTP-Block bleibt unberührt, geprüft 2026-09-08)
let r = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, { method: "PATCH", headers: H, body: JSON.stringify({ site_url: NEW }) });
console.log(`Supabase site_url → ${NEW}: HTTP ${r.status}`);

// 2. Vercel Production-Env
execSync(`npx vercel env rm APP_URL production --yes`, { stdio: "inherit" });
execSync(`npx vercel env add APP_URL production`, { input: NEW, stdio: ["pipe", "inherit", "inherit"] });
console.log("Vercel APP_URL gesetzt; Redeploy…");
execSync(`npx vercel redeploy sport-nexus-app.vercel.app --yes`, { stdio: "inherit" });

// 3. GitHub-Secret
execSync(`gh secret set APP_URL --body "${NEW}"`, { stdio: "inherit" });

// 4. .env.local
writeFileSync(".env.local", envText.replace(/^APP_URL=.*$/m, `APP_URL=${NEW}`));
console.log(`\nFertig. Alte Domain ${OLD} bleibt parallel aktiv (siehe Kommentar oben).`);
