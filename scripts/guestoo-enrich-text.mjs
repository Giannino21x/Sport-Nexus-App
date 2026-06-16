// Reichert importierte Events mit echtem Guestoo-Inhalt an: Intro-Text →
// long_description ("Über diesen Event"), Programm → agenda ("Ablauf").
// Nur Events mit LEEREM long_description (überschreibt nichts Kuratiertes).
// DRY-RUN default, --live schreibt.

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

const strip = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
// Guestoo-spezifische Schluss-Floskeln abschneiden (gelten in unserer App nicht).
const trimBoiler = (s) => s.replace(/\s*(Bei Fragen|Verbindliche Anmeldung|Premium Partner)[\s\S]*$/i, "").trim();

function parse(descRaw) {
  const desc = trimBoiler(strip(descRaw));
  // Programmzeilen: "HH:MM - (HH:MM|open end) [Uhr]: Label"
  const re = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2}|open end)\s*(?:Uhr)?\s*:\s*([\s\S]*?)(?=\d{1,2}:\d{2}\s*[-–]|$)/g;
  const agenda = [];
  let m;
  while ((m = re.exec(desc)) !== null) {
    const label = m[3].trim().replace(/[;,\s]+$/, "");
    if (label) agenda.push({ t: `${m[1]}–${m[2]}`, l: label });
  }
  // Intro = alles vor dem Programm-Block / dem „Programm"-Hinweis.
  let intro = desc;
  const pIdx = desc.search(/Nachfolgend findest du das Programm|^\s*\d{1,2}:\d{2}\s*[-–]/m);
  if (pIdx > 0) intro = desc.slice(0, pIdx).replace(/Nachfolgend findest du das Programm:?\s*$/i, "").trim();
  const firstTime = intro.search(/\d{1,2}:\d{2}\s*[-–]/);
  if (firstTime > 0) intro = intro.slice(0, firstTime).trim();
  // Trailing „Programm:" / „Nachfolgend findest du das Programm:" entfernen.
  intro = intro.replace(/\s*(Nachfolgend findest du das Programm|Programm)\s*:?\s*$/i, "").trim();
  return { intro: intro || desc, agenda };
}

const { data: events } = await supabase
  .from("events").select("id,date,title,long_description,agenda,guestoo_id")
  .not("guestoo_id", "is", null).order("date");

console.log(`=== Event-Text anreichern (${LIVE ? "LIVE" : "DRY-RUN"}) ===\n`);
let upd = 0, skip = 0;
for (const e of events) {
  if (e.long_description && e.long_description.trim()) { skip++; console.log(`= ${e.date} ${e.title} — hat schon Langtext`); continue; }
  const r = await fetch(`${BASE}/proxy/api/public/events/${e.guestoo_id}?lang=de&forceLang=true`, { headers: { Accept: "application/json" } });
  if (!r.ok) { skip++; console.log(`✗ ${e.date} ${e.title} — public ${r.status}`); continue; }
  const j = await r.json();
  const { intro, agenda } = parse(j.description);
  if (!intro) { skip++; console.log(`✗ ${e.date} ${e.title} — kein Beschreibungstext`); continue; }

  console.log(`↻ ${e.date} ${e.title}`);
  console.log(`    Intro: ${intro.slice(0, 140)}${intro.length > 140 ? "…" : ""}`);
  console.log(`    Agenda: ${agenda.length ? agenda.map((a) => a.t).join(", ") : "—"}`);

  if (LIVE) {
    const patch = { long_description: intro };
    if (agenda.length && (!e.agenda || e.agenda.length === 0)) patch.agenda = agenda;
    const { error } = await supabase.from("events").update(patch).eq("id", e.id);
    if (error) { console.log(`    ✗ ${error.message}`); continue; }
    upd++;
  }
}
console.log(`\n${LIVE ? `Fertig: ${upd} angereichert, ${skip} übersprungen.` : `DRY-RUN — ${skip} übersprungen. Mit --live anwenden.`}`);
