// Behebt Events, deren image_url aktuell das GENERISCHE Guestoo-Default-Bild
// liefert (Kamera-Motiv, md5 9670e4f3…). Ursache: der Sync/Import bevorzugte
// `bgImage` (1440er Hintergrund), das bei manchen Events das Agentur-Default ist
// — das echte Eventfoto steckt im `image`-Feld. Hier ersetzen wir das Default
// durch das echte `image`-Asset (sofern vorhanden und nicht selbst Default).
//
// Lässt korrekte Bilder unangetastet. DRY-RUN default, --live schreibt.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { argv } from "node:process";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const BASE = "https://app.guestoo.de";
const LIVE = argv.includes("--live");
const PLACEHOLDER = "9670e4f30b135ad6a50c65514608b314"; // generisches Default-Bild
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const md5 = (buf) => createHash("md5").update(buf).digest("hex");
async function md5OfUrl(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return md5(Buffer.from(await r.arrayBuffer())); }
  catch { return null; }
}

// Guestoo-Events holen → id → image.defaultImagePath (das echte Eventfoto).
const res = await fetch(`${BASE}/proxy/api/events/search`, {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json", Cookie: env.GUESTOO_COOKIE_HEADER, Origin: BASE, Referer: `${BASE}/dashboard`, "X-XSRF-TOKEN": env.GUESTOO_XSRF_TOKEN },
  body: JSON.stringify({ paging: { currentPage: 0, pages: [], perPage: 500, sort: "date" }, tags: [], campaigns: [], visibilities: [], archivedFilter: "SHOW_ALL" }),
});
if (!res.ok) { console.error(`Guestoo ${res.status}`); process.exit(1); }
const imgById = new Map((await res.json()).items.map((g) => [g.id, g.image?.defaultImagePath ?? null]));

const { data: events } = await supabase.from("events").select("id, date, title, image_url, guestoo_id").not("guestoo_id", "is", null).order("date");

console.log(`=== Fix Event-Bilder (${LIVE ? "LIVE" : "DRY-RUN"}) ===\n`);
let fixed = 0, ok = 0, noFix = 0;
for (const e of events) {
  const cur = e.image_url ? await md5OfUrl(e.image_url) : null;
  if (cur && cur !== PLACEHOLDER) { ok++; console.log(`= ${e.date} ${e.title} — Bild ok`); continue; }

  const imgPath = imgById.get(e.guestoo_id);
  const candidate = imgPath ? `${BASE}${imgPath}` : null;
  const candMd5 = candidate ? await md5OfUrl(candidate) : null;
  if (!candidate || !candMd5 || candMd5 === PLACEHOLDER) {
    noFix++;
    console.log(`✗ ${e.date} ${e.title} — Default-Bild, KEIN echtes image-Asset in Guestoo (Pascal muss Bild hochladen)`);
    continue;
  }
  console.log(`↻ ${e.date} ${e.title} — Default → echtes Foto (${candidate.slice(0, 72)}…)`);
  if (LIVE) {
    const { error } = await supabase.from("events").update({ image_url: candidate }).eq("id", e.id);
    if (error) { console.log(`   ✗ ${error.message}`); continue; }
    fixed++;
  }
}
console.log(`\n${LIVE ? `Fertig: ${fixed} korrigiert, ${ok} ok, ${noFix} ohne echtes Bild.` : `DRY-RUN — ${ok} ok. Mit --live anwenden.`}`);
