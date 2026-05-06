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
  requests.push({ url, method: req.method(), postData: req.postData()?.slice(0, 1000) ?? null });
});
page.on("response", async (res) => {
  const url = res.url();
  if (!/guestoo\.de/.test(url)) return;
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ico)(\?|$)/.test(url)) return;
  const reqEntry = [...requests].reverse().find((r) => r.url === url && !r.responseStatus);
  if (!reqEntry) return;
  reqEntry.responseStatus = res.status();
  reqEntry.responseContentType = res.headers()["content-type"] || "";
  try { reqEntry.responseBodyPreview = (await res.text()).slice(0, 3500); } catch {}
});

const visit = async (url, label) => {
  console.log(`→ ${label}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 }).catch((e) => console.log(`  err: ${e.message.slice(0, 80)}`));
  await page.waitForTimeout(5000);
};

await visit("https://app.guestoo.de/dashboard", "dashboard (warm-up)");

// Klicke auf den "Adressbuch" Link in der linken Sidebar
const beforeCount = requests.length;
console.log("→ Suche Adressbuch-Link …");
const found = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('a, [ui-sref], [ng-click]'));
  for (const a of links) {
    const t = (a.textContent ?? "").replace(/\s+/g, " ").trim();
    if (/^Adressbuch$/i.test(t)) {
      a.scrollIntoView();
      return { sref: a.getAttribute("ui-sref"), href: a.getAttribute("href"), text: t };
    }
  }
  return null;
});
console.log("Found:", found);
if (found) {
  await page.click('a:has-text("Adressbuch"), [ui-sref*="visitor"]:has-text("Adressbuch")', { timeout: 5_000 }).catch((e) => console.log("click err:", e.message.slice(0, 100)));
  await page.waitForTimeout(6000);
  console.log("URL nach Klick:", page.url());
}

// Auf einen Event in der Sidebar (oder im Dashboard) klicken, falls möglich
console.log("→ Versuche, einen Event aufzurufen via Klick …");
await visit("https://app.guestoo.de/dashboard", "back to dashboard");
await page.click('text=/SportNexus.*Lunch/i', { timeout: 5_000 }).catch((e) => console.log("event click err:", e.message.slice(0, 100)));
await page.waitForTimeout(5000);
console.log("URL nach Event-Klick:", page.url());

// Innerhalb des Events: such "Gäste" Tab/Link
console.log("→ Such Gäste/Visitors Tab …");
await page.click('text=/Gäste|Visitors|Anmeldungen/i', { timeout: 5_000 }).catch((e) => console.log("guests-tab err:", e.message.slice(0, 100)));
await page.waitForTimeout(5000);
console.log("URL final:", page.url());

console.log(`\nTotal ${requests.length} requests captured (${requests.length - beforeCount} after dashboard)`);

writeFileSync(join(OUT, "trace-visitors.json"), JSON.stringify(requests, null, 2));

const apiCalls = requests.filter((r) => /\/proxy\//.test(r.url));
const unique = new Map();
for (const c of apiCalls) {
  const u = new URL(c.url);
  const key = `${c.method} ${u.pathname}${u.search}`;
  if (!unique.has(key)) unique.set(key, c);
}
console.log("\n=== Unique API endpoints ===");
[...unique.entries()].sort().forEach(([k, c]) => {
  console.log(`${String(c.responseStatus).padStart(3)}  ${k}`);
  if (c.postData) console.log(`     POST: ${c.postData.slice(0, 200)}`);
});

await browser.close();
