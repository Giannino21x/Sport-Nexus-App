// Refresht die Guestoo-Session-Cookies, indem Playwright headless mit
// GUESTOO_LOGIN_EMAIL + GUESTOO_LOGIN_PASSWORD auf app.guestoo.de einloggt
// und die neuen Cookies in .env.local schreibt.
//
// Aufruf: `node scripts/guestoo-refresh.mjs` (manuell oder per Cron alle ~5 Tage).
// Optional: `node scripts/guestoo-refresh.mjs --check` testet nur, ob die
// aktuellen Cookies noch gültig sind (Exit 0 = ok, 1 = abgelaufen).

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

function readEnv(path = ".env.local") {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const map = new Map();
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    map.set(line.slice(0, i), line.slice(i + 1));
  }
  return { map, lines };
}

function writeEnv(updates) {
  const path = ".env.local";
  const { lines } = readEnv(path);
  const seen = new Set();
  const out = lines.map((l) => {
    if (!l || l.startsWith("#")) return l;
    const i = l.indexOf("=");
    if (i < 0) return l;
    const key = l.slice(0, i);
    if (updates[key] !== undefined) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return l;
  });
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) out.push(`${k}=${v}`);
  }
  writeFileSync(path, out.join("\n"));
}

const env = readEnv().map;

if (checkOnly) {
  const cookieHeader = env.get("GUESTOO_COOKIE_HEADER");
  const xsrf = env.get("GUESTOO_XSRF_TOKEN");
  if (!cookieHeader || !xsrf) {
    console.error("✗ Keine Guestoo-Cookies in .env.local. Bitte erst `node scripts/guestoo-refresh.mjs` laufen lassen.");
    process.exit(1);
  }
  const res = await fetch("https://app.guestoo.de/proxy/api/agency/current", {
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
      Origin: "https://app.guestoo.de",
      Referer: "https://app.guestoo.de/dashboard",
      "X-XSRF-TOKEN": xsrf,
    },
    redirect: "manual",
  });
  if (res.status === 200) {
    console.log("✓ Guestoo-Session gültig.");
    process.exit(0);
  }
  console.error(`✗ Guestoo-Session ungültig (HTTP ${res.status}). Bitte refreshen mit \`node scripts/guestoo-refresh.mjs\`.`);
  process.exit(1);
}

const email = env.get("GUESTOO_LOGIN_EMAIL");
const password = env.get("GUESTOO_LOGIN_PASSWORD");
if (!email || !password) {
  console.error("✗ GUESTOO_LOGIN_EMAIL und GUESTOO_LOGIN_PASSWORD müssen in .env.local stehen.");
  console.error("   Beispiel:");
  console.error("     GUESTOO_LOGIN_EMAIL=admin@example.com");
  console.error("     GUESTOO_LOGIN_PASSWORD=...");
  process.exit(1);
}

console.log(`→ Login als ${email} …`);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const page = await ctx.newPage();

try {
  await page.goto("https://app.guestoo.de/auth/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(1500); // AngularJS hydrate

  // Login-Form: zwei input-Felder (Email + Password) + Submit-Button
  await page.fill('input[type="email"], input[name="email"], input[name="username"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !/\/auth\//.test(u.toString()), { timeout: 30_000 }).catch(() => {}),
    page.click('button[type="submit"], button:has-text("Einloggen"), button:has-text("Login")'),
  ]);

  // Final-Check: sind wir auf dem Dashboard?
  await page.waitForTimeout(3000);
  const url = page.url();
  if (/\/auth\//.test(url)) {
    throw new Error(`Login fehlgeschlagen — bleibe auf ${url}`);
  }
  console.log(`✓ Eingeloggt — URL: ${url}`);

  // Storage-State extrahieren
  const state = await ctx.storageState();
  mkdirSync("scripts/guestoo-out", { recursive: true });
  writeFileSync(".playwright-storage.json", JSON.stringify(state, null, 2));

  const cookies = state.cookies
    .filter((c) => c.domain === "app.guestoo.de" && c.path === "/")
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const xsrf = state.cookies.find((c) => c.name === "XSRF-TOKEN" && c.path === "/")?.value;
  if (!cookies || !xsrf) throw new Error("Konnte Cookies/XSRF nach Login nicht extrahieren.");

  writeEnv({
    GUESTOO_COOKIE_HEADER: cookies,
    GUESTOO_XSRF_TOKEN: xsrf,
  });

  // Expiry loggen
  const main = state.cookies.find((c) => c.name === "JSESSIONID" && c.path === "/");
  if (main && main.expires > 0) {
    const days = ((main.expires * 1000 - Date.now()) / 86400000).toFixed(1);
    console.log(`✓ Cookies gültig bis ${new Date(main.expires * 1000).toISOString()} (in ${days} Tagen)`);
  }
  console.log("✓ .env.local aktualisiert.");
} catch (e) {
  console.error("✗", e instanceof Error ? e.message : String(e));
  process.exit(1);
} finally {
  await browser.close();
}
