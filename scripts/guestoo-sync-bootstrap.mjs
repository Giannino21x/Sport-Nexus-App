// Einmal-Bootstrap: matched bestehende Supabase-Events mit Guestoo-Events
// und schreibt die Guestoo-UUID in events.guestoo_id. Direkter Service-Role-
// Schreibzugriff, damit es ohne eingeloggten Admin läuft.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
const COOKIE_HEADER = env.GUESTOO_COOKIE_HEADER;
const XSRF = env.GUESTOO_XSRF_TOKEN;

if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env fehlt");
if (!COOKIE_HEADER || !XSRF) throw new Error("Guestoo env fehlt");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function fetchGuestooEvents() {
  const res = await fetch("https://app.guestoo.de/proxy/api/events/search", {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Cookie: COOKIE_HEADER,
      Origin: "https://app.guestoo.de",
      Referer: "https://app.guestoo.de/dashboard",
      "X-XSRF-TOKEN": XSRF,
    },
    body: JSON.stringify({
      paging: { currentPage: 0, pages: [], perPage: 200, sort: "date" },
      tags: [], campaigns: [], visibilities: [], archivedFilter: "HIDE_ARCHIVED",
    }),
  });
  if (!res.ok) throw new Error(`Guestoo ${res.status}: ${await res.text()}`);
  return (await res.json()).items;
}

const guestooEvents = await fetchGuestooEvents();
console.log(`Guestoo: ${guestooEvents.length} Events.`);

const { data: dbEvents } = await supabase
  .from("events")
  .select("id, title, subtitle, date, guestoo_id");
console.log(`Supabase: ${dbEvents?.length ?? 0} Events.`);

const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9äöüß ]/g, " ").replace(/\s+/g, " ").trim();

let matched = 0;
const unmatched = [];
for (const ev of dbEvents ?? []) {
  if (ev.guestoo_id) { matched++; continue; }
  const isoDate = String(ev.date);
  const evTitle = norm(`${ev.title ?? ""} ${ev.subtitle ?? ""}`);

  const candidate = guestooEvents.find((g) => {
    const gDate = new Date(g.startDate).toISOString().slice(0, 10);
    if (gDate !== isoDate) return false;
    const gTitle = norm(g.displayName);
    const aWords = evTitle.split(" ").filter((w) => w.length > 3);
    const bWords = new Set(gTitle.split(" "));
    return aWords.filter((w) => bWords.has(w)).length >= 2;
  });

  if (candidate) {
    const { error } = await supabase.from("events").update({ guestoo_id: candidate.id }).eq("id", ev.id);
    if (!error) {
      matched++;
      console.log(`✓ ${ev.title} → ${candidate.id} (${candidate.displayName})`);
    } else console.log(`✗ ${ev.title}: ${error.message}`);
  } else {
    unmatched.push({ id: ev.id, title: ev.title, date: isoDate });
    console.log(`✗ Kein Match: ${ev.title} (${isoDate})`);
  }
}

console.log(`\nMatched: ${matched}, unmatched: ${unmatched.length}`);
console.log("Guestoo Events:");
guestooEvents.forEach((g) => {
  const d = new Date(g.startDate).toISOString().slice(0, 10);
  console.log(`  ${d}  ${g.id}  ${g.displayName}`);
});
