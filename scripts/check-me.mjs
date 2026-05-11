// Wer ist gerade in der DB als Anna eingetragen? Existiert ein Auth-User
// fuer info@space-media.ch? Ist Giannino Admin?
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
console.log("=== AUTH USERS ===");
for (const u of users.users) {
  console.log(`  ${u.email}  id=${u.id.slice(0,8)}…  last=${u.last_sign_in_at ?? "never"}`);
}

console.log("\n=== MEMBERS mit auth_id ===");
const { data: members } = await admin.from("members").select("id, slug, first, last, email, auth_id, is_admin").not("auth_id", "is", null);
for (const m of members ?? []) {
  console.log(`  ${m.first} ${m.last}  slug=${m.slug}  email=${m.email}  admin=${m.is_admin}  auth_id=${m.auth_id.slice(0,8)}…`);
}

console.log("\n=== MEMBERS ohne auth_id (max 10) ===");
const { data: orphan } = await admin.from("members").select("slug, first, last, email").is("auth_id", null).limit(10);
for (const m of orphan ?? []) {
  console.log(`  ${m.first} ${m.last}  slug=${m.slug}  email=${m.email || "—"}`);
}
