// Generate seed_members.sql from lib/data.ts
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataTs = readFileSync(resolve(__dirname, "../../lib/data.ts"), "utf8");

// Extract MEMBERS array literal
const match = dataTs.match(/export const MEMBERS: Member\[\] = \[([\s\S]*?)\n\];/);
if (!match) throw new Error("Could not locate MEMBERS array in lib/data.ts");
const arrayBody = "[" + match[1] + "]";

// Convert unquoted keys to JSON-safe form + strip trailing commas.
const jsonish = arrayBody
  .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3')
  .replace(/,(\s*[\]}])/g, "$1");
const members = JSON.parse(jsonish);

const esc = (s) => (s == null ? "" : String(s).replace(/'/g, "''"));
const parseSince = (s) => {
  // "01.01.2026" -> "2026-01-01"
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const pgArray = (arr) => "ARRAY[" + arr.map((x) => `'${esc(x)}'`).join(",") + "]::text[]";

const rows = members.map((m) => {
  const since = parseSince(m.since);
  return `('${esc(m.id)}','${esc(m.first)}','${esc(m.last)}','${esc(m.company)}','${esc(m.role)}','${esc(m.extra)}','${esc(m.branch)}','${esc(m.sub)}','${esc(m.work)}','${esc(m.home)}','${esc(m.offer)}','${esc(m.search)}',${pgArray(m.sports)},${since ? `'${since}'::date` : "NULL"},'${esc(m.email)}','${esc(m.mobile)}','${esc(m.web)}','${esc(m.bio)}','${esc(m.color)}')`;
});

const sql = `-- Generated from lib/data.ts

insert into public.members (slug, first, last, company, role, extra, branch, sub, work, home, offer, search, sports, since, email, mobile, web, bio, color)
values
${rows.join(",\n")}
on conflict (slug) do update set
  first = excluded.first,
  last = excluded.last,
  company = excluded.company,
  role = excluded.role,
  extra = excluded.extra,
  branch = excluded.branch,
  sub = excluded.sub,
  work = excluded.work,
  home = excluded.home,
  offer = excluded.offer,
  search = excluded.search,
  sports = excluded.sports,
  since = excluded.since,
  email = excluded.email,
  mobile = excluded.mobile,
  web = excluded.web,
  bio = excluded.bio,
  color = excluded.color;
`;

writeFileSync(resolve(__dirname, "seed_members.sql"), sql);
console.log(`Wrote seed_members.sql with ${members.length} members.`);
