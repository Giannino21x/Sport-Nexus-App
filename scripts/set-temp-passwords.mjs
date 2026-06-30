// Setzt für die blockierten Founder ein temporäres Passwort + email_confirm.
// Sie ändern es danach selbst in den Settings. Gibt eine Weitergabe-Liste aus.
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TARGETS = [
  "fabian.roth@hug-baustoffe.ch",
  "felix.wolfensberger@mesoneer.io",
  "mischa@hrstudio.ch",
  "ivan.dunjic@epartners.ch",
  "boris@sportnexus.ch",
  "fabio@sportnexus.ch",
];

// Lesbares, eindeutiges Temp-Passwort: SportNexus-<6 Zeichen>-26
function tempPw() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne I/O/0/1
  const b = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[b[i] % alphabet.length];
  return `SportNexus-${s}-26`;
}

// Alle Auth-User einsammeln
const all = [];
for (let p = 1; p <= 20; p++) {
  const { data, error } = await admin.auth.admin.listUsers({ page: p, perPage: 200 });
  if (error) { console.error("listUsers:", error.message); process.exit(1); }
  all.push(...data.users);
  if (data.users.length < 200) break;
}
const byEmail = new Map(all.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]));

// Namen aus members
const { data: members } = await admin.from("members").select("first, last, email, auth_id");
const memberByAuth = new Map((members ?? []).map((m) => [m.auth_id, m]));

const out = [];
for (const email of TARGETS) {
  const u = byEmail.get(email.toLowerCase());
  if (!u) { console.log(`✗ ${email}: KEIN Auth-Account`); continue; }
  const pw = tempPw();
  const { error } = await admin.auth.admin.updateUserById(u.id, {
    password: pw,
    email_confirm: true,
  });
  if (error) { console.log(`✗ ${email}: ${error.message}`); continue; }
  const m = memberByAuth.get(u.id);
  const name = m ? `${m.first} ${m.last}`.trim() : "—";
  out.push({ name, email, pw });
  console.log(`✓ ${name.padEnd(20)} ${email}`);
}

console.log("\n=== WEITERGABE-LISTE ===\n");
for (const r of out) {
  console.log(`${r.name}`);
  console.log(`  E-Mail:   ${r.email}`);
  console.log(`  Passwort: ${r.pw}`);
  console.log("");
}
console.log(`Fertig: ${out.length}/${TARGETS.length} gesetzt. Passwort bitte in den Settings ändern.`);
