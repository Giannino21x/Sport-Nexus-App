import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "scripts", "guestoo-out");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  storageState: ".playwright-storage.json",
  viewport: { width: 1400, height: 900 },
});
const page = await ctx.newPage();

const requests = [];
page.on("request", (req) => {
  const url = req.url();
  if (!/guestoo\.de/.test(url)) return;
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ico)(\?|$)/.test(url)) return;
  requests.push({ url, method: req.method(), postData: req.postData()?.slice(0, 800) ?? null });
});
page.on("response", async (res) => {
  const url = res.url();
  if (!/guestoo\.de/.test(url)) return;
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ico)(\?|$)/.test(url)) return;
  const reqEntry = [...requests].reverse().find((r) => r.url === url && !r.responseStatus);
  if (!reqEntry) return;
  reqEntry.responseStatus = res.status();
  reqEntry.responseContentType = res.headers()["content-type"] || "";
  try { reqEntry.responseBodyPreview = (await res.text()).slice(0, 3000); } catch {}
});

const visit = async (url, label) => {
  console.log(`→ ${label}: ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 }).catch((e) => console.log(`  err: ${e.message.slice(0, 80)}`));
  await page.waitForTimeout(5000);
};

// Event-IDs aus früherem Dashboard-Trace
const eventIds = [
  "1f7fc1ce-c319-4320-9435-3fe070f574a7", // 9. Lunch
  "521db260-ad7d-4a28-ba6a-dcd4adc47a83", // Coffee Connect ZH
];

await visit("https://app.guestoo.de/dashboard", "Dashboard");

// Events-Liste mit verschiedenen Routen probieren
for (const path of ["/agency/event", "/agency/event/list", "/event/list", "/events", "/agency/events"]) {
  await visit(`https://app.guestoo.de${path}`, `Events: ${path}`);
}

// Direkt Event-Detail
for (const id of eventIds) {
  for (const tmpl of [
    `/agency/event/${id}`,
    `/agency/event/${id}/visitors`,
    `/agency/event/${id}/visitor`,
    `/event/${id}`,
    `/event/${id}/visitors`,
  ]) {
    await visit(`https://app.guestoo.de${tmpl}`, `Detail: ${tmpl}`);
  }
}

// Visitors-Adressbuch
for (const path of ["/agency/visitor", "/agency/visitor/list", "/agency/visitors", "/visitor/list"]) {
  await visit(`https://app.guestoo.de${path}`, `Visitors: ${path}`);
}

console.log(`\nTotal ${requests.length} requests captured`);

writeFileSync(join(OUT, "network-trace2.json"), JSON.stringify(requests, null, 2));

const apiCalls = requests.filter((r) => /\/proxy\//.test(r.url));
writeFileSync(join(OUT, "network-trace2-api.json"), JSON.stringify(apiCalls, null, 2));

console.log("\n=== Unique API endpoints (hit) ===");
const grouped = new Map();
for (const c of apiCalls) {
  const u = new URL(c.url);
  const key = `${c.method} ${u.pathname}`;
  if (!grouped.has(key)) grouped.set(key, c.responseStatus);
}
[...grouped.entries()].sort().forEach(([k, status]) => console.log(`${String(status).padStart(3)}  ${k}`));

await browser.close();
