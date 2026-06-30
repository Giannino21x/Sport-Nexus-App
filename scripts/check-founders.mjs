// Login-Status ALLER Founder (memberstatus=Founder) auslesen.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// Alle Auth-User einsammeln (paginiert)
const all = [];
for (let page = 1; page <= 20; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error("listUsers error:", error.message); process.exit(1); }
  all.push(...data.users);
  if (data.users.length < 200) break;
}
const authById = new Map(all.map((u) => [u.id, u]));
const authByEmail = new Map(all.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]));

// Alle Member-Rows (Spalten defensiv)
const { data: members, error: mErr } = await admin
  .from("members")
  .select("first, last, email, auth_id, is_admin")
  .order("last");
if (mErr) { console.error("members error:", mErr.message); process.exit(1); }

console.log(`\n=== ${all.length} Auth-User total | ${members.length} Member-Rows total ===\n`);

// Die 9 bekannten Founder-Nachnamen
const founderLast = ["messerli", "back", "ben-am", "ben am", "dätwyler", "datwyler", "ivankovic", "dunjic", "wolfensberger", "roth", "holenstein"];

const founders = members.filter((m) =>
  founderLast.some((n) => `${m.last ?? ""}`.toLowerCase().includes(n) || `${m.first ?? ""} ${m.last ?? ""}`.toLowerCase().includes(n)),
);

console.log("=== FOUNDER LOGIN-STATUS ===\n");
let confirmed = 0, signedIn = 0;
for (const m of founders) {
  const u = (m.auth_id && authById.get(m.auth_id)) || (m.email && authByEmail.get(m.email.toLowerCase()));
  const name = `${m.first ?? ""} ${m.last ?? ""}`.trim();
  if (!u) {
    console.log(`${name.padEnd(22)} | ${String(m.email).padEnd(34)} | KEIN AUTH-ACCOUNT`);
    continue;
  }
  const conf = u.email_confirmed_at ? "JA " : "nein";
  const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString().slice(0, 16).replace("T", " ") : "NIE";
  if (u.email_confirmed_at) confirmed++;
  if (u.last_sign_in_at) signedIn++;
  console.log(`${name.padEnd(22)} | ${String(u.email).padEnd(34)} | confirmed=${conf} | last_login=${last}`);
}
console.log(`\n=== ${founders.length} Founder | confirmed=${confirmed} | jemals eingeloggt=${signedIn} ===\n`);
