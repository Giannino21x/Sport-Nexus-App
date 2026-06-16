// Prüft, ob die in events.image_url gespeicherten Bilder OHNE Login ladbar sind
// (so wie sie der Browser eines Members lädt). Zeigt Status, Content-Type, Größe.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await supabase.from("events").select("date, title, image_url").order("date");
for (const e of data) {
  if (!e.image_url) { console.log(`— ${e.date} ${e.title}: KEIN Bild`); continue; }
  try {
    const r = await fetch(e.image_url, { redirect: "manual" });
    const buf = Buffer.from(await r.arrayBuffer());
    const md5 = createHash("md5").update(buf).digest("hex").slice(0, 10);
    console.log(`${r.status}  md5=${md5}  ${buf.length}B  ${e.date} ${e.title}`);
  } catch (err) {
    console.log(`ERR  ${e.date} ${e.title}: ${err.message}`);
  }
}
