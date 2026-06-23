// Guestoo → SportNexus Anmeldungs-Sync.
//
// Zieht pro Event (mit guestoo_id) die Teilnehmerliste aus Guestoo, ordnet sie
// über die E-Mail unseren Members zu und hält public.event_registrations
// (source = 'guestoo') aktuell — inkl. Abmeldungen. Manuelle Self-Marks
// (source = 'self') werden NIE angefasst.
//
//   node scripts/guestoo-sync-registrations.mjs            # live
//   node scripts/guestoo-sync-registrations.mjs --dry-run  # nur anzeigen
//
// Voraussetzung: gültige Guestoo-Cookies (npm run guestoo:refresh oder manueller
// Browser-Login) in .env.local + Supabase-Service-Role.

import { readFileSync } from "node:fs";
import { argv } from "node:process";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"(.*)"$/, "$1")]; }),
);

const DRY = argv.includes("--dry-run");
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
const COOKIE = env.GUESTOO_COOKIE_HEADER;
const XSRF = env.GUESTOO_XSRF_TOKEN;
// Welche Guestoo-Status zählen als "angemeldet"? (override via REGISTERED_STATUSES)
const STATUSES = (env.REGISTERED_STATUSES || "CONFIRMED,APPEARED,ADDED")
  .split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

if (!SUPABASE_URL || !SERVICE_ROLE) { console.error("✗ Supabase-Env fehlt"); process.exit(1); }
if (!COOKIE || !XSRF) { console.error("✗ Guestoo-Cookies fehlen — erst einloggen/refreshen."); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);

async function guestoo(path, body) {
  const res = await fetch(`https://app.guestoo.de${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      Cookie: COOKIE,
      Origin: "https://app.guestoo.de",
      Referer: "https://app.guestoo.de/dashboard",
      "X-XSRF-TOKEN": XSRF,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
    cache: "no-store",
  });
  if (res.status === 0 || res.status === 302 || res.status === 401) {
    throw new Error("Guestoo-Session ungültig — bitte neu einloggen (Cookies abgelaufen).");
  }
  if (!res.ok) throw new Error(`Guestoo API ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return res.json();
}

function visitorsBody() {
  return {
    paging: { currentPage: 0, pages: [], perPage: 500, sort: "state" },
    status: ["CONFIRMED", "APPEARED", "OPEN", "ADDED", "INVITED", "DECLINED"],
    trackingStatus: [], tags: [], campaigns: [], agreements: [], agreementMode: "INCLUDE",
    showPending: true, showVip: false, vipFilter: "WHATEVER", lotteryFilter: "WHATEVER",
    ticketCheckInFilter: "WHATEVER", waitinglistFilter: "BOTH", requireApprovalFilter: "BOTH",
    publicProfileFilter: "BOTH", showMailError: false, checkboxFieldValues: [], checkboxFilters: [],
    checkboxAccountFieldValues: [], checkboxAccountFilters: [], listFieldValues: [], smartFieldValues: [],
    smartFieldGroups: [], dynamicFieldValue: {}, accountDynamicFieldValue: {}, listAccountDynamicFieldValue: {},
    timeslotIds: [], timeslotGroups: [], ticketIds: [], searchWithoutOrder: false, checkinType: "WHATEVER",
    emailType: "WHATEVER", testFilter: "WHATEVER", searchTestDoiRequired: false,
    seatingAreaId: null, seatingRowId: null, seatingChairId: null, languages: [], groupByRegisterId: false,
  };
}

log(`\n=== Guestoo-Anmeldungs-Sync (${DRY ? "DRY-RUN" : "LIVE"}) ===`);
log(`Als "angemeldet" gewertete Status: ${STATUSES.join(", ")}\n`);

// 1. Members-E-Mail → id Lookup (einmal laden).
const { data: members, error: mErr } = await supabase.from("members").select("id, email");
if (mErr) { console.error("✗ members:", mErr.message); process.exit(1); }
const emailToId = new Map();
for (const m of members ?? []) if (m.email) emailToId.set(m.email.trim().toLowerCase(), m.id);
log(`Members: ${emailToId.size} mit E-Mail.`);

// 2. Events mit guestoo_id.
const { data: events, error: eErr } = await supabase.from("events").select("id, guestoo_id, subtitle, title").not("guestoo_id", "is", null);
if (eErr) { console.error("✗ events:", eErr.message); process.exit(1); }
log(`Events mit Guestoo-Verknüpfung: ${events?.length ?? 0}\n`);

let totAdd = 0, totDel = 0, totUnmatched = 0;
for (const ev of events ?? []) {
  const name = ev.subtitle || ev.title || ev.id;
  let visitors;
  try {
    const data = await guestoo(`/proxy/api/events/${ev.guestoo_id}/visitors/search`, visitorsBody());
    visitors = data.items ?? [];
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    if (/Session ungültig/.test(e.message)) process.exit(1);
    continue;
  }

  // E-Mails der "angemeldeten" Visitors → Member-IDs.
  const regMemberIds = new Set();
  let unmatched = 0;
  for (const v of visitors) {
    if (!STATUSES.includes((v.status || "").toUpperCase())) continue;
    const email = v.userAccount?.email?.trim().toLowerCase();
    if (!email) continue;
    const id = emailToId.get(email);
    if (id) regMemberIds.add(id);
    else unmatched++;
  }

  // Bestehende guestoo-Anmeldungen für dieses Event.
  const { data: existing } = await supabase
    .from("event_registrations").select("member_id").eq("event_id", ev.id).eq("source", "guestoo");
  const existingIds = new Set((existing ?? []).map((r) => r.member_id));

  const toAdd = [...regMemberIds].filter((id) => !existingIds.has(id));
  const toDel = [...existingIds].filter((id) => !regMemberIds.has(id));

  log(`• ${name}: ${regMemberIds.size} angemeldete Member · +${toAdd.length} / -${toDel.length}${unmatched ? ` · ${unmatched} Gäste ohne Member-Match` : ""}`);
  totAdd += toAdd.length; totDel += toDel.length; totUnmatched += unmatched;

  if (DRY) continue;

  if (toAdd.length) {
    // insert-or-ignore: eine bestehende self-Markierung bleibt unangetastet.
    const rows = toAdd.map((member_id) => ({ member_id, event_id: ev.id, source: "guestoo" }));
    const { error } = await supabase.from("event_registrations").upsert(rows, { onConflict: "member_id,event_id", ignoreDuplicates: true });
    if (error) console.error(`    ✗ insert: ${error.message}`);
  }
  if (toDel.length) {
    const { error } = await supabase.from("event_registrations")
      .delete().eq("event_id", ev.id).eq("source", "guestoo").in("member_id", toDel);
    if (error) console.error(`    ✗ delete: ${error.message}`);
  }
}

log(`\nFertig: +${totAdd} Anmeldungen, -${totDel} entfernt, ${totUnmatched} Guestoo-Gäste ohne Member-Match.${DRY ? " (DRY-RUN — nichts geschrieben)" : ""}\n`);
