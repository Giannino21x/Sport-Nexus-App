// Stellt events.image_url auf den Guestoo „image-event"-Endpoint um, der das
// echte (16:9-)Eventbild liefert — im Gegensatz zu den API-Feldern image/bgImage
// (quadratisch/Default). Das ist die Quelle, die auch die öffentliche Microsite
// nutzt; reflektiert künftige Uploads automatisch.
//
// Nur Events, deren aktuelle image_url ein Guestoo-Asset ist (kuratierte
// Webflow-Bilder bleiben unangetastet) und für die der Endpoint 200 + Bild
// liefert. DRY-RUN default, --live schreibt.

import { readFileSync } from "node:fs";
import { argv } from "node:process";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const BASE = "https://app.guestoo.de";
const LIVE = argv.includes("--live");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
// Regular_1000 (≈1000px breit, 16:9) — gute Schärfe für Karten + Hero bei
// deutlich kleinerer Dateigrösse als Regular_2000 (2–4 MB).
const eventImgUrl = (gid) => `${BASE}/proxy/api/asset/image-event/${gid}?lang=de&dimension=Regular_1000`;

const { data: events } = await supabase
  .from("events").select("id,date,title,image_url,guestoo_id")
  .not("guestoo_id", "is", null).order("date");

console.log(`=== image_url → image-event-Endpoint (${LIVE ? "LIVE" : "DRY-RUN"}) ===\n`);
let upd = 0, skip = 0;
for (const e of events) {
  // Kuratierte (Nicht-Guestoo-)Bilder unangetastet lassen.
  if (e.image_url && !e.image_url.includes("/proxy/api/asset/")) {
    skip++; console.log(`= ${e.date} ${e.title} — kuratiert, behalten`); continue;
  }
  const url = eventImgUrl(e.guestoo_id);
  // Endpoint prüfen: 200 + Bild + Masse.
  let info = "";
  try {
    const r = await fetch(url);
    if (!r.ok) { skip++; console.log(`✗ ${e.date} ${e.title} — Endpoint ${r.status}, übersprungen`); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    // PNG/JPEG-Masse grob auslesen.
    let w = "?", h = "?";
    if (buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") { w = buf.readUInt32BE(16); h = buf.readUInt32BE(20); }
    info = `${buf.length}B ${w}x${h}`;
  } catch { skip++; console.log(`✗ ${e.date} ${e.title} — Fetch-Fehler`); continue; }

  if (e.image_url === url) { skip++; console.log(`= ${e.date} ${e.title} — schon gesetzt`); continue; }
  console.log(`↻ ${e.date} ${e.title} — ${info}`);
  if (LIVE) {
    const { error } = await supabase.from("events").update({ image_url: url }).eq("id", e.id);
    if (error) { console.log(`   ✗ ${error.message}`); continue; }
    upd++;
  }
}
console.log(`\n${LIVE ? `Fertig: ${upd} aktualisiert, ${skip} unverändert.` : `DRY-RUN — ${skip} unverändert. Mit --live anwenden.`}`);
