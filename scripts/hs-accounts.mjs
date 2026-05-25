// Lists every HubSpot account the logged-in identity can access.
// Reuses the .playwright-hubspot/ session created by hs-inspect.mjs.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PROFILE = join(ROOT, ".playwright-hubspot");
const SHOTS = join(ROOT, "scripts", "hs-shots");
mkdirSync(SHOTS, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const text = async (p) => (await p.evaluate(() => document.body?.innerText ?? "").catch(() => "")).replace(/\n{2,}/g, "\n").trim();

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  viewport: { width: 1440, height: 900 },
  locale: "de-CH",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const out = {};

// 1) EU-regional account list
log("→ app-eu1 myaccounts…");
await page.goto("https://app-eu1.hubspot.com/myaccounts-beta", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(9000);
out.myaccountsUrl = page.url();
await page.screenshot({ path: join(SHOTS, "05-myaccounts.png") }).catch(() => {});
out.myaccountsText = await text(page);
log("url:", out.myaccountsUrl);

// 2) in-app account switcher menu (top-right)
log("→ opening in-app account menu…");
await page.goto("https://app-eu1.hubspot.com/developer-overview/146284992", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(7000);
for (const sel of [
  'button[data-test-id="account-menu"]',
  '[data-test-id="navAccount"]',
  'button:has-text("SportNexus")',
  'header button:has-text("SportNexus")',
]) {
  try {
    const el = page.locator(sel).first();
    if (await el.count()) { await el.click({ timeout: 4000 }); log("clicked:", sel); break; }
  } catch { /* try next */ }
}
await page.waitForTimeout(4000);
await page.screenshot({ path: join(SHOTS, "06-account-menu.png") }).catch(() => {});
out.accountMenuText = await text(page);

writeFileSync(join(ROOT, "scripts", "hs-accounts.json"), JSON.stringify(out, null, 2));
log("myaccounts body:\n" + out.myaccountsText.slice(0, 2000));
log("DONE");
await page.waitForTimeout(1000);
await ctx.close();
