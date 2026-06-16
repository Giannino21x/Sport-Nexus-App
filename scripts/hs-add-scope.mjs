// Ergänzt den Scope crm.objects.companies.read an der bestehenden privaten App
// „SportNexus Onboarding" (für Firmen-Nachladen via Associations).

import { chromium } from "playwright";
import { join } from "node:path";

const ROOT = process.cwd();
const PORTAL = "146284992";
const APP_NAME = "SportNexus Onboarding";
const SCOPE = "crm.objects.companies.read";
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const ctx = await chromium.launchPersistentContext(join(ROOT, ".playwright-hubspot"), {
  headless: true,
  viewport: { width: 1366, height: 900 },
  locale: "de-CH",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const shoot = async (n) => { await page.screenshot({ path: join(ROOT, "scripts", `_hs-${n}.png`), fullPage: true }); log("→ _hs-" + n + ".png"); };

log("→ Alte-Apps-Seite…");
await page.goto(`https://app-eu1.hubspot.com/legacy-apps/${PORTAL}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(7000);

await page.getByText(APP_NAME, { exact: true }).first().click().catch(() => {});
await page.waitForTimeout(6000);
log("App geöffnet:", page.url());

// „App bearbeiten".
const edit = page.getByRole("button", { name: /App bearbeiten/i }).first();
if (await edit.count()) { await edit.click().catch(() => {}); await page.waitForTimeout(6000); log("Bearbeiten geöffnet:", page.url()); }

// Tab „Bereiche".
await page.getByText("Bereiche", { exact: true }).first().click().catch(() => {});
await page.waitForTimeout(4000);

// „Neuen Bereich hinzufügen".
await page.getByRole("button", { name: /Neuen Bereich hinzufügen/i }).first().click().catch(() => {});
await page.waitForTimeout(4000);

// Suchen + anhaken.
const search = page.getByPlaceholder(/Bereich suchen/i).first();
if (await search.count()) { await search.fill(SCOPE); await page.waitForTimeout(2500); }
const cb = page.locator('input[type="checkbox"]').last();
if (await cb.count()) { await cb.check({ force: true }).catch(() => {}); await page.waitForTimeout(1000); log("Checkbox:", await cb.isChecked().catch(() => "?")); }
await page.getByRole("button", { name: /Aktualisieren/i }).first().click().catch(() => {});
await page.waitForTimeout(3000);
await shoot("scope-added");

// Speichern: Button oben rechts heisst „Änderungen übernehmen".
const save = page.getByRole("button", { name: /Änderungen übernehmen/i }).first();
if ((await save.count()) && (await save.isVisible().catch(() => false))) {
  await save.click().catch(() => {});
  log("'Änderungen übernehmen' geklickt.");
  await page.waitForTimeout(4000);
} else {
  log("⚠ 'Änderungen übernehmen' nicht gefunden.");
}
// Mögliche Bestätigung (Token bleibt gleich).
for (const re of [/Mit dem .* fortfahren/i, /Änderungen übernehmen/i, /Bestätigen/i, /Fortfahren/i, /^Speichern$/i]) {
  const b = page.getByRole("button", { name: re }).last();
  if ((await b.count()) && (await b.isVisible().catch(() => false))) { await b.click().catch(() => {}); await page.waitForTimeout(4000); log("Bestätigt:", re.source); break; }
}
await page.waitForTimeout(4000);
await shoot("scope-saved");
log("Endzustand-URL:", page.url());

await ctx.close();
