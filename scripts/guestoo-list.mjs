// Listet Guestoo-Events und markiert, welche schon in der App-events-Tabelle
// sind (per guestoo_id). Zeigt so die neuen, noch nicht importierten Events.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const res = await fetch("https://app.guestoo.de/proxy/api/events/search", {
  method: "POST",
  headers: {
    Accept: "application/json", "Content-Type": "application/json",
    Cookie: env.GUESTOO_COOKIE_HEADER, Origin: "https://app.guestoo.de",
    Referer: "https://app.guestoo.de/dashboard", "X-XSRF-TOKEN": env.GUESTOO_XSRF_TOKEN,
  },
  body: JSON.stringify({ paging: { currentPage: 0, pages: [], perPage: 500, sort: "date" }, tags: [], campaigns: [], visibilities: [], archivedFilter: "SHOW_ALL" }),
});
if (!res.ok) { console.error(`Guestoo ${res.status}: ${await res.text()}`); process.exit(1); }
const items = (await res.json()).items;

const { data: dbEvents } = await supabase.from("events").select("guestoo_id");
const known = new Set((dbEvents ?? []).map((e) => e.guestoo_id).filter(Boolean));

const today = "2026-06-16";
console.log(`Guestoo: ${items.length} Events | DB kennt ${known.size} guestoo_ids\n`);
const sorted = items.slice().sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
for (const g of sorted) {
  const d = new Date(g.startDate).toISOString().slice(0, 10);
  const inDb = known.has(g.id);
  const upcoming = d >= today;
  const mark = inDb ? "✓ in DB" : (upcoming ? "★ NEU (nicht in DB)" : "· alt, nicht in DB");
  console.log(`${mark}  ${d}  ${g.displayName}  [${g.address?.city ?? "?"}]  id=${g.id}`);
}
