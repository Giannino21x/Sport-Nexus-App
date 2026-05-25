// HubSpot inspection via Playwright.
//
// Launches a headed Chromium with a *persistent* profile (.playwright-hubspot/).
// You log into HubSpot ONCE in the window that opens — the session is then saved
// to that profile and reused on later runs. After login the script walks the
// portal, takes screenshots into scripts/hs-shots/ and writes scripts/hs-report.json.
//
//   node scripts/hs-inspect.mjs
//
// The profile dir holds session cookies and is git-ignored.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PROFILE = join(ROOT, ".playwright-hubspot");
const SHOTS = join(ROOT, "scripts", "hs-shots");
mkdirSync(SHOTS, { recursive: true });

const t = () => new Date().toISOString().slice(11, 19);
const log = (...a) => console.log(t(), ...a);

const report = { startedAt: new Date().toISOString(), steps: [] };
const addStep = (s) => {
  report.steps.push(s);
  writeFileSync(join(ROOT, "scripts", "hs-report.json"), JSON.stringify(report, null, 2));
};

const hostOf = (u) => { try { return new URL(u).host; } catch { return ""; } };
const pathOf = (u) => { try { return new URL(u).pathname; } catch { return ""; } };
const isLoginUrl = (u) =>
  /\/(login|signup|authenticate)|\/oauth|account\.hubspot\.com/i.test(u) ||
  hostOf(u).startsWith("account.") ||
  /\/myaccounts/i.test(u);

async function snap(page, name) {
  const file = join(SHOTS, name);
  try {
    await page.screenshot({ path: file, fullPage: false });
    log("screenshot:", name);
  } catch (e) {
    log("screenshot failed:", name, String(e).slice(0, 120));
  }
  return file;
}

async function bodyText(page, max = 4000) {
  try {
    const txt = await page.evaluate(() => document.body?.innerText ?? "");
    return txt.replace(/\n{2,}/g, "\n").trim().slice(0, max);
  } catch {
    return "";
  }
}

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  viewport: { width: 1440, height: 900 },
  locale: "de-CH",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

log("Opening HubSpot. Please LOG IN in the browser window that just opened…");
log("(The window stays open. The script auto-detects when you're logged in.)");
await page.goto("https://app-eu1.hubspot.com/", { waitUntil: "domcontentloaded" }).catch(() => {});

// ---- wait for login ---------------------------------------------------------
const deadline = Date.now() + 15 * 60 * 1000;
let loggedIn = false;
let lastUrl = "";
while (Date.now() < deadline) {
  await page.waitForTimeout(4000);
  const url = page.url();
  if (url !== lastUrl) { log("current url:", url); lastUrl = url; }
  if (hostOf(url).endsWith("hubspot.com") && !isLoginUrl(url) && pathOf(url) !== "/") {
    await page.waitForTimeout(3500); // settle, then re-check
    if (!isLoginUrl(page.url())) { loggedIn = true; break; }
  }
}

if (!loggedIn) {
  log("TIMEOUT — never detected a logged-in HubSpot page.");
  addStep({ step: "login", ok: false, url: page.url(), note: "login not completed within 15 min" });
  await snap(page, "00-timeout.png");
  await ctx.close();
  process.exit(1);
}

const homeUrl = page.url();
log("LOGGED IN →", homeUrl);
await page.waitForTimeout(2500);
addStep({
  step: "home",
  ok: true,
  url: homeUrl,
  title: await page.title().catch(() => ""),
  screenshot: await snap(page, "01-home.png"),
  bodyText: await bodyText(page),
});

// portal / hub id — last numeric path segment, else from query, else 146284992
const hubId =
  (homeUrl.match(/\/(\d{5,})(?:\/|$|\?)/) || [])[1] ||
  (homeUrl.match(/portalId=(\d+)/) || [])[1] ||
  "146284992";
log("hub id guess:", hubId);
report.hubId = hubId;

// ---- contacts ---------------------------------------------------------------
const contactsUrl = `https://app-eu1.hubspot.com/contacts/${hubId}/objects/0-1/views/all/list`;
log("→ contacts:", contactsUrl);
try {
  await page.goto(contactsUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(7000);
  const txt = await bodyText(page);
  const countHit =
    (txt.match(/([\d.,'’\s]+)\s*(records?|kontakte?|contacts?|results?)/i) || [])[0] || null;
  addStep({
    step: "contacts",
    ok: !isLoginUrl(page.url()),
    url: page.url(),
    recordCountGuess: countHit,
    screenshot: await snap(page, "02-contacts.png"),
    bodyText: txt,
  });
} catch (e) {
  addStep({ step: "contacts", ok: false, url: page.url(), note: String(e).slice(0, 200), screenshot: await snap(page, "02-contacts.png") });
}

// ---- contact properties -----------------------------------------------------
const propsUrl = `https://app-eu1.hubspot.com/property-settings/${hubId}/properties?type=0-1`;
log("→ properties:", propsUrl);
try {
  await page.goto(propsUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(6000);
  addStep({
    step: "properties",
    ok: !isLoginUrl(page.url()),
    url: page.url(),
    screenshot: await snap(page, "03-properties.png"),
    bodyText: await bodyText(page, 6000),
  });
} catch (e) {
  addStep({ step: "properties", ok: false, url: page.url(), note: String(e).slice(0, 200), screenshot: await snap(page, "03-properties.png") });
}

// ---- account / settings overview -------------------------------------------
const acctUrl = `https://app-eu1.hubspot.com/settings/${hubId}/account-defaults`;
log("→ account settings:", acctUrl);
try {
  await page.goto(acctUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(5000);
  addStep({
    step: "account",
    ok: !isLoginUrl(page.url()),
    url: page.url(),
    screenshot: await snap(page, "04-account.png"),
    bodyText: await bodyText(page),
  });
} catch (e) {
  addStep({ step: "account", ok: false, url: page.url(), note: String(e).slice(0, 200) });
}

report.finishedAt = new Date().toISOString();
writeFileSync(join(ROOT, "scripts", "hs-report.json"), JSON.stringify(report, null, 2));
log("DONE — report at scripts/hs-report.json, screenshots in scripts/hs-shots/");
await page.waitForTimeout(1500);
await ctx.close();
