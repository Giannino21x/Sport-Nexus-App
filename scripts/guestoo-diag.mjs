// Vergleicht für jedes upcoming-Event: aktuelles Guestoo `image`/`bgImage`
// (Asset-ID + originalFileName) vs. die in der DB gespeicherte image_url.
// Zeigt, ob neu hochgeladene Bilder (neue Asset-ID) noch nicht übernommen sind.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const BASE = "https://app.guestoo.de";
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const assetId = (u) => u ? (u.split("/proxy/api/asset/")[1] ?? "").split(".")[0].slice(0, 8) : "—";

const res = await fetch(`${BASE}/proxy/api/events/search`, {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json", Cookie: env.GUESTOO_COOKIE_HEADER, Origin: BASE, Referer: `${BASE}/dashboard`, "X-XSRF-TOKEN": env.GUESTOO_XSRF_TOKEN },
  body: JSON.stringify({ paging: { currentPage: 0, pages: [], perPage: 500, sort: "date" }, tags: [], campaigns: [], visibilities: [], archivedFilter: "SHOW_ALL" }),
});
if (!res.ok) { console.error(`Guestoo ${res.status} — Session evtl. abgelaufen.`); process.exit(1); }
const byId = new Map((await res.json()).items.map((g) => [g.id, g]));

const { data: events } = await supabase.from("events").select("date,title,image_url,guestoo_id").eq("status", "upcoming").order("date");
for (const e of events) {
  const g = byId.get(e.guestoo_id);
  console.log(`\n${e.date}  ${e.title}`);
  console.log(`  DB image_url asset : ${assetId(e.image_url)}`);
  if (!g) { console.log("  (nicht in Guestoo-Suche gefunden)"); continue; }
  console.log(`  Guestoo image      : ${assetId(g.image?.defaultImagePath)}  (${g.image?.originalFileName ?? "—"})`);
  // bgImage via öffentlichem Endpoint (liefert bgImage + image).
  try {
    const pr = await fetch(`${BASE}/proxy/api/public/events/${e.guestoo_id}?lang=de&forceLang=true`, { headers: { Accept: "application/json" } });
    if (pr.ok) {
      const pj = await pr.json();
      console.log(`  Guestoo bgImage    : ${assetId(pj.bgImage?.defaultImagePath)}  (${pj.bgImage?.originalFileName ?? "—"})`);
      console.log(`  Guestoo public img : ${assetId(pj.image?.defaultImagePath)}  (${pj.image?.originalFileName ?? "—"})`);
    } else {
      console.log(`  (public endpoint ${pr.status})`);
    }
  } catch { console.log("  (public endpoint Fehler)"); }
}
