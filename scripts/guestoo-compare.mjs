// Vergleicht Supabase-Events mit Guestoo-Events Feld-für-Feld.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => {
    const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)];
  }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const guestooRes = await fetch("https://app.guestoo.de/proxy/api/events/search", {
  method: "POST",
  headers: {
    Accept: "application/json", "Content-Type": "application/json",
    Cookie: env.GUESTOO_COOKIE_HEADER, Origin: "https://app.guestoo.de",
    Referer: "https://app.guestoo.de/dashboard", "X-XSRF-TOKEN": env.GUESTOO_XSRF_TOKEN,
  },
  body: JSON.stringify({ paging: { currentPage: 0, perPage: 200, sort: "date" }, archivedFilter: "HIDE_ARCHIVED" }),
});
const guestooEvents = (await guestooRes.json()).items;

const { data: dbEvents } = await supabase
  .from("events")
  .select("id, title, subtitle, date, time, city, venue, address, guests, status, image_url, guestoo_id")
  .order("date", { ascending: true });

console.log(`\n${"=".repeat(120)}\nSPORT-NEXUS APP (Supabase) vs. GUESTOO\n${"=".repeat(120)}\n`);

for (const ev of dbEvents) {
  console.log(`\n— ${ev.title}${ev.subtitle ? ` · ${ev.subtitle}` : ""} (${ev.date})`);
  if (!ev.guestoo_id) { console.log("  [kein Guestoo-Mapping]"); continue; }
  const g = guestooEvents.find((x) => x.id === ev.guestoo_id);
  if (!g) { console.log("  [Guestoo-Event nicht gefunden]"); continue; }

  const gDate = new Date(g.startDate);
  const gDateStr = gDate.toISOString().slice(0, 10);
  const gTime = gDate.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
  const addr = g.address;
  const gAddrStr = addr ? `${addr.street ?? ""} ${addr.streetNumber ?? ""}, ${addr.postCode ?? ""} ${addr.city ?? ""}`.trim() : "(keine)";
  const gImg = g.image?.defaultImagePath ? `https://app.guestoo.de${g.image.defaultImagePath}` : null;

  const cmp = (label, ours, theirs) => {
    const ok = String(ours ?? "").trim() === String(theirs ?? "").trim();
    console.log(`  ${ok ? "✓" : "≠"} ${label.padEnd(15)} ours: ${JSON.stringify(ours)}  theirs: ${JSON.stringify(theirs)}`);
  };
  cmp("Datum", ev.date, gDateStr);
  cmp("Stadt", ev.city, addr?.city);
  cmp("Venue", ev.venue, addr?.locationName);
  cmp("maxGäste", ev.guests, g.maxVisitor);
  cmp("Anmeldungen", "—", g.statistic?.sumConfirmedVisitor);
  console.log(`    Adresse  ours: ${ev.address}  theirs: ${gAddrStr}`);
  console.log(`    Bild     ours: ${ev.image_url}  theirs: ${gImg}`);
}
