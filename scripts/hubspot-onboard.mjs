// HubSpot → SportNexus Onboarding (Pull-Variante, Pascal Feedback 6).
//
// Holt Kontakte mit `vertrag = true` aus HubSpot, filtert auf die fürs
// Onboarding freigegebenen `memberstatus`-Werte (Default: nur Founder fürs
// Testing) und legt für jeden ein SportNexus-Konto an:
//   1. Supabase-Auth-Invite (Mail mit „Passwort festlegen"-Link)
//   2. members-Row (auth-Trigger verknüpft auth_id beim ersten Login)
//
// Pull statt Webhook, weil die HubSpot-Workflow-Aktion „Webhook" Operations
// Hub Professional verlangt — diese Variante läuft auf jeder Lizenzstufe und
// ist fürs kontrollierte Testing per Hand auslösbar.
//
// SICHERHEIT: Default ist DRY-RUN — es wird NICHTS geschrieben und KEINE Mail
// verschickt. Erst `--live` legt Konten an und löst Invite-Mails aus.
//
//   node scripts/hubspot-onboard.mjs            # Dry-Run (zeigt nur an)
//   node scripts/hubspot-onboard.mjs --live     # echtes Onboarding
//   node scripts/hubspot-onboard.mjs --status="Founder,Early Member"
//   node scripts/hubspot-onboard.mjs --live --only=max@example.com
//
// Mapping-Quelle: docs/HUBSPOT-SYNC.md (verifiziert 2026-06-12/16).

import { readFileSync } from "node:fs";
import { argv } from "node:process";
import { createClient } from "@supabase/supabase-js";

// ---------- .env.local laden ----------
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);

const HUBSPOT_TOKEN = env.HUBSPOT_TOKEN;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = env.APP_URL ?? "https://sport-nexus-app.vercel.app";

// ---------- CLI-Args ----------
const args = argv.slice(2);
const LIVE = args.includes("--live");
const statusArg = args.find((a) => a.startsWith("--status="));
const onlyArg = args.find((a) => a.startsWith("--only="));
const ALLOWED_STATUS = (statusArg ? statusArg.split("=")[1] : "Founder")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const ONLY_EMAIL = onlyArg ? onlyArg.split("=")[1].trim().toLowerCase() : null;

const log = (...a) => console.log(...a);

if (!HUBSPOT_TOKEN) {
  console.error("✗ HUBSPOT_TOKEN fehlt in .env.local. Lege einen HubSpot Private App Token an (CRM-Lese-Rechte) und trage ihn dort ein.");
  process.exit(1);
}
if (LIVE && (!SUPABASE_URL || !SERVICE_ROLE)) {
  console.error("✗ Für --live werden NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY benötigt.");
  process.exit(1);
}

// Properties, die wir aus HubSpot ziehen (echte interne Namen, docs/HUBSPOT-SYNC.md).
const PROPS = [
  "firstname", "lastname", "email", "company", "jobtitle",
  "branche_dropdown", "zweitbranche_dropdown", "date_of_birth",
  "hauptarbeitsort", "city", "mobilephone", "website", "hs_linkedin_url",
  "sportarten___interessen", "was_biete_ich", "zusatzfunktionen",
  "vertrag", "vertragsdatum", "memberstatus",
];

// ---------- HubSpot: Kontakte mit vertrag=true suchen (paginiert) ----------
async function fetchContracted() {
  const out = [];
  let after = undefined;
  do {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "vertrag", operator: "EQ", value: "true" }] }],
        properties: PROPS,
        limit: 100,
        after,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`HubSpot search HTTP ${res.status}: ${t.slice(0, 400)}`);
    }
    const json = await res.json();
    out.push(...(json.results ?? []));
    after = json.paging?.next?.after;
  } while (after);
  return out;
}

// ---------- Mapping HubSpot-Properties → members-Row ----------
const EN_DASH = "–"; // « – »

function splitBranche(v) {
  if (!v) return { branch: "", sub: "" };
  const sep = ` ${EN_DASH} `;
  const i = v.indexOf(sep);
  if (i === -1) return { branch: v.trim(), sub: "" };
  return { branch: v.slice(0, i).trim(), sub: v.slice(i + sep.length).trim() };
}

