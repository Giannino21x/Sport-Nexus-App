// Fängt den echten Properties-API-Call der HubSpot-Settings-Seite ab
// (Network-Sniffing statt Endpoint-Raten) und speichert die JSON-Antwort.

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PORTAL = "146284992";
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const ctx = await chromium.launchPersistentContext(join(ROOT, ".playwright-hubspot"), {
  headless: false,
  viewport: { width: 1280, height: 800 },
  locale: "de-CH",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

const captures = [];
page.on("response", async (res) => {
  try {
    const url = res.url();
    if (!/propert/i.test(url)) return;
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("json") || !res.ok()) return;
    const body = await res.json().catch(() => null);
    if (!body) return;
    const size = JSON.stringify(body).length;
    captures.push({ url, size, body });
    log(`  capture: ${size.toString().padStart(8)}B  ${url.slice(0, 110)}`);
  } catch { /* ignorieren */ }
});

log("→ Properties-Seite laden…");
await page.goto(`https://app-eu1.hubspot.com/property-settings/${PORTAL}/properties?type=0-1`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(15000);

if (!captures.length) {
  log("✗ Keine Properties-Responses gesehen. URL:", page.url());
  await ctx.close();
  process.exit(1);
}

// Grösste JSON-Antwort = vermutlich die volle Property-Liste.
captures.sort((a, b) => b.size - a.size);
writeFileSync(join(ROOT, "scripts", "hs-props-capture.json"), JSON.stringify(captures[0], null, 2));
log(`✓ Grösste Antwort (${captures[0].size}B) von ${captures[0].url}`);
log("→ scripts/hs-props-capture.json");
await ctx.close();
