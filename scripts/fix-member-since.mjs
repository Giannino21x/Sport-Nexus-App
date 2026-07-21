// Einmal-Fix: "Member seit" für die Members korrigieren, die beim Import am
// 2026-07-21 das Platzhalter-Datum (current_date-Default) bekommen haben.
// Quelle je E-Mail: vertrag→JA aus der HubSpot-Property-History, sonst
// vertragsdatum/timeline, sonst createdate (Datum-Anteil).
// Es werden NUR Zeilen mit since = '2026-07-21' angefasst.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);

const LIVE = process.argv.includes("--live");
const H = { Authorization: `Bearer ${env.HUBSPOT_TOKEN}`, "Content-Type": "application/json" };

function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const dot = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (iso) return iso[1];
  if (/^\d{10,13}$/.test(s)) {
    const d = new Date(Number(s.length === 10 ? s * 1000 : s));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

// 1. Alle vertrag=true-Kontakte holen
const contacts = [];
let after;
do {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "vertrag", operator: "EQ", value: "true" }] }],
      properties: ["email", "vertragsdatum", "timeline", "createdate"],
      limit: 100,
      after,
    }),
  });
  if (!res.ok) throw new Error(`HubSpot ${res.status}`);
  const j = await res.json();
  contacts.push(...(j.results ?? []));
  after = j.paging?.next?.after;
} while (after);

// 2. vertrag→JA-Datum aus der Property-History (Batch)
const sinceMap = new Map();
const ids = contacts.map((c) => c.id);
for (let i = 0; i < ids.length; i += 100) {
  const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/read", {
    method: "POST",
    headers: H,
    body: JSON.stringify({ propertiesWithHistory: ["vertrag"], inputs: ids.slice(i, i + 100).map((id) => ({ id })) }),
  });
  if (!r.ok) continue;
  const j = await r.json();
  for (const c of j.results ?? []) {
    const trueTs = (c.propertiesWithHistory?.vertrag ?? [])
      .filter((v) => String(v.value).toLowerCase() === "true")
      .map((v) => String(v.timestamp))
      .sort();
    if (trueTs[0]) sinceMap.set(String(c.id), trueTs[0].slice(0, 10));
  }
}

// 3. Bestes Datum je E-Mail
const bestByEmail = new Map();
for (const c of contacts) {
  const p = c.properties;
  const email = (p.email ?? "").trim().toLowerCase();
  if (!email) continue;
  const best = sinceMap.get(String(c.id)) || parseDate(p.vertragsdatum) || parseDate(p.timeline) || parseDate(p.createdate);
  if (best) bestByEmail.set(email, best);
}

// 4. Betroffene members-Zeilen (since = 2026-07-21) updaten
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows, error } = await db.from("members").select("id,email,since").eq("since", "2026-07-21");
if (error) throw new Error(error.message);
console.log(`${rows.length} Members mit Platzhalter-Datum 2026-07-21.`);

let fixed = 0, missing = 0;
for (const r of rows) {
  const best = bestByEmail.get((r.email ?? "").trim().toLowerCase());
  if (!best) { missing++; console.log(`  ? ${r.email} → keine Quelle, bleibt`); continue; }
  if (LIVE) {
    const { error: e } = await db.from("members").update({ since: best }).eq("id", r.id);
    if (e) { console.log(`  ✗ ${r.email}: ${e.message}`); continue; }
  }
  fixed++;
  console.log(`  ${LIVE ? "✓" : "·"} ${r.email} → ${best}`);
}
console.log(`\n${LIVE ? "" : "DRY-RUN: "}${fixed} korrigiert, ${missing} ohne Quelle.`);
