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

// Erfolg gilt ERST, wenn wir wieder im HubSpot-Portal sind (app-eu1) und NICHT
// auf einer Login-Seite. Wichtig: die Google-SSO-Seite (accounts.google.com)
// darf NICHT als Erfolg zählen — sonst schliesst das Fenster mitten im Login.
const onPortal = () => {
  const u = page.url();
  return u.startsWith("https://app-eu1.hubspot.com/") && !/\/login/i.test(u);
};
const deadline = Date.now() + 5 * 60 * 1000;
let loggedIn = false;
let closed = false;
while (Date.now() < deadline) {
  try {
    await page.waitForTimeout(2000);
  } catch {
    closed = true;
    break;
  }
  if (page.isClosed()) { closed = true; break; }
  if (onPortal()) { loggedIn = true; break; }
}
if (closed) {
  log("✗ Fenster wurde geschlossen, bevor der Login erkannt wurde. Bitte erneut starten und das Fenster offen lassen.");
}

if (loggedIn) {
  await page.waitForTimeout(3000);
  log("✓ Eingeloggt — Session gespeichert. URL:", page.url());
} else {
  log("✗ Timeout — kein Login erkannt. Bitte erneut versuchen.");
}
await ctx.close();
process.exit(loggedIn ? 0 : 1);
