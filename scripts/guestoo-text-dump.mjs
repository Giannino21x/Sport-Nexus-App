// Zeigt die Text-/Programm-Inhalte eines öffentlichen Guestoo-Events.
const id = process.argv[2] ?? "fcfb4fe4-daee-4ff9-97b5-9bc5c88c1179";
const r = await fetch(`https://app.guestoo.de/proxy/api/public/events/${id}?lang=de&forceLang=true`, { headers: { Accept: "application/json" } });
const j = await r.json();
const strip = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
for (const k of ["displayName", "subTitle", "introText", "description", "galleryIntroText"]) {
  console.log(`\n## ${k}:\n${strip(j[k]).slice(0, 600) || "(leer)"}`);
}
console.log(`\n## sections (${(j.sections ?? []).length}):`);
for (const s of j.sections ?? []) console.log(`  - [${s.type ?? "?"}] ${strip(s.title)} | ${strip(s.text).slice(0, 200)}`);
console.log(`\n## address:`, JSON.stringify(j.address));