function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const dot = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // HubSpot date-Typ liefert teils Epoch-ms.
  if (/^\d{10,13}$/.test(s)) {
    const d = new Date(Number(s.length === 10 ? s * 1000 : s));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseSports(v) {
  if (!v) return [];
  return String(v)
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapContact(p) {
  const { branch, sub } = splitBranche(p.branche_dropdown);
  return {
    first: p.firstname ?? "",
    last: p.lastname ?? "",
    email: (p.email ?? "").trim().toLowerCase(),
    company: p.company ?? "",
    role: p.jobtitle ?? "",
    branch,
    sub,
    branch2: p.zweitbranche_dropdown ?? "",
    work: p.hauptarbeitsort ?? "",
    home: p.city ?? "",
    mobile: p.mobilephone ?? "",
    web: p.website ?? "",
    linkedin: p.hs_linkedin_url ?? "",
    sports: parseSports(p.sportarten___interessen),
    offer: p.was_biete_ich ?? "",
    additional_roles: p.zusatzfunktionen ?? "",
    date_of_birth: parseDate(p.date_of_birth),
    since: parseDate(p.vertragsdatum),
    memberstatus: p.memberstatus ?? "",
  };
}

// ---------- Supabase: ein Mitglied onboarden ----------
// WICHTIG: Der DB-Trigger on_auth_user_created (handle_new_user) legt beim
// inviteUserByEmail automatisch eine members-Zeile an bzw. verknüpft eine
// bestehende per E-Mail. Wir dürfen daher NICHT zusätzlich inserten (sonst
// Duplikat) — wir UPDATEN die vom Trigger verknüpfte Zeile mit den HubSpot-Daten.
async function onboardOne(admin, m) {
  // 1. Bestehende members-Zeile(n) zu dieser E-Mail prüfen (bevorzugt auth-verknüpft).
  const { data: pre, error: preErr } = await admin
    .from("members")
    .select("id, slug, auth_id, first")
    .eq("email", m.email);
  if (preErr) return { status: "error", reason: `Select: ${preErr.message}` };
  const existing = (pre ?? []).find((r) => r.auth_id) ?? (pre ?? [])[0] ?? null;

  // Schon vollständig onboarded (Auth-verknüpft + Name gesetzt) → nichts tun.
  if (existing && existing.auth_id && existing.first && existing.first.trim()) {
    return { status: "skip", reason: "bereits onboarded" };
  }

  // 2. Invite nur, wenn noch KEIN Auth-Account existiert (kein auth-verknüpfter
  //    Member). So vermeiden wir doppelte Invite-Mails. Der Trigger
  //    handle_new_user legt/verknüpft dabei die members-Zeile.
  if (!(existing && existing.auth_id)) {
    const { error: authErr } = await admin.auth.admin.inviteUserByEmail(m.email, {
      redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
    });
    if (authErr && !/already|registered|exists/i.test(authErr.message)) {
      return { status: "error", reason: `Auth: ${authErr.message}` };
    }
  }

  // 3. Verknüpfte Zeile (nach evtl. Invite/Trigger) holen und mit HubSpot-Daten füllen.
  const { data: rows, error: selErr } = await admin
    .from("members")
    .select("id, slug, auth_id, first")
    .eq("email", m.email);
  if (selErr) return { status: "error", reason: `Select: ${selErr.message}` };
  if (!rows || rows.length === 0) return { status: "error", reason: "Keine members-Zeile nach Invite" };
  const target = rows.find((r) => r.auth_id) ?? rows[0];
  const wasLinked = Boolean(existing && existing.auth_id);

  // CRM-Felder setzen. since/date_of_birth nur, wenn HubSpot einen Wert liefert
  // (sonst nicht den Trigger-Default current_date überschreiben).
  const update = {
    first: m.first,
    last: m.last,
    company: m.company,
    role: m.role,
    branch: m.branch,
    sub: m.sub,
    branch2: m.branch2,
    work: m.work,
    home: m.home,
    mobile: m.mobile,
    web: m.web,
    linkedin: m.linkedin,
    sports: m.sports,
    offer: m.offer,
    additional_roles: m.additional_roles,
  };
  if (m.date_of_birth) update.date_of_birth = m.date_of_birth;
  if (m.since) update.since = m.since;

  const { error: updErr } = await admin.from("members").update(update).eq("id", target.id);
  if (updErr) return { status: "error", reason: `Update: ${updErr.message}` };
  return { status: wasLinked ? "aktualisiert" : "onboarded", slug: target.slug };
}

// ---------- Main ----------
log(`\n=== HubSpot-Onboarding (${LIVE ? "LIVE" : "DRY-RUN"}) ===`);
log(`Freigegebene memberstatus: ${ALLOWED_STATUS.join(", ")}${ONLY_EMAIL ? `  ·  nur ${ONLY_EMAIL}` : ""}\n`);

const contacts = await fetchContracted();
log(`HubSpot: ${contacts.length} Kontakt(e) mit vertrag=true.`);

// Welche memberstatus-Werte kommen real vor? (hilft, die internen Werte zu sehen)
const seenStatus = new Set(contacts.map((c) => (c.properties.memberstatus ?? "(leer)")));
log(`Vorkommende memberstatus-Werte: ${[...seenStatus].join(" | ")}\n`);

const candidates = contacts
  .map((c) => mapContact(c.properties))
  .filter((m) => m.email)
  .filter((m) => ALLOWED_STATUS.includes((m.memberstatus ?? "").toLowerCase()))
  .filter((m) => !ONLY_EMAIL || m.email === ONLY_EMAIL);

log(`→ ${candidates.length} Kandidat(en) nach Status-Filter:\n`);
for (const m of candidates) {
  log(`  • ${m.first} ${m.last}  <${m.email}>  [${m.memberstatus}]`);
  log(`    ${m.role || "—"} @ ${m.company || "—"}  ·  ${m.branch || "—"}${m.sub ? " / " + m.sub : ""}${m.branch2 ? "  · 2.: " + m.branch2 : ""}`);
  log(`    Sport: ${m.sports.join(", ") || "—"}  ·  Geb: ${m.date_of_birth || "—"}  ·  seit: ${m.since || "—"}`);
}

if (!LIVE) {
  log(`\nDRY-RUN — es wurde nichts angelegt und keine Mail verschickt.`);
  log(`Zum echten Onboarding: node scripts/hubspot-onboard.mjs --live\n`);
  process.exit(0);
}

if (candidates.length === 0) {
  log(`\nKeine Kandidaten — nichts zu tun.\n`);
  process.exit(0);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
log(`\nLIVE — lege Konten an...\n`);
let ok = 0, skip = 0, err = 0;
for (const m of candidates) {
  const r = await onboardOne(admin, m);
  if (r.status === "onboarded") { ok++; log(`  ✓ ${m.email} → onboarded (${r.slug})`); }
  else if (r.status === "skip") { skip++; log(`  – ${m.email} → übersprungen (${r.reason})`); }
  else { err++; log(`  ✗ ${m.email} → FEHLER: ${r.reason}`); }
}
log(`\nFertig: ${ok} onboarded, ${skip} übersprungen, ${err} Fehler.\n`);
