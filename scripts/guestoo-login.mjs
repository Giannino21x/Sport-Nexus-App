// Interaktiver Guestoo-Login (analog hs-login): öffnet ein SICHTBARES Fenster
// auf app.guestoo.de. Melde dich dort an. Sobald du eingeloggt bist (URL nicht
// mehr /auth/), werden die Session-Cookies in .env.local geschrieben.
//
//   node scripts/guestoo-login.mjs
//
// Danach funktionieren die cookie-basierten Syncs (Event-Liste, neue Events).

import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

function writeEnv(updates) {
  const path = ".env.local";
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const seen = new Set();
  const out = lines.map((l) => {
    if (!l || l.startsWith("#")) return l;
    const i = l.indexOf("=");
    if (i < 0) return l;
    const key = l.slice(0, i);
    if (updates[key] !== undefined) { seen.add(key); return `${key}=${updates[key]}`; }
    return l;
  });
  for (const [k, v] of Object.entries(updates)) if (!seen.has(k)) out.push(`${k}=${v}`);
  writeFileSync(path, out.join("\n"));
}

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: "de-CH" });
const page = await ctx.newPage();

log("→ Öffne Guestoo. Bitte im Fenster anmelden.");
await page.goto("https://app.guestoo.de/auth/", { waitUntil: "domcontentloaded" });

// Bis zu 8 Min auf erfolgreichen Login warten. Erkennung URL-unabhängig: der
// Agency-Endpoint antwortet erst nach Login mit 200 (nutzt die Context-Cookies).
const deadline = Date.now() + 8 * 60 * 1000;
let ok = false;
while (Date.now() < deadline) {
  try { await page.waitForTimeout(3000); } catch { break; }
  if (page.isClosed()) break;
  try {
    const cs = await ctx.cookies("https://app.guestoo.de");
    const xsrfNow = cs.find((c) => c.name === "XSRF-TOKEN")?.value ?? "";
    const r = await ctx.request.get("https://app.guestoo.de/proxy/api/agency/current", {
      headers: { Accept: "application/json", "X-XSRF-TOKEN": xsrfNow },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    if (r.status() === 200) { ok = true; break; }
  } catch { /* weiter warten */ }
}

if (!ok) {
  log("✗ Kein Login erkannt (Timeout/Fenster zu).");
  await browser.close();
  process.exit(1);
}

await page.waitForTimeout(2500);
const state = await ctx.storageState();
const cookies = state.cookies
  .filter((c) => c.domain === "app.guestoo.de" && c.path === "/")
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");
const xsrf = state.cookies.find((c) => c.name === "XSRF-TOKEN" && c.path === "/")?.value;
if (!cookies || !xsrf) { log("✗ Cookies/XSRF nicht gefunden."); await browser.close(); process.exit(1); }

writeEnv({ GUESTOO_COOKIE_HEADER: cookies, GUESTOO_XSRF_TOKEN: xsrf });
log("✓ Eingeloggt — Cookies in .env.local gespeichert. URL:", page.url());
await browser.close();
