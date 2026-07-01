// Event-Sync: matched bestehende Supabase-Events mit Guestoo-Events und zieht
// die harten Fakten nach (Guestoo = Wahrheit):
//   guestoo_id, guests (maxVisitor), venue/address, date/time (+status), city.
// Titel + Untertitel bleiben BEWUSST unangetastet (kuratiert, in der App
// gepflegt) — Guestoos displayName ist unsauber/wechselnd formatiert.
// Direkter Service-Role-Schreibzugriff, damit es ohne eingeloggten Admin läuft.
// --dry-run zeigt alle Änderungen an, ohne zu schreiben.

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

const DRY = process.argv.includes("--dry-run");
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
      paging: { currentPage: 0, pages: [], perPage: 500, sort: "date" },
      tags: [], campaigns: [], visibilities: [], archivedFilter: "SHOW_ALL",
    }),
  });
  if (!res.ok) throw new Error(`Guestoo ${res.status}: ${await res.text()}`);
  return (await res.json()).items;
}

const guestooEvents = await fetchGuestooEvents();
console.log(`Guestoo: ${guestooEvents.length} Events.`);

const { data: dbEvents } = await supabase
  .from("events")
  .select("id, title, subtitle, date, time, city, venue, address, guests, status, guestoo_id");
console.log(`Supabase: ${dbEvents?.length ?? 0} Events.`);

const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9äöüß ]/g, " ").replace(/\s+/g, " ").trim();
const formatAddr = (a) => {
  const street = [a?.street, a?.streetNumber].filter(Boolean).join(" ").trim();
  const cityLine = [a?.postCode, a?.city].filter(Boolean).join(" ").trim();
  return [street, cityLine].filter(Boolean).join(", ").trim();
};
// Datum/Zeit in Europe/Zurich (identisch zu scripts/guestoo-import.mjs).
const fmtDate = (ms) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
const fmtTime = (ms) => new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ms));
const statusForDate = (iso) => (new Date(iso + "T23:59:59").getTime() < Date.now() ? "past" : "upcoming");

let matched = 0, updated = 0;
const unmatched = [];

for (const ev of dbEvents ?? []) {
  const isoDate = String(ev.date);
  const evTitle = norm(`${ev.title ?? ""} ${ev.subtitle ?? ""}`);
  const evCity = norm(ev.city ?? "");

  const candidate = ev.guestoo_id
    ? guestooEvents.find((g) => g.id === ev.guestoo_id)
    : guestooEvents.find((g) => {
        const gDate = new Date(g.startDate).toISOString().slice(0, 10);
        if (gDate !== isoDate) return false;
        const gTitle = norm(g.displayName);
        if (evCity) {
          const inTitle = gTitle.includes(evCity);
          const inCity = norm(g.address?.city ?? "").includes(evCity);
          if (!inTitle && !inCity) return false;
        }
        const aWords = evTitle.split(" ").filter((w) => w.length > 3);
        const bWords = new Set(gTitle.split(" "));
        return aWords.filter((w) => bWords.has(w)).length >= 2;
      });

  if (!candidate) {
    if (!ev.guestoo_id) {
      unmatched.push({ title: ev.title, date: isoDate });
      console.log(`✗ Kein Match: ${ev.title} (${isoDate})`);
    }
    continue;
  }
  matched++;

  const updates = {};
  if (!ev.guestoo_id) updates.guestoo_id = candidate.id;
  if (typeof candidate.maxVisitor === "number" && candidate.maxVisitor !== ev.guests) {
    updates.guests = candidate.maxVisitor;
  }
  if (candidate.address) {
    const full = formatAddr(candidate.address);
    if (full && full !== ev.address) updates.address = full;
    if (candidate.address.locationName && candidate.address.locationName !== ev.venue) {
      updates.venue = candidate.address.locationName;
    }
  }
  // Harte Fakten: Datum/Zeit (Guestoo ist Wahrheit) inkl. Status-Neuberechnung.
  if (candidate.startDate) {
    const gDate = fmtDate(candidate.startDate);
    if (gDate !== String(ev.date)) { updates.date = gDate; updates.status = statusForDate(gDate); }
    const gTime = candidate.endDate ? `${fmtTime(candidate.startDate)} – ${fmtTime(candidate.endDate)}` : fmtTime(candidate.startDate);
    if (gTime && gTime !== ev.time) updates.time = gTime;
  }
  // Stadt.
  const gCity = candidate.address?.city ?? "";
  if (gCity && gCity !== ev.city) updates.city = gCity;

  if (Object.keys(updates).length === 0) {
    console.log(`= ${ev.title} (in sync)`);
    continue;
  }
  if (DRY) {
    updated++;
    console.log(`↻ (dry) ${ev.title} → ${Object.keys(updates).join(", ")}`);
    for (const k of Object.keys(updates)) console.log(`      ${k}: ${JSON.stringify(ev[k])}  →  ${JSON.stringify(updates[k])}`);
    continue;
  }
  const { error } = await supabase.from("events").update(updates).eq("id", ev.id);
  if (error) { console.log(`✗ ${ev.title}: ${error.message}`); continue; }
  updated++;
  console.log(`↻ ${ev.title} → updated: ${Object.keys(updates).join(", ")}`);
}

console.log(`\n${DRY ? "DRY-RUN — nichts geschrieben. Ohne --dry-run ausführen zum Anwenden." : "Geschrieben."}`);
console.log(`Matched: ${matched} | ${DRY ? "Würde ändern" : "Updated"}: ${updated} | Unmatched: ${unmatched.length}`);
