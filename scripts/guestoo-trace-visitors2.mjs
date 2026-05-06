import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "scripts", "guestoo-out");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: ".playwright-storage.json", viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

const requests = [];
page.on("request", (req) => {
  const url = req.url();
  if (!/guestoo\.de/.test(url)) return;
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ico)(\?|$)/.test(url)) return;
  requests.push({ url, method: req.method(), postData: req.postData()?.slice(0, 1500) ?? null });
});
page.on("response", async (res) => {
  const url = res.url();
  if (!/guestoo\.de/.test(url)) return;
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ico)(\?|$)/.test(url)) return;
  const reqEntry = [...requests].reverse().find((r) => r.url === url && !r.responseStatus);
  if (!reqEntry) return;
  reqEntry.responseStatus = res.status();
  reqEntry.responseContentType = res.headers()["content-type"] || "";
  try { reqEntry.responseBodyPreview = (await res.text()).slice(0, 4000); } catch {}
});

const visit = async (url, label) => {
  console.log(`→ ${label}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 }).catch((e) => console.log(`  err: ${e.message.slice(0, 80)}`));
  await page.waitForTimeout(5000);
};

const eventId = "1f7fc1ce-c319-4320-9435-3fe070f574a7";

await visit("https://app.guestoo.de/dashboard", "warm-up");

// Probiere alle plausiblen Tabs
const tabs = ["guests", "visitors", "registrations", "list", "addressbook", "anmeldungen", "checkin", "tickets"];
for (const t of tabs) {
  await visit(`https://app.guestoo.de/events/${eventId}/${t}`, `tab: ${t}`);
}

// Adressbuch global probieren mit Pfad ohne /agency
for (const p of ["/visitors", "/addressbook", "/guests"]) {
  await visit(`https://app.guestoo.de${p}`, `global: ${p}`);
}

writeFileSync(join(OUT, "trace-visitors2.json"), JSON.stringify(requests, null, 2));

const apiCalls = requests.filter((r) => /\/proxy\//.test(r.url));
const unique = new Map();
for (const c of apiCalls) {
  const u = new URL(c.url);
  const key = `${c.method} ${u.pathname}${u.search.slice(0, 100)}`;
  if (!unique.has(key)) unique.set(key, c);
}
console.log("\n=== Unique API endpoints ===");
[...unique.entries()].sort().forEach(([k, c]) => {
  console.log(`${String(c.responseStatus).padStart(3)}  ${k}`);
  if (c.postData) console.log(`     POST: ${c.postData.slice(0, 200)}`);
});

await browser.close();
