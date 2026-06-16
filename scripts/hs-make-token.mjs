// Legt einen HubSpot Private App Token an (Scope crm.objects.contacts.read).
// Nutzt die eingeloggte Session in .playwright-hubspot.
// Phase 1 (--explore): nur Screenshot + interaktive Elemente dumpen.

import { chromium } from "playwright";
import { join } from "node:path";

const ROOT = process.cwd();
const PORTAL = "146284992";
const EXPLORE = process.argv.includes("--explore");
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const ctx = await chromium.launchPersistentContext(join(ROOT, ".playwright-hubspot"), {
  headless: true,
  viewport: { width: 1366, height: 900 },
  locale: "de-CH",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

log("→ Private-Apps-Seite laden…");
await page.goto(`https://app-eu1.hubspot.com/private-apps/${PORTAL}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
log("URL:", page.url());

// „Alte Apps" — Private Apps sind dorthin umgezogen.
const legacy = page.getByRole("link", { name: /Alte Apps/i }).first();
if (await legacy.count()) {
  await legacy.click().catch(() => {});
  await page.waitForTimeout(8000);
  log("Nach 'Alte Apps' — URL:", page.url());
}

// „Alte App erstellen" klicken.
const createBtn = page.getByRole("button", { name: /Alte App erstellen/i }).first();
if (await createBtn.count()) {
  await createBtn.click().catch(() => {});
  await page.waitForTimeout(3000);
  log("Nach 'Alte App erstellen' — URL:", page.url());
}

// Im Dialog „Privat" (Für einen Account) wählen.
const privat = page.getByText(/Für einen Account/i).first();
if (await privat.count()) {
  await privat.click().catch(() => {});
  await page.waitForTimeout(5000);
  log("Nach 'Privat' — URL:", page.url());
}

// Bestätigungs-Checkbox anhaken + „Mit alter privater App fortfahren".
const ack = page.getByText(/Mir ist klar, dass alte private Apps/i).first();
if (await ack.count()) {
  await ack.click().catch(() => {});
  await page.waitForTimeout(1500);
}
const cont = page.getByRole("button", { name: /Mit alter privater App fortfahren/i }).first();
if (await cont.count()) {
  await cont.click().catch(() => {});
  await page.waitForTimeout(7000);
  log("Nach 'fortfahren' — URL:", page.url());
}

// Name setzen.
const nameInput = page.locator('input[type="text"]').first();
if (await nameInput.count()) {
  await nameInput.fill("SportNexus Onboarding").catch(() => {});
  log("Name gesetzt.");
}

// Auf Tab „Bereiche" (Scopes) wechseln.
const scopesTab = page.getByText("Bereiche", { exact: true }).first();
if (await scopesTab.count()) {
  await scopesTab.click().catch(() => {});
  await page.waitForTimeout(4000);
  log("Auf 'Bereiche'-Tab geklickt.");
}

// Scope-Auswahl öffnen.
const addScope = page.getByRole("button", { name: /Neuen Bereich hinzufügen/i }).first();
if (await addScope.count()) {
  await addScope.click().catch(() => {});
  await page.waitForTimeout(4000);
  log("Scope-Dialog geöffnet.");
}

// crm.objects.contacts.read auswählen (Lesen genügt — wir schreiben nicht zurück).
const search = page.getByPlaceholder(/Bereich suchen/i).first();
if (await search.count()) {
  await search.fill("crm.objects.contacts.read").catch(() => {});
  await page.waitForTimeout(2500);
}
// Die gefilterte Zeile zeigt eine Checkbox rechts — diese anhaken.
const cb = page.locator('input[type="checkbox"]').last();
if (await cb.count()) {
  await cb.check({ force: true }).catch(() => {});
  await page.waitForTimeout(1000);
  log("Checkbox angehakt:", await cb.isChecked().catch(() => "?"));
} else {
  log("⚠ Keine Checkbox gefunden.");
}
// Auswahl übernehmen („Aktualisieren").
const apply = page.getByRole("button", { name: /Aktualisieren/i }).first();
if (await apply.count()) {
  await apply.click().catch(() => {});
  await page.waitForTimeout(3000);
  log("Scope übernommen.");
}

// App erstellen.
const createApp = page.getByRole("button", { name: /^App erstellen$/i }).first();
if (await createApp.count()) {
  await createApp.click().catch(() => {});
  await page.waitForTimeout(3500);
  log("'App erstellen' geklickt.");
  // Bestätigungs-Modal „Neue private App erstellen".
  const confirm = page.getByRole("button", { name: /Mit dem Erstellen fortfahren/i }).first();
  if ((await confirm.count()) && (await confirm.isVisible().catch(() => false))) {
    await confirm.click().catch(() => {});
    log("Bestätigt: 'Mit dem Erstellen fortfahren'.");
  } else {
    log("⚠ Bestätigungs-Button nicht gefunden.");
  }
  await page.waitForTimeout(8000);
}

// Token anzeigen + auslesen.
const showTok = page.getByText(/Token anzeigen/i).first();
if (await showTok.count()) {
  await showTok.click().catch(() => {});
  await page.waitForTimeout(2500);
  log("'Token anzeigen' geklickt.");
}
const token = await page.evaluate(() => {
  const m = document.body.innerText.match(/pat-[a-z0-9]+-[a-z0-9-]{20,}/i);
  return m ? m[0] : null;
});
if (token) {
  log("✓ TOKEN:", token);
} else {
  log("⚠ Kein Token im Text gefunden — siehe Screenshot.");
}

if (EXPLORE) {
  // Scope-bezogene Checkbox-Labels dumpen (alles mit 'contact' bzw. 'crm').
  const scopeRows = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("label, tr, li, div")) {
      const t = (el.innerText || "").trim().replace(/\s+/g, " ");
      if (/contact|kontakt|crm\./i.test(t) && t.length < 90) out.push(t);
    }
    return [...new Set(out)].slice(0, 25);
  });
  log("Scope-Zeilen (contact/crm):");
  for (const r of scopeRows) log("   ·", r);
  const searchboxes = await page.evaluate(() =>
    [...document.querySelectorAll('input[type="search"], input[type="text"]')].map((i) => i.getAttribute("placeholder") || "(kein placeholder)"),
  );
  log("Suchfelder:", searchboxes.join(" | "));
}

await page.screenshot({ path: join(ROOT, "scripts", "_hs-token.png"), fullPage: true });
log("→ scripts/_hs-token.png");

if (EXPLORE) {
  const inputs = await page.evaluate(() =>
    [...document.querySelectorAll("input, textarea")].map(
      (i) => `${i.tagName}[name=${i.getAttribute("name") || ""}][placeholder=${i.getAttribute("placeholder") || ""}][type=${i.getAttribute("type") || ""}]`,
    ).slice(0, 30),
  );
  log("Eingabefelder:");
  for (const i of inputs) log("   ", i);
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll("[role=tab], [role=tablist] *")].map((t) => (t.innerText || "").trim()).filter(Boolean).slice(0, 20),
  );
  log("Tabs:", tabs.join(" | "));
}

if (EXPLORE) {
  const els = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("button, a, [role=button]")) {
      const t = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
      if (t && t.length < 80) out.push(`${el.tagName}: ${t}`);
    }
    return [...new Set(out)].slice(0, 60);
  });
  log("Interaktive Elemente:");
  for (const e of els) log("   ", e);
}

await ctx.close();
