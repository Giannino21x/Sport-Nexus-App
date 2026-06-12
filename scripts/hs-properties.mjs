// Prüft im SportNexus-HubSpot-Portal (146284992) die Kontakt-Properties für
// das App-Mapping: branche_dropdown + date_of_birth (Feedback 5).
// Nutzt die persistente Session in .playwright-hubspot/ — falls die abgelaufen
// ist, öffnet sich die Login-Seite und das Script wartet bis zu 4 Minuten auf
// den manuellen Login.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PROFILE = join(ROOT, ".playwright-hubspot");
const SHOTS = join(ROOT, "scripts", "hs-shots");
mkdirSync(SHOTS, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const text = async (p) => (await p.evaluate(() => document.body?.innerText ?? "").catch(() => "")).replace(/\n{2,}/g, "\n").trim();

const PORTAL = "146284992";
const PROPS_URL = `https://app-eu1.hubspot.com/property-settings/${PORTAL}/properties?type=0-1`;

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  viewport: { width: 1440, height: 900 },
  locale: "de-CH",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

log("→ Properties-Seite öffnen…");
await page.goto(PROPS_URL, { waitUntil: "domcontentloaded" }).catch(() => {});

// Robust warten: Login-Redirects passieren client-seitig und zeitversetzt.
// Wir pollen, bis die Properties-UI (Suchfeld) wirklich da ist; auf der
// Login-Seite warten wir auf den manuellen Login (bis zu 4 Minuten).
const deadline = Date.now() + 4 * 60 * 1000;
let ready = false;
while (Date.now() < deadline) {
  await page.waitForTimeout(3000);
  const url = page.url();
  if (/\/login/.test(url) || /accounts\.google\.com|google\.[a-z.]+\/signin/.test(url)) {
    log("…Login läuft — bitte im Automationsfenster anmelden (warte)…");
    continue;
  }
  if (!url.includes("/property-settings/")) {
    log("…Redirect auf", url.slice(0, 80), "→ zurück zur Properties-Seite…");
    await page.goto(PROPS_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
    continue;
  }
  if (await page.locator('input[type="search"], input[placeholder*="uchen"]').first().count()) {
    ready = true;
    break;
  }
  log("…Properties-Seite lädt…");
}
if (!ready) {
  log("✗ Properties-UI nicht erreichbar (Login fehlt oder Berechtigung fehlt). Letzte URL:", page.url());
  await page.screenshot({ path: join(SHOTS, "10-properties.png") }).catch(() => {});
  writeFileSync(join(ROOT, "scripts", "hs-properties.json"), JSON.stringify({ url: page.url(), pageText: await text(page) }, null, 2));
  await ctx.close();
  process.exit(1);
}
await page.waitForTimeout(3000);

const out = { url: page.url(), searches: {} };
await page.screenshot({ path: join(SHOTS, "10-properties.png") }).catch(() => {});
out.pageText = await text(page);

// In der Properties-Suche nach den beiden Feldern suchen.
for (const term of ["branche", "date_of_birth", "geburt"]) {
  try {
    const search = page.locator('input[type="search"], input[placeholder*="uchen"]').first();
    await search.click({ timeout: 8000 });
    await search.fill("");
    await search.fill(term);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: join(SHOTS, `11-search-${term}.png`) }).catch(() => {});
    out.searches[term] = await text(page);
    log(`Suche "${term}" erfasst.`);
  } catch (e) {
    out.searches[term] = `SUCHE FEHLGESCHLAGEN: ${e.message}`;
    log(`Suche "${term}" fehlgeschlagen:`, e.message);
  }
}

writeFileSync(join(ROOT, "scripts", "hs-properties.json"), JSON.stringify(out, null, 2));
log("DONE — Ergebnis in scripts/hs-properties.json + Screenshots 10/11-*.png");
await ctx.close();
