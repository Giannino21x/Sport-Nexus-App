// Öffnet die bereits erstellte private App „SportNexus Onboarding", wechselt
// auf den Tab „Authentifizierung", zeigt den Zugriffstoken an, liest ihn aus
// und trägt ihn als HUBSPOT_TOKEN in .env.local ein.

import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PORTAL = "146284992";
const APP_NAME = "SportNexus Onboarding";
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const ctx = await chromium.launchPersistentContext(join(ROOT, ".playwright-hubspot"), {
  headless: true,
  viewport: { width: 1366, height: 900 },
  locale: "de-CH",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

log("→ Alte-Apps-Seite laden…");
await page.goto(`https://app-eu1.hubspot.com/legacy-apps/${PORTAL}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(7000);

// App öffnen.
const appLink = page.getByText(APP_NAME, { exact: true }).first();
if (await appLink.count()) {
  await appLink.click().catch(() => {});
  await page.waitForTimeout(6000);
  log("App geöffnet. URL:", page.url());
}

// Tab „Authentifizierung".
const authTab = page.getByText("Authentifizierung", { exact: true }).first();
if (await authTab.count()) {
  await authTab.click().catch(() => {});
  await page.waitForTimeout(4000);
  log("Auf 'Authentifizierung'-Tab.");
}

// „Anzeigen" / „Token anzeigen" klicken (mehrere mögliche Labels).
for (const re of [/Token anzeigen/i, /^Anzeigen$/i, /einblenden/i, /Show token/i]) {
  const b = page.getByText(re).first();
  if ((await b.count()) && (await b.isVisible().catch(() => false))) {
    await b.click().catch(() => {});
    await page.waitForTimeout(2000);
    log("Token-Anzeige geklickt:", re.source);
    break;
  }
}
await page.waitForTimeout(1500);

const token = await page.evaluate(() => {
  const m = document.body.innerText.match(/pat-[a-z0-9]+-[a-z0-9-]{20,}/i);
  return m ? m[0] : null;
});

await page.screenshot({ path: join(ROOT, "scripts", "_hs-token.png"), fullPage: true });

if (token) {
  log("✓ TOKEN gefunden.");
  // In .env.local schreiben (vorhandenen Eintrag ersetzen, sonst anhängen).
  let env = readFileSync(".env.local", "utf8");
  if (/^HUBSPOT_TOKEN=.*$/m.test(env)) {
    env = env.replace(/^HUBSPOT_TOKEN=.*$/m, `HUBSPOT_TOKEN=${token}`);
  } else {
    env = env.replace(/\s*$/, "") + `\nHUBSPOT_TOKEN=${token}\n`;
  }
  writeFileSync(".env.local", env);
  log("✓ HUBSPOT_TOKEN in .env.local eingetragen.");
  log("   (Länge:", token.length, "Präfix:", token.slice(0, 12) + "…)");
} else {
  log("⚠ Kein Token gefunden — siehe scripts/_hs-token.png");
}

await ctx.close();
