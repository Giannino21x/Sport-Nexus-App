// Öffnet ein sichtbares Browserfenster zu Guestoo. Du loggst dich dort EINMAL
// ein (oder bist es schon). Sobald die Session gültig ist, werden die Cookies +
// XSRF-Token ausgelesen und in .env.local geschrieben — ohne dass dein Passwort
// irgendwo gespeichert wird.
//
//   node scripts/guestoo-capture.mjs

import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

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

const ctx = await chromium.launchPersistentContext(".playwright-guestoo", {
  headless: false,
  viewport: { width: 1280, height: 860 },
});
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto("https://app.guestoo.de/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});

console.log(">> Bitte im geöffneten Fenster bei Guestoo einloggen (falls noch nicht). Warte auf gültige Session …");

const deadline = Date.now() + 240000; // 4 Minuten Zeit zum Einloggen
let ok = false;
while (Date.now() < deadline) {
  await page.waitForTimeout(3000);
  const cookies = await ctx.cookies();
  const cookieHeader = cookies
    .filter((c) => c.domain === "app.guestoo.de" && c.path === "/")
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const xsrf = cookies.find((c) => c.name === "XSRF-TOKEN" && c.path === "/")?.value;
  if (!cookieHeader || !xsrf) continue;
  try {
    const res = await page.request.get("https://app.guestoo.de/proxy/api/agency/current", {
      headers: { Accept: "application/json", "X-XSRF-TOKEN": xsrf },
    });
    if (res.status() === 200) {
      writeEnv({ GUESTOO_COOKIE_HEADER: cookieHeader, GUESTOO_XSRF_TOKEN: xsrf });
      const jsession = cookies.find((c) => c.name === "JSESSIONID" && c.path === "/");
      if (jsession && jsession.expires > 0) {
        const days = ((jsession.expires * 1000 - Date.now()) / 86400000).toFixed(1);
        console.log(`>> Cookies gültig bis ${new Date(jsession.expires * 1000).toISOString()} (in ${days} Tagen)`);
      }
      console.log(">> OK: Session erfasst und in .env.local geschrieben.");
      ok = true;
      break;
    }
  } catch {}
}
if (!ok) console.log(">> TIMEOUT: keine gültige Session erkannt. Bitte erneut versuchen.");
await ctx.close();
process.exit(ok ? 0 : 1);
