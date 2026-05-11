// Einmal-Skript: prüft, ob es für Pascals E-Mail-Adressen einen Auth-Account
// gibt, und ob das verknüpft ist mit dem Member-Profil. Liefert klare Aussage,
// warum Passwort-Reset nicht ankam.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Mini-dotenv-Loader: dotenv ist kein Dependency in dieser Repo. Wir lesen
// .env.local direkt und parsen KEY=VALUE-Zeilen (Quotes optional).
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const emails = ["pascal.b.messerli@gmail.com", "pascal@sportnexus.ch"];

console.log("\n=== AUTH USERS ===");
const { data: pages, error: lErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (lErr) { console.error("listUsers error:", lErr.message); process.exit(1); }

for (const e of emails) {
  const hit = pages.users.find((u) => (u.email ?? "").toLowerCase() === e.toLowerCase());
  if (hit) {
    console.log(`✓ ${e}  →  auth.users id=${hit.id}  confirmed=${hit.email_confirmed_at ? "yes" : "no"}  last_sign_in=${hit.last_sign_in_at ?? "never"}`);
  } else {
    console.log(`✗ ${e}  →  KEIN auth-Account vorhanden`);
  }
}

console.log("\n=== MEMBERS TABLE (email lookup) ===");
for (const e of emails) {
  const { data, error } = await admin
    .from("members")
    .select("id, slug, first, last, email, auth_id, is_admin")
    .ilike("email", e)
    .maybeSingle();
  if (error) { console.log(`! ${e}: ${error.message}`); continue; }
  if (!data) { console.log(`✗ ${e}  →  kein Members-Row mit dieser E-Mail`); continue; }
  console.log(`✓ ${e}  →  members.id=${data.id}  slug=${data.slug}  auth_id=${data.auth_id ?? "—"}  admin=${data.is_admin}`);
}

console.log("\n=== MEMBERS BY SLUG/NAME (Pascal Messerli) ===");
const { data: byName } = await admin
  .from("members")
  .select("id, slug, first, last, email, auth_id")
  .or("slug.ilike.%messerli%,last.ilike.%messerli%");
if (byName) {
  for (const m of byName) {
    console.log(`  id=${m.id}  slug=${m.slug}  ${m.first} ${m.last}  email=${m.email || "—"}  auth_id=${m.auth_id ?? "—"}`);
  }
}
