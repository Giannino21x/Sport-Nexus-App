// Einmal-Fix Nr. 3 (Pascal-Entscheid 2026-07-22): „Member seit" = vertrag→JA-
// Datum aus der HubSpot-Property-History — für ALLE Members, auch wenn das
// Formular/der Vertrag später als die mündliche Zusage ausgefüllt wurde
// („rechtlich ist jemand dann Member, wenn er das Formular ausgefüllt und den
// Vertrag bestätigt hat"). Kein Fallback auf vertragsdatum/timeline/createdate:
// ohne History-Datum bleibt die Zeile unverändert.
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

// 1. Alle vertrag=true-Kontakte holen
const contacts = [];
let after;
do {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "vertrag", operator: "EQ", value: "true" }] }],
      properties: ["email"],
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
const sinceById = new Map();
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
    if (trueTs[0]) sinceById.set(String(c.id), trueTs[0].slice(0, 10));
  }
}

// 3. vertrag→JA-Datum je E-Mail
const sinceByEmail = new Map();
for (const c of contacts) {
  const email = (c.properties?.email ?? "").trim().toLowerCase();
  const d = sinceById.get(String(c.id));
  if (email && d) sinceByEmail.set(email, d);
}
console.log(`${contacts.length} Kontakte mit vertrag=JA, davon ${sinceByEmail.size} mit History-Datum.`);

// 4. Alle members-Zeilen abgleichen; Update nur bei abweichendem Datum
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows, error } = await db.from("members").select("id,email,since").order("email");
if (error) throw new Error(error.message);

let changed = 0, same = 0, noSource = 0;
for (const r of rows) {
  const target = sinceByEmail.get((r.email ?? "").trim().toLowerCase());
  if (!target) { noSource++; continue; }
  if (r.since === target) { same++; continue; }
  if (LIVE) {
    const { error: e } = await db.from("members").update({ since: target }).eq("id", r.id);
    if (e) { console.log(`  ✗ ${r.email}: ${e.message}`); continue; }
  }
  changed++;
  console.log(`  ${LIVE ? "✓" : "·"} ${r.email}  ${r.since ?? "—"} → ${target}`);
}
console.log(`\n${LIVE ? "" : "DRY-RUN: "}${changed} geändert, ${same} bereits korrekt, ${noSource} ohne History-Datum (unverändert).`);
