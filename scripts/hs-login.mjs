// Erneuert die gespeicherte HubSpot-Browser-Session (.playwright-hubspot).
// Öffnet ein SICHTBARES Browserfenster auf der HubSpot-Login-Seite — melde
// dich dort an (Passkey / „Mit Google anmelden" etc.). Sobald du im Portal
// bist, wird die Session gespeichert und das Fenster schliesst automatisch.
//
//   node scripts/hs-login.mjs
//
// Danach kann ich (Claude) HubSpot wieder automatisiert bedienen — bzw. das
// Onboarding-Skript nutzt den anschliessend erzeugten Private App Token.

import { chromium } from "playwright";
import { join } from "node:path";

const ROOT = process.cwd();
const PORTAL = "146284992";
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const ctx = await chromium.launchPersistentContext(join(ROOT, ".playwright-hubspot"), {
  headless: false,
  viewport: { width: 1366, height: 900 },
  locale: "de-CH",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

log("→ Öffne HubSpot. Bitte im Fenster anmelden (Passkey/Google).");
await page.goto(`https://app-eu1.hubspot.com/private-apps/${PORTAL}`, { waitUntil: "domcontentloaded" });

// Bis zu 4 Minuten auf erfolgreichen Login warten (URL nicht mehr /login).
const deadline = Date.now() + 4 * 60 * 1000;
let loggedIn = false;
while (Date.now() < deadline) {
  await page.waitForTimeout(2000);
  if (!/\/login/i.test(page.url())) { loggedIn = true; break; }
}

if (loggedIn) {
  await page.waitForTimeout(3000);
  log("✓ Eingeloggt — Session gespeichert. URL:", page.url());
} else {
  log("✗ Timeout — kein Login erkannt. Bitte erneut versuchen.");
}
await ctx.close();
process.exit(loggedIn ? 0 : 1);
