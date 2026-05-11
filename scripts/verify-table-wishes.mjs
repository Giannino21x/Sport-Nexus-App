import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);
const PAT = env.SUPABASE_ACCESS_TOKEN;
const REF = "zufeezcdzikwiutksyou";

const q = `
select
  (select count(*) from information_schema.tables where table_schema='public' and table_name='table_wishes') as table_exists,
  (select count(*) from pg_policies where schemaname='public' and tablename='table_wishes') as policy_count;
`;
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: q }),
});
console.log(await res.text());
