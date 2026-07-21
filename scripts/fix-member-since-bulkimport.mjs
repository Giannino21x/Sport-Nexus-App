// Einmal-Fix Nr. 2 (Pascal-Feedback: "Franck Kempfer und Livia Altmann
// 29.5.2025 kann fast nicht sein"): 32 Members tragen als "Member seit" den
// 29.5.2025 — das ist das HubSpot-createdate des Massenimports an jenem Tag
// (alle 32 Kontakte innerhalb derselben Minute angelegt), nicht der echte
// Beitritt. Quelle je E-Mail: vertrag→JA aus der Property-History, sonst
// vertragsdatum/timeline. createdate ist hier bewusst KEIN Fallback (das wäre
// wieder der 29.5.). Ohne Quelle bleibt die Zeile unverändert.
// Es werden NUR Zeilen mit since = '2025-05-29' angefasst.
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

// 2. vertrag→JA-Datum aus der Property-History (Batch, max. 50 Inputs)
const sinceMap = new Map();
const ids = contacts.map((c) => c.id);
for (let i = 0; i < ids.length; i += 50) {
  const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/read", {
    method: "POST",
    headers: H,
    body: JSON.stringify({ propertiesWithHistory: ["vertrag"], inputs: ids.slice(i, i + 50).map((id) => ({ id })) }),
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

// 3. Bestes Datum je E-Mail — OHNE createdate-Fallback
const bestByEmail = new Map();
for (const c of contacts) {
  const p = c.properties;
  const email = (p.email ?? "").trim().toLowerCase();
  if (!email) continue;
  const best = sinceMap.get(String(c.id)) || parseDate(p.vertragsdatum) || parseDate(p.timeline);
  if (best) bestByEmail.set(email, best);
}

// 4. Betroffene members-Zeilen (since = 2025-05-29) updaten
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows, error } = await db.from("members").select("id,email,since").eq("since", "2025-05-29");
if (error) throw new Error(error.message);
console.log(`${rows.length} Members mit Bulk-Import-Datum 2025-05-29.`);

let fixed = 0, missing = 0;
for (const r of rows) {
  const best = bestByEmail.get((r.email ?? "").trim().toLowerCase());
  if (!best || best === "2025-05-29") { missing++; console.log(`  ? ${r.email} → keine bessere Quelle, bleibt`); continue; }
  if (LIVE) {
    const { error: e } = await db.from("members").update({ since: best }).eq("id", r.id);
    if (e) { console.log(`  ✗ ${r.email}: ${e.message}`); continue; }
  }
  fixed++;
  console.log(`  ${LIVE ? "✓" : "·"} ${r.email} → ${best}`);
}
console.log(`\n${LIVE ? "" : "DRY-RUN: "}${fixed} korrigierbar/korrigiert, ${missing} ohne bessere Quelle.`);
