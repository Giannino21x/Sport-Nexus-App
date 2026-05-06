import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STORAGE_FILE = join(process.cwd(), ".playwright-storage.json");
const OUT_DIR = join(process.cwd(), "scripts", "guestoo-out");
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: false });
const ctxOpts = existsSync(STORAGE_FILE)
  ? { storageState: STORAGE_FILE, viewport: { width: 1400, height: 900 } }
  : { viewport: { width: 1400, height: 900 } };
const ctx = await browser.newContext(ctxOpts);

let userClosed = false;
ctx.on("close", () => { userClosed = true; });

const page = await ctx.newPage();
page.on("close", () => { userClosed = true; });

const safe = async (fn, label) => {
  try { return await fn(); } catch (e) {
    if (userClosed) { console.log(`✗ ${label}: Browser zu`); return null; }
    console.log(`✗ ${label}: ${String(e).slice(0, 200)}`);
    return null;
  }
};

console.log("→ Navigiere zu app.guestoo.de/dashboard …");
await safe(() => page.goto("https://app.guestoo.de/dashboard", { waitUntil: "domcontentloaded" }), "goto");

console.log("→ Falls Login-Seite: bitte im Fenster einloggen. Skript wartet bis 10 Min.");
console.log("→ Schließe das Fenster NICHT — ich erkenne den Login automatisch.");

const start = Date.now();
const TIMEOUT = 600_000;
let detected = false;
while (!userClosed && Date.now() - start < TIMEOUT) {
  const ok = await safe(async () => {
    const url = page.url();
    if (/\/auth\//.test(url)) return false;
    return await page.evaluate(() => {
      const t = document.body?.innerText ?? "";
      return /Adressbuch/i.test(t) && /Gutscheine/i.test(t);
    });
  }, "login probe");
  if (ok) { detected = true; break; }
  await page.waitForTimeout(2000).catch(() => {});
}

if (userClosed) { console.log("→ Browser zu — Abbruch."); process.exit(0); }
if (!detected) { console.log("✗ Login nicht erkannt (10 Min Timeout)."); await browser.close(); process.exit(0); }

console.log(`✓ Eingeloggt — URL: ${page.url()}`);

// Storage State speichern für nächsten Run
await safe(() => ctx.storageState({ path: STORAGE_FILE }), "save storage state");
console.log(`✓ Session gespeichert in ${STORAGE_FILE} — nächster Run startet ohne Login.`);

await page.waitForTimeout(2500);

await safe(() => page.screenshot({ path: join(OUT_DIR, "01-dashboard.png"), fullPage: true }), "screenshot 1");

const navItems = await safe(() => page.evaluate(() => {
  const out = [];
  const seen = new Set();
  document.querySelectorAll('a, [ui-sref], [ng-click], button').forEach((el) => {
    const txt = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!txt || txt.length > 80 || seen.has(txt)) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.left > 320) return;
    seen.add(txt);
    out.push({ text: txt, href: el.getAttribute("href") ?? null, sref: el.getAttribute("ui-sref") ?? null });
  });
  return out;
}), "nav") ?? [];
writeFileSync(join(OUT_DIR, "02-nav.json"), JSON.stringify(navItems, null, 2));
console.log(`✓ ${navItems.length} Sidebar-Einträge.`);

const apiHits = await safe(() => page.evaluate(() => {
  const out = [];
  document.querySelectorAll("a, button, [ng-click], [ui-sref], li, span, h1, h2, h3, md-list-item, md-menu-item").forEach((el) => {
    const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!/\bAPI\b/i.test(t) || t.length > 120) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    out.push({
      text: t, tag: el.tagName.toLowerCase(),
      href: el.getAttribute("href") ?? null,
      sref: el.getAttribute("ui-sref") ?? null,
      click: el.getAttribute("ng-click") ?? null,
      x: Math.round(r.left), y: Math.round(r.top),
    });
  });
  return out;
}), "api hits") ?? [];
writeFileSync(join(OUT_DIR, "03-api-hits.json"), JSON.stringify(apiHits, null, 2));
console.log(`✓ ${apiHits.length} API-Treffer.`);

// Klick aufs User-Menü oben rechts
await safe(async () => {
  const candidates = await page.$$('header a, header button, md-toolbar a, md-toolbar button, [class*="user"]');
  for (const el of candidates) {
    const r = await el.boundingBox().catch(() => null);
    if (!r) continue;
    if (r.x > 1000 && r.y < 80) {
      await el.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(800);
      break;
    }
  }
}, "user menu click");
await safe(() => page.screenshot({ path: join(OUT_DIR, "04-after-user-menu.png"), fullPage: true }), "screenshot 4");

// Re-extract API hits NACH dem User-Menü-Klick
const apiHits2 = await safe(() => page.evaluate(() => {
  const out = [];
  document.querySelectorAll("a, button, [ng-click], [ui-sref], li, span, md-list-item, md-menu-item").forEach((el) => {
    const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!/\bAPI\b/i.test(t) || t.length > 120) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    out.push({ text: t, sref: el.getAttribute("ui-sref"), click: el.getAttribute("ng-click"), href: el.getAttribute("href") });
  });
  return out;
}), "api hits 2") ?? [];
writeFileSync(join(OUT_DIR, "03b-api-hits-after-menu.json"), JSON.stringify(apiHits2, null, 2));
console.log(`✓ Nach User-Menü: ${apiHits2.length} API-Treffer.`);

// Probe API-Pfade
const apiPaths = [
  "/agency/userMenu/api",
  "/agency/api",
  "/agency/api-user",
  "/agency/featureShop",
  "/agency/userMenu/featureShop",
  "/agency/userMenu/abo",
];
const probes = [];
for (const p of apiPaths) {
  if (userClosed) break;
  const r = await safe(async () => {
    const resp = await page.goto(`https://app.guestoo.de${p}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(1500);
    const url = page.url();
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    return { tried: p, status: resp?.status() ?? null, finalUrl: url, title, preview: bodyText };
  }, `probe ${p}`);
  if (r) {
    probes.push(r);
    const safeName = p.replace(/\W+/g, "_");
    await safe(() => page.screenshot({ path: join(OUT_DIR, `probe${safeName}.png`), fullPage: true }), "screenshot probe");
  }
}
writeFileSync(join(OUT_DIR, "05-api-probes.json"), JSON.stringify(probes, null, 2));

console.log(`→ Output: ${OUT_DIR}`);
console.log("→ Browser bleibt offen.");
