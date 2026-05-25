// One-off: ensure Pascal Messerli has a working admin login.
//
// Pascal's bug report (Re_ Kurze Nachfrage – Mittwochnachmittag.eml):
//   "Login mit pascal@sportnexus.ch und pascal.b.messerli@gmail.com klappt nicht,
//    Passwort Reset funktioniert auch nicht."
//
// What this script does (idempotent — safe to re-run):
//   1. Probe both addresses in auth.users.
//   2. On the canonical address (gmail — Pascal's real From: in the mail thread):
//        * create the auth user if missing (email_confirm: true)
//        * reset the password to a freshly generated strong temp value
//   3. Ensure exactly one members row is linked (auth_id) and flagged
//      is_admin = true, extra = 'Admin'. Creates the row if missing.
//   4. Reports status for both addresses + the temp password.
//
// Run:  node scripts/grant-admin.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const CANONICAL_EMAIL = "pascal.b.messerli@gmail.com";
const ALT_EMAIL       = "pascal@sportnexus.ch";
const FIRST           = "Pascal";
const LAST            = "Messerli";
const SLUG_BASE       = "pascal-messerli";

// ---- bootstrap env ---------------------------------------------------------
const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// ---- helpers ---------------------------------------------------------------
function genPassword() {
  // 18 url-safe chars, ample entropy, no chars that confuse copy/paste.
  return randomBytes(14).toString("base64url");
}

async function findAuthUserByEmail(email) {
  // listUsers is paginated; Pascal's tenant is small, but paginate anyway.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function freeSlug(base) {
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const { data } = await sb.from("members").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i}`;
  }
  throw new Error(`Could not find a free slug starting from ${base}`);
}

// ---- 1. probe both addresses ----------------------------------------------
const probe = {};
for (const email of [CANONICAL_EMAIL, ALT_EMAIL]) {
  const u = await findAuthUserByEmail(email);
  probe[email] = u
    ? { exists: true, id: u.id, confirmed: Boolean(u.email_confirmed_at), createdAt: u.created_at }
    : { exists: false };
  console.log(`[probe] ${email}: ${u ? `EXISTS (id=${u.id}, confirmed=${Boolean(u.email_confirmed_at)})` : "NOT FOUND"}`);
}

// ---- 2. ensure canonical auth user + reset password -----------------------
const tempPassword = genPassword();
let authUser;
if (probe[CANONICAL_EMAIL].exists) {
  const { data, error } = await sb.auth.admin.updateUserById(probe[CANONICAL_EMAIL].id, {
    password: tempPassword,
    email_confirm: true,
  });
  if (error) throw new Error(`updateUserById: ${error.message}`);
  authUser = data.user;
  console.log(`[auth] reset password for existing user ${CANONICAL_EMAIL}`);
} else {
  const { data, error } = await sb.auth.admin.createUser({
    email: CANONICAL_EMAIL,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: `${FIRST} ${LAST}`, created_by: "grant-admin.mjs" },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  authUser = data.user;
  console.log(`[auth] created new user ${CANONICAL_EMAIL} (id=${authUser.id})`);
}

// ---- 3. ensure a members row, linked + admin ------------------------------
// Prefer matching by auth_id, fall back to email (case-insensitive), then create.
let { data: memberRow } = await sb.from("members").select("*").eq("auth_id", authUser.id).maybeSingle();
if (!memberRow) {
  const { data } = await sb
    .from("members")
    .select("*")
    .or(`email.ilike.${CANONICAL_EMAIL},email.ilike.${ALT_EMAIL}`)
    .maybeSingle();
  memberRow = data;
}

if (memberRow) {
  const patch = {};
  if (memberRow.auth_id !== authUser.id) patch.auth_id = authUser.id;
  if (!memberRow.is_admin) patch.is_admin = true;
  if ((memberRow.extra ?? "").trim() !== "Admin") patch.extra = "Admin";
  if (Object.keys(patch).length) {
    const { error } = await sb.from("members").update(patch).eq("id", memberRow.id);
    if (error) throw new Error(`members update: ${error.message}`);
    console.log(`[members] patched existing row (slug=${memberRow.slug}) →`, patch);
  } else {
    console.log(`[members] existing row (slug=${memberRow.slug}) already admin + linked, no patch`);
  }
} else {
  const slug = await freeSlug(SLUG_BASE);
  const { data, error } = await sb
    .from("members")
    .insert({
      slug,
      auth_id: authUser.id,
      first: FIRST,
      last: LAST,
      email: CANONICAL_EMAIL,
      is_admin: true,
      extra: "Admin",
      company: "SportNexus",
      role: "Co-Founder",
    })
    .select()
    .single();
  if (error) throw new Error(`members insert: ${error.message}`);
  console.log(`[members] created new row (slug=${data.slug}, id=${data.id})`);
}

// ---- 4. report -------------------------------------------------------------
console.log("\n=========================================================");
console.log("DONE — share the credentials below with Pascal (private):");
console.log("---------------------------------------------------------");
console.log(`Login URL : ${env.APP_URL ?? "https://sport-nexus-app.vercel.app"}/login`);
console.log(`Email     : ${CANONICAL_EMAIL}`);
console.log(`Password  : ${tempPassword}`);
console.log("---------------------------------------------------------");
console.log(`Alt address ${ALT_EMAIL}: ${probe[ALT_EMAIL].exists ? "auth user exists (NOT touched — use canonical email above)" : "no auth user (Pascal cannot log in with this address)"}`);
console.log("=========================================================");
