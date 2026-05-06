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
  requests.push({
    url, method: req.method(), resourceType: req.resourceType(),
    headers: Object.fromEntries(Object.entries(req.headers()).filter(([k]) => !/cookie|sec-/i.test(k))),
    postData: req.postData()?.slice(0, 800) ?? null,
  });
});
page.on("response", async (res) => {
  const url = res.url();
  if (!/guestoo\.de/.test(url)) return;
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ico)(\?|$)/.test(url)) return;
  const reqEntry = [...requests].reverse().find((r) => r.url === url && !r.responseStatus);
  if (!reqEntry) return;
  reqEntry.responseStatus = res.status();
  reqEntry.responseContentType = res.headers()["content-type"] || "";
  try {
    const text = await res.text();
    reqEntry.responseBodyPreview = text.slice(0, 2000);
    reqEntry.responseLength = text.length;
  } catch {}
});

const visit = async (url, label) => {
  console.log(`→ ${label}: ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 }).catch((e) => {
    console.log(`  nav error: ${e.message.slice(0, 100)}`);
  });
  await page.waitForTimeout(4000);
};

await visit("https://app.guestoo.de/dashboard", "Dashboard");
await visit("https://app.guestoo.de/agency/events", "Events-Liste");

// Versuche, das erste Event zu öffnen — das löst Visitor/Detail-API-Calls aus
const firstEventLink = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('a[href*="/event/"], a[ui-sref*="event"]'));
  for (const a of links) {
    const href = a.getAttribute("href") || "";
    const r = a.getBoundingClientRect();
    if (r.width > 0 && /\/event\/[a-f0-9-]{20,}/.test(href)) return href;
  }
  return null;
});
console.log("→ Erstes Event:", firstEventLink);
if (firstEventLink) {
  const fullUrl = firstEventLink.startsWith("http") ? firstEventLink : `https://app.guestoo.de${firstEventLink}`;
  await visit(fullUrl, "Event-Detail");
  // Visitor-Tab versuchen
  await visit(fullUrl.replace(/\/?$/, "") + "/visitors", "Visitors-Tab");
}

// Adressbuch (Gäste)
await visit("https://app.guestoo.de/agency/addressbook", "Adressbuch");
await visit("https://app.guestoo.de/agency/addressBook", "Adressbuch alt");

console.log(`\nCaptured ${requests.length} requests total.`);

writeFileSync(join(OUT, "network-trace.json"), JSON.stringify(requests, null, 2));

const apiCalls = requests.filter((r) => /\/api\//.test(r.url) || /\/proxy\//.test(r.url));
writeFileSync(join(OUT, "network-trace-api.json"), JSON.stringify(apiCalls, null, 2));

console.log("\n=== API-Calls (nach Pfad gruppiert) ===");
const grouped = new Map();
for (const c of apiCalls) {
  const u = new URL(c.url);
  const key = `${c.method} ${u.pathname}`;
  if (!grouped.has(key)) grouped.set(key, c.responseStatus);
}
[...grouped.entries()].sort().forEach(([k, status]) => console.log(`${String(status).padStart(3)}  ${k}`));

await browser.close();
