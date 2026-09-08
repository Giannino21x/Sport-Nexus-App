// Tab-Wechsel-Benchmark im iPhone-Profil (Demo-Modus, kein Login nötig).
//
//   node scripts/perf-tabs.mjs                       # gegen Produktion
//   BASE=http://localhost:3000 node scripts/perf-tabs.mjs   # gegen `next start`
//   CPU=6 node scripts/perf-tabs.mjs                 # stärkere CPU-Drossel
//
// Misst pro Tab die Zeit bis der Seitentitel steht, die Long-Tasks (Main-
// Thread-Blockaden > 50 ms) und die übertragenen Bytes (davon Bilder). Drei
// Durchgänge: der erste ist "kalt" (Bilder, RSC-Payloads), die weiteren
// zeigen, wie sich das Hin-und-Her zwischen Tabs anfühlt. Nutzt dieselbe
// Navigation wie die native Tab-Bar (window.__nativeNavigate), sonst die
// CSS-Tab-Bar. Demo-Modus heisst: keine Supabase-Roundtrips — die Daten-
// Schicht (lib/hooks.ts) misst das hier also NICHT, Bilder und Rendering schon.
import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "https://sport-nexus-app.vercel.app";
const CPU = Number(process.env.CPU || 4);
const EXPECT = { dashboard: "Gute", directory: "Mitglied", events: "Event", messages: "Nachrichten", profile: "Profil" };
const ORDER = ["directory", "events", "messages", "profile", "dashboard"];

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 14 Pro"], locale: "de-CH" });
await ctx.addCookies([{ name: "sn-mode", value: "demo", domain: new URL(BASE).hostname, path: "/" }]);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
await cdp.send("Network.enable");

const bytes = { total: 0, img: 0 };
const reqById = new Map();
const notFound = new Set();
cdp.on("Network.requestWillBeSent", (e) => reqById.set(e.requestId, e.type));
cdp.on("Network.loadingFinished", (e) => {
  bytes.total += e.encodedDataLength;
  if (reqById.get(e.requestId) === "Image") bytes.img += e.encodedDataLength;
});
cdp.on("Network.responseReceived", (e) => { if (e.response.status === 404) notFound.add(e.response.url); });

const t0 = Date.now();
await page.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelector(".page-header h1")?.textContent?.includes("Gute"), null, { timeout: 30000 });
console.log(`COLD LOAD: content after ${Date.now() - t0} ms, ${Math.round(bytes.total / 1024)} KB`);
await page.waitForTimeout(1500);

await page.evaluate(() => {
  window.__lt = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: "longtask" });
});

async function go(tab) {
  const b0 = bytes.total, i0 = bytes.img;
  await page.evaluate(() => { window.__lt.length = 0; });
  const start = Date.now();
  const native = await page.evaluate((r) => {
    if (typeof window.__nativeNavigate === "function") { window.__nativeNavigate(r); return true; }
    return false;
  }, tab);
  if (!native) await page.click(`.tabbar a[href="/${tab}"]`, { force: true });
  await page.waitForFunction((txt) => document.querySelector(".page-header h1")?.textContent?.includes(txt), EXPECT[tab], { timeout: 20000 });
  const ms = Date.now() - start;
  await page.waitForTimeout(1200);
  const lt = await page.evaluate(() => window.__lt.slice());
  const kb = Math.round((bytes.total - b0) / 1024);
  const img = Math.round((bytes.img - i0) / 1024);
  return `${tab}=${ms}ms lt${lt.reduce((a, b) => a + b, 0)}${kb ? ` ${kb}KB` : ""}${img ? `(img ${img})` : ""}`;
}

for (let pass = 1; pass <= 3; pass++) {
  const rows = [];
  for (const t of ORDER) rows.push(await go(t));
  console.log(`pass ${pass}:  ${rows.join("   ")}`);
}
if (notFound.size) console.log("404:", [...notFound].slice(0, 5).join("\n     "));
console.log(`TOTAL ${Math.round(bytes.total / 1024)} KB, davon Bilder ${Math.round(bytes.img / 1024)} KB`);
await browser.close();
