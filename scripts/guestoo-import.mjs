// Importiert ausgewählte Guestoo-Events in die App-events-Tabelle (anlegen, was
// noch nicht da ist — Match per guestoo_id). Default: die neuen Lunches
// Büchel/Streller/Dudic (Golf ist bereits importiert).
//
// Mapping → events: title/subtitle (aus displayName „N. …-Lunch mit GAST"
// gesplittet), date/time (Europe/Zurich), city/venue/address, guests
// (maxVisitor), status (upcoming/past), image_url (bgImage via öffentlichem
// Endpoint, sonst image), guestoo_id. speakers = Gast; agenda leer (nicht erfunden).
//
// DRY-RUN ist Default. --live legt an.
//   node scripts/guestoo-import.mjs
//   node scripts/guestoo-import.mjs --live
//   node scripts/guestoo-import.mjs --names="büchel,streller,dudic"

import { readFileSync } from "node:fs";
import { argv } from "node:process";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const BASE = "https://app.guestoo.de";
const TODAY = "2026-06-16";
const LIVE = argv.includes("--live");
const namesArg = argv.find((a) => a.startsWith("--names="));
const NAMES = (namesArg ? namesArg.split("=")[1] : "büchel,streller,dudic")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const gHeaders = {
  Accept: "application/json", "Content-Type": "application/json",
  Cookie: env.GUESTOO_COOKIE_HEADER, Origin: BASE,
  Referer: `${BASE}/dashboard`, "X-XSRF-TOKEN": env.GUESTOO_XSRF_TOKEN,
};

const fmtDate = (ms) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
const fmtTime = (ms) => new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ms));
const citySlug = (c) => (c ?? "").toLowerCase().replace(/ü/g, "ue").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function splitTitle(displayName, city) {
  const m = displayName.match(/^(\d+\.\s*SportNexus[- ]Lunch)\s+mit\s+(.+)$/i);
  if (m) return { title: `${m[1].replace(/\s+/g, " ")} ${city}`.trim(), subtitle: m[2].trim() };
  return { title: displayName, subtitle: "" };
}
function formatAddr(a) {
  const street = [a?.street, a?.streetNumber].filter(Boolean).join(" ").trim();
  const cityLine = [a?.postCode, a?.city].filter(Boolean).join(" ").trim();
  return [street, cityLine].filter(Boolean).join(", ").trim();
}
async function bgImageUrl(id, fallbackPath) {
  try {
    const r = await fetch(`${BASE}/proxy/api/public/events/${id}?lang=de&forceLang=true`, { headers: { Accept: "application/json", "User-Agent": "SportNexus/1.0 (import)" } });
    if (r.ok) {
      const j = await r.json();
      const p = j?.bgImage?.defaultImagePath ?? j?.image?.defaultImagePath;
      if (p) return `${BASE}${p}`;
    }
  } catch { /* fallback */ }
  return fallbackPath ? `${BASE}${fallbackPath}` : "";
}
async function uniqueId(base) {
  let id = base;
  for (let n = 2; n < 50; n++) {
    const { data } = await supabase.from("events").select("id").eq("id", id).maybeSingle();
    if (!data) return id;
    id = `${base}-${n}`;
  }
  return `${base}-${Math.floor(Date.now() / 1000) % 100000}`;
}

// Guestoo-Events holen.
const res = await fetch(`${BASE}/proxy/api/events/search`, {
  method: "POST", headers: gHeaders,
  body: JSON.stringify({ paging: { currentPage: 0, pages: [], perPage: 500, sort: "date" }, tags: [], campaigns: [], visibilities: [], archivedFilter: "SHOW_ALL" }),
});
if (!res.ok) { console.error(`Guestoo ${res.status}: ${await res.text()}`); process.exit(1); }
const items = (await res.json()).items;

const { data: dbEvents } = await supabase.from("events").select("guestoo_id");
const known = new Set((dbEvents ?? []).map((e) => e.guestoo_id).filter(Boolean));

const picked = items.filter((g) =>
  NAMES.some((n) => g.displayName.toLowerCase().includes(n)) && !known.has(g.id),
);

console.log(`=== Guestoo-Import (${LIVE ? "LIVE" : "DRY-RUN"}) ===`);
console.log(`Namen-Filter: ${NAMES.join(", ")} | ${picked.length} zu importieren\n`);

let done = 0;
for (const g of picked) {
  const date = fmtDate(g.startDate);
  const city = g.address?.city ?? "";
  const { title, subtitle } = splitTitle(g.displayName, city);
  const time = g.startDate && g.endDate ? `${fmtTime(g.startDate)} – ${fmtTime(g.endDate)}` : "";
  // WICHTIG: Die API-Felder image/bgImage sind quadratisch bzw. das generische
  // Default. Das echte (16:9-)Eventbild liefert NUR der image-event-Endpoint —
  // dieselbe Quelle wie die öffentliche Microsite. Reflektiert Pascals Uploads.
  const image_url = `${BASE}/proxy/api/asset/image-event/${g.id}?lang=de&dimension=Regular_1000`;
  const row = {
    id: await uniqueId(`ev-${date}-${citySlug(city)}-lunch`),
    title, subtitle, date, time, city,
    venue: g.address?.locationName ?? "",
    address: formatAddr(g.address),
    guests: typeof g.maxVisitor === "number" ? g.maxVisitor : 0,
    status: date >= TODAY ? "upcoming" : "past",
    featured: false,
    description: subtitle ? `Lunch-Talk mit ${subtitle}.` : "",
    image_url,
    long_description: "",
    speakers: subtitle ? [{ name: subtitle, role: "Gast" }] : [],
    agenda: [],
    guestoo_id: g.id,
  };

  console.log(`• ${row.date}  ${row.title}  — ${row.subtitle || "—"}  [${row.city}]`);
  console.log(`    ${row.time || "?"} · ${row.venue || "Venue TBD"} · ${row.guests} Plätze · id=${row.id}`);
  console.log(`    Bild: ${row.image_url ? row.image_url.slice(0, 70) + "…" : "—"}`);

  if (LIVE) {
    const { error } = await supabase.from("events").insert(row);
    if (error) { console.log(`    ✗ FEHLER: ${error.message}`); continue; }
    done++;
    console.log(`    ✓ importiert`);
  }
}

console.log(`\n${LIVE ? `Fertig: ${done} importiert.` : "DRY-RUN — nichts geschrieben. Mit --live ausführen."}`);
