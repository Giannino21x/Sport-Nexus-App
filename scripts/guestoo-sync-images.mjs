// Synchronisiert die Event-Bilder aus Guestoo in events.image_url.
//
// Hintergrund: Guestoo liefert pro Event zwei Assets — `image` (kleines
// 400×400-Quadrat) und `bgImage` (1440er, scharf). Bisher zeigte image_url auf
// die 400er-Variante, die in der breiten Karten-/Hero-Darstellung unscharf
// letterboxed wurde. Hier bevorzugen wir das hochauflösende bgImage.
//
// Cookie-frei: nutzt den ÖFFENTLICHEN Endpoint
//   GET https://app.guestoo.de/proxy/api/public/events/{id}
// Der funktioniert nur für noch sichtbare (= upcoming) Events. Archivierte
// Past-Events liefern 404 — die werden übersprungen (ihre image_url bleibt, wie
// sie ist). Asset-URLs (/proxy/api/asset/...) sind ohne Login öffentlich ladbar.
//
// Schutz vor Überschreiben: kuratierte Bilder (z.B. Webflow-CDN-Querformate auf
// alten Past-Events) bleiben unangetastet — aktualisiert wird nur, wenn die
// aktuelle image_url leer ist oder selbst schon ein Guestoo-Asset war.

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
if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env fehlt");

const BASE = "https://app.guestoo.de";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const isGuestooAsset = (url) => !url || url.includes("/proxy/api/asset/");

async function fetchPublicEvent(id) {
  const res = await fetch(`${BASE}/proxy/api/public/events/${id}?lang=de&forceLang=true`, {
    headers: { Accept: "application/json", "User-Agent": "SportNexus/1.0 (sync)" },
  });
  if (!res.ok) return { status: res.status, json: null };
  return { status: res.status, json: await res.json() };
}

// bgImage (1440, scharf) bevorzugen, sonst image (400) als Fallback.
function pickImagePath(ev) {
  return ev?.bgImage?.defaultImagePath ?? ev?.image?.defaultImagePath ?? null;
}

const { data: events, error } = await supabase
  .from("events")
  .select("id, title, date, image_url, guestoo_id")
  .not("guestoo_id", "is", null)
  .order("date", { ascending: false });
if (error) throw error;

console.log(`${events.length} Events mit guestoo_id.\n`);

let updated = 0, skippedCurated = 0, skipped404 = 0, unchanged = 0, noImage = 0;

for (const ev of events) {
  const { status, json } = await fetchPublicEvent(ev.guestoo_id);
  if (!json) {
    skipped404++;
    console.log(`· ${ev.date} ${ev.title} — public ${status}, übersprungen (archiviert/cookie-frei nicht erreichbar)`);
    continue;
  }
  const path = pickImagePath(json);
  if (!path) { noImage++; console.log(`· ${ev.date} ${ev.title} — kein Bild in Guestoo`); continue; }

  const newUrl = `${BASE}${path}`;
  if (!isGuestooAsset(ev.image_url)) {
    skippedCurated++;
    console.log(`= ${ev.date} ${ev.title} — kuratiertes Bild beibehalten`);
    continue;
  }
  // Cache-Buster (?x=…) ausklammern beim Vergleich der Asset-Identität.
  const idOf = (u) => (u ? u.split("/proxy/api/asset/")[1]?.split("?")[0] : null);
  if (idOf(ev.image_url) === idOf(newUrl)) { unchanged++; console.log(`= ${ev.date} ${ev.title} — schon aktuell`); continue; }

  const { error: upErr } = await supabase.from("events").update({ image_url: newUrl }).eq("id", ev.id);
  if (upErr) { console.log(`✗ ${ev.title}: ${upErr.message}`); continue; }
  updated++;
  console.log(`↻ ${ev.date} ${ev.title} → ${newUrl}`);
}

console.log(`\nUpdated: ${updated} | unverändert: ${unchanged} | kuratiert behalten: ${skippedCurated} | kein Bild: ${noImage} | archiviert/404: ${skipped404}`);
