// Wendet eine einzelne Migration via Supabase Management API direkt auf die
// Production-DB an — Workaround, weil das lokale Migration-Tracking mit dem
// Remote auseinander läuft (Schema existiert, supabase_migrations-Records
// fehlen). Diese Methode umgeht das vollständig.
import { readFileSync } from "node:fs";
import { argv } from "node:process";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);
const PAT = env.SUPABASE_ACCESS_TOKEN;
const REF = "zufeezcdzikwiutksyou";
if (!PAT) { console.error("SUPABASE_ACCESS_TOKEN missing"); process.exit(1); }

const file = argv[2];
if (!file) { console.error("Usage: node scripts/apply-migration.mjs <migration.sql>"); process.exit(1); }

const sql = readFileSync(file, "utf8");
console.log(`Applying ${file} (${sql.length} chars) to project ${REF}...`);

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${PAT}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}
console.log("✓ Applied. Response:");
console.log(text.slice(0, 1000));
