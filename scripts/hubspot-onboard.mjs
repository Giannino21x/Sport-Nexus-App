// HubSpot → SportNexus Onboarding (Pull-Variante, Pascal Feedback 6).
//
// Holt Kontakte mit `vertrag = true` aus HubSpot, filtert auf die fürs
// Onboarding freigegebenen `memberstatus`-Werte (Default: nur Founder fürs
// Testing) und legt für jeden ein SportNexus-Konto an:
//   1. Supabase-Auth-Invite (Mail mit „Passwort festlegen"-Link)
//   2. members-Row (auth-Trigger verknüpft auth_id beim ersten Login)
//
// Pull statt Webhook, weil die HubSpot-Workflow-Aktion „Webhook" Operations
// Hub Professional verlangt — diese Variante läuft auf jeder Lizenzstufe und
// ist fürs kontrollierte Testing per Hand auslösbar.
//
// SICHERHEIT: Default ist DRY-RUN — es wird NICHTS geschrieben und KEINE Mail
// verschickt. Erst `--live` legt Konten an und löst Invite-Mails aus.
//
//   node scripts/hubspot-onboard.mjs            # Dry-Run (zeigt nur an)
//   node scripts/hubspot-onboard.mjs --live     # echtes Onboarding
//   node scripts/hubspot-onboard.mjs --status="Founder,Early Member"
//   node scripts/hubspot-onboard.mjs --live --only=max@example.com
//   node scripts/hubspot-onboard.mjs --live --beta --reinvite --only=a@x.ch,b@y.ch
//     → Beta-Test-Einladung (Pascals Text) mit 4-Wochen-Link an Testpersonen
//
// Mapping-Quelle: docs/HUBSPOT-SYNC.md (verifiziert 2026-06-12/16).

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { argv } from "node:process";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// ---------- .env.local laden ----------
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);

const HUBSPOT_TOKEN = env.HUBSPOT_TOKEN;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = env.APP_URL ?? "https://sport-nexus-app.vercel.app";

// ---------- CLI-Args ----------
const args = argv.slice(2);
const LIVE = args.includes("--live");
const statusArg = args.find((a) => a.startsWith("--status="));
const onlyArg = args.find((a) => a.startsWith("--only="));
const ALLOWED_STATUS = (statusArg ? statusArg.split("=")[1] : "Founder")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
// --only akzeptiert eine oder mehrere (kommagetrennte) E-Mails.
const ONLY = onlyArg
  ? onlyArg.split("=")[1].split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  : null;
// --reinvite: schickt auch bereits onboardeten Membern eine frische Welcome-Mail
// mit neuem Passwort-Link (z.B. Founder, deren erster Invite-Link abgelaufen ist).
const REINVITE = args.includes("--reinvite");
// --no-mail: onboardet/aktualisiert nur die Daten, verschickt KEINE Mail
// (z.B. um „Member seit" nachzutragen, ohne erneut Invites auszulösen).
const NOMAIL = args.includes("--no-mail");
// --beta: Beta-Test-Einladung (Pascals Text, Feedback 8) statt der Standard-
// Welcome-Mail, mit 4 Wochen gültigem Langzeit-Link auf /invite statt des
// 24h-Supabase-Links. Für die auserwählten Testpersonen vor dem 20.08.
const BETA = args.includes("--beta");

const log = (...a) => console.log(...a);

// ---------- SMTP (Hostpoint, identisch zu lib/email.ts) ----------
const SMTP_HOST = env.SMTP_HOST ?? "asmtp.mail.hostpoint.ch";
const SMTP_PORT = Number(env.SMTP_PORT ?? "587");
const SMTP_USER = env.SMTP_USER ?? "no-reply@sport-nexus.ch";
const SMTP_PASS = env.SMTP_PASS;
// WICHTIG: From MUSS no-reply@sportnexus.ch (OHNE Bindestrich) sein — sport-nexus.ch
// ist NXDOMAIN und Gmail verwirft solche Absender komplett. Siehe docs/EMAIL.md.
const SMTP_FROM = env.SMTP_FROM ?? "SportNexus <no-reply@sportnexus.ch>";

let _tx = null;
function transporter() {
  if (!SMTP_PASS) return null;
  if (!_tx) {
    _tx = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      requireTLS: SMTP_PORT === 587,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return _tx;
}

// Gebrandete Welcome-/Onboarding-Mail mit klarer Login-Anleitung. Das ist die
// Mail, die Member (und jetzt zuerst die Founder zum Testen) erhalten.
function welcomeEmail({ first, actionUrl }) {
  const greeting = first ? `Hallo ${first},` : "Hallo,";
  const subject = "Willkommen bei SportNexus — dein Zugang";
  const steps = [
    ["1", "Passwort festlegen", "Klick auf den Button unten und vergib dein persönliches Passwort (mind. 8 Zeichen)."],
    ["2", "Profilbild hinzufügen", "Beim ersten Login lädst du kurz ein Foto hoch — das macht das Verzeichnis persönlicher."],
    ["3", "Loslegen", "Verzeichnis, Events, Nachrichten und dein Profil stehen dir offen."],
  ];
  const stepRows = steps.map(([n, t, d]) => `
    <tr>
      <td valign="top" style="padding:0 12px 16px 0; width:30px;">
        <div style="width:26px; height:26px; border-radius:50%; background:#000; color:#fff; font-size:13px; font-weight:600; text-align:center; line-height:26px;">${n}</div>
      </td>
      <td valign="top" style="padding:0 0 16px 0;">
        <div style="font-size:14.5px; font-weight:600; color:#000;">${t}</div>
        <div style="font-size:13.5px; line-height:1.5; color:#575757; margin-top:2px;">${d}</div>
      </td>
    </tr>`).join("");

  const html = `<!doctype html><html><body style="margin:0; padding:0; background:#F7F7F7; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#000;">
  <div style="max-width:560px; margin:24px auto; padding:32px; background:#FFFFFF; border-radius:8px;">
    <!-- Weisser Chip hinter dem Logo: im Light Mode unsichtbar, verhindert im
         Dark Mode (Client invertiert die Karte), dass der dunkle Teil des
         Logo-PNGs unlesbar wird. -->
    <div style="display:inline-block; background:#FFFFFF; padding:8px 12px 6px; border-radius:6px; margin:0 0 8px;">
      <img src="${APP_URL}/logo-sportnexus.png" alt="SportNexus" width="190" style="display:block; width:190px; max-width:60vw; height:auto; border:0;">
    </div>
    <h1 style="font-size:23px; font-weight:600; margin:12px 0 6px; color:#000;">${greeting}</h1>
    <p style="margin:0 0 22px; font-size:15px; line-height:1.55; color:#000;">
      schön, dass du dabei bist. Dein Zugang zum SportNexus-Memberbereich ist bereit — <strong>Sport trifft auf Business</strong>. In drei kurzen Schritten bist du drin:
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">${stepRows}</table>
    <div style="margin:18px 0 6px;">
      <a href="${actionUrl}" style="display:inline-block; background:#000; color:#fff; padding:13px 22px; border-radius:6px; text-decoration:none; font-size:15px; font-weight:600;">Passwort festlegen &amp; einloggen →</a>
    </div>
    <p style="margin:18px 0 0; font-size:12.5px; line-height:1.5; color:#575757;">
      Falls der Button nicht funktioniert, kopiere diesen Link in den Browser:<br>
      <span style="word-break:break-all; color:#006FB6;">${actionUrl}</span>
    </p>
    <hr style="margin:28px 0; border:none; border-top:1px solid #ECECEC;">
    <p style="font-size:12px; color:#575757; margin:0 0 6px; line-height:1.5;">
      Später meldest du dich jederzeit unter <a href="${APP_URL}/login" style="color:#006FB6;">${APP_URL.replace(/^https?:\/\//, "")}/login</a> mit deiner E-Mail und deinem Passwort an. Die App gibt's auch fürs Handy — Link folgt nach der Store-Freigabe.
    </p>
    <p style="font-size:11px; color:#868686; margin:10px 0 0; line-height:1.5;">
      Du erhältst diese E-Mail, weil für dich ein SportNexus-Member-Zugang eingerichtet wurde. Fragen? Antworte einfach auf diese Mail.
    </p>
  </div>
</body></html>`;

  const text = [
    greeting,
    ``,
    `schön, dass du dabei bist. Dein Zugang zum SportNexus-Memberbereich ist bereit.`,
    ``,
    `So legst du los:`,
    `1. Passwort festlegen — über den Link unten dein persönliches Passwort vergeben (mind. 8 Zeichen).`,
    `2. Profilbild hinzufügen — beim ersten Login kurz ein Foto hochladen.`,
    `3. Loslegen — Verzeichnis, Events, Nachrichten & dein Profil.`,
    ``,
    `Passwort festlegen & einloggen:`,
    actionUrl,
    ``,
    `Später: Login unter ${APP_URL}/login mit E-Mail + Passwort.`,
    `Fragen? Antworte einfach auf diese Mail.`,
  ].join("\n");

  return { subject, html, text };
}

// Beta-Test-Einladung (Pascals Zusatztext aus Feedback 8, wörtlich übernommen).
// Verlinkt den 4 Wochen gültigen Langzeit-Link (/invite), nicht den 24h-OTP.
function betaEmail({ first, actionUrl }) {
  const greeting = first ? `Hoi ${first}` : "Hoi";
  const subject = "Deine SportNexus-Memberapp: Testzugang";
  const checkpoints = [
    ["Login-Prozess", "Stolpersteine?"],
    ["Profil bearbeiten", "Vollständigkeit der Daten, Anpassungen möglich?"],
    ["Members", "Funktioniert die Suchfunktion (Filter, Sortieren)?"],
    ["Detailseite Members", "Funktionieren Links, sind Angaben hilfreich, fehlt etwas?"],
    ["Messages", "Funktioniert die Kontaktaufnahme?"],
    ["Events", "Angaben hilfreich, Anmeldestatus korrekt?"],
  ];
  const checkRows = checkpoints.map(([t, d]) => `
    <tr>
      <td valign="top" style="padding:0 10px 10px 0; width:14px; font-size:14px; color:#000;">•</td>
      <td valign="top" style="padding:0 0 10px 0; font-size:14px; line-height:1.5; color:#000;">
        <strong>${t}:</strong> <span style="color:#575757;">${d}</span>
      </td>
    </tr>`).join("");

  const html = `<!doctype html><html><body style="margin:0; padding:0; background:#F7F7F7; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#000;">
  <div style="max-width:560px; margin:24px auto; padding:32px; background:#FFFFFF; border-radius:8px;">
    <!-- Weisser Chip hinter dem Logo: im Light Mode unsichtbar, verhindert im
         Dark Mode (Client invertiert die Karte), dass der dunkle Teil des
         Logo-PNGs unlesbar wird. -->
    <div style="display:inline-block; background:#FFFFFF; padding:8px 12px 6px; border-radius:6px; margin:0 0 8px;">
      <img src="${APP_URL}/logo-sportnexus.png" alt="SportNexus" width="190" style="display:block; width:190px; max-width:60vw; height:auto; border:0;">
    </div>
    <h1 style="font-size:23px; font-weight:600; margin:12px 0 14px; color:#000;">${greeting}</h1>
    <p style="margin:0 0 20px; font-size:15px; line-height:1.55; color:#000;">
      Wir haben eine Memberapp entwickelt, die dein SportNexus-Netzwerk noch einfacher zugänglich macht. Bevor wir sie am Event vom 20.8. offiziell vorstellen, möchten wir sie mit ein paar auserwählten Members wie dir auf Herz und Nieren testen.
    </p>
    <div style="margin:0 0 20px;">
      <a href="${actionUrl}" style="display:inline-block; background:#000; color:#fff; padding:13px 22px; border-radius:6px; text-decoration:none; font-size:15px; font-weight:600;">Login →</a>
      <div style="font-size:12.5px; color:#575757; margin-top:8px; line-height:1.5;">Beim ersten Klick legst du kurz dein persönliches Passwort fest, danach bist du drin.</div>
    </div>
    <p style="margin:0 0 14px; font-size:15px; line-height:1.55; color:#000;">
      Nimm dir bitte 15 Minuten Zeit und gib uns dein Feedback bis am 9.8.26. So können wir vor der Vorstellung noch letzte Optimierungen vornehmen. Worauf du besonders achten kannst:
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:0 0 10px;">${checkRows}</table>
    <p style="margin:0 0 24px; font-size:15px; line-height:1.55; color:#000;">
      Danke, dass du dir die Zeit nimmst. Dein Feedback macht die App für alle besser.
    </p>
    <p style="margin:0; font-size:15px; line-height:1.55; color:#000;">
      Sommerliche Grüsse<br><br>
      Dein SportNexus Founderteam
    </p>
    <hr style="margin:28px 0; border:none; border-top:1px solid #ECECEC;">
    <p style="font-size:12.5px; color:#575757; margin:0 0 6px; line-height:1.5;">
      Falls der Button nicht funktioniert, kopiere diesen Link in den Browser:<br>
      <span style="word-break:break-all; color:#006FB6;">${actionUrl}</span>
    </p>
    <p style="font-size:12px; color:#575757; margin:10px 0 0; line-height:1.5;">
      Der Login-Link ist 4 Wochen gültig. Später meldest du dich jederzeit unter <a href="${APP_URL}/login" style="color:#006FB6;">${APP_URL.replace(/^https?:\/\//, "")}/login</a> mit deiner E-Mail und deinem Passwort an. Fragen oder Feedback? Antworte einfach auf diese Mail.
    </p>
  </div>
</body></html>`;

  const text = [
    greeting,
    ``,
    `Wir haben eine Memberapp entwickelt, die dein SportNexus-Netzwerk noch einfacher zugänglich macht. Bevor wir sie am Event vom 20.8. offiziell vorstellen, möchten wir sie mit ein paar auserwählten Members wie dir auf Herz und Nieren testen.`,
    ``,
    `Login: ${actionUrl}`,
    `(Beim ersten Klick legst du kurz dein persönliches Passwort fest.)`,
    ``,
    `Nimm dir bitte 15 Minuten Zeit und gib uns dein Feedback bis am 9.8.26. So können wir vor der Vorstellung noch letzte Optimierungen vornehmen. Worauf du besonders achten kannst:`,
    `- Login-Prozess: Stolpersteine?`,
    `- Profil bearbeiten: Vollständigkeit der Daten, Anpassungen möglich?`,
    `- Members: Funktioniert die Suchfunktion (Filter, Sortieren)?`,
    `- Detailseite Members: Funktionieren Links, sind Angaben hilfreich, fehlt etwas?`,
    `- Messages: Funktioniert die Kontaktaufnahme?`,
    `- Events: Angaben hilfreich, Anmeldestatus korrekt?`,
    ``,
    `Danke, dass du dir die Zeit nimmst. Dein Feedback macht die App für alle besser.`,
    ``,
    `Sommerliche Grüsse`,
    ``,
    `Dein SportNexus Founderteam`,
    ``,
    `Der Login-Link ist 4 Wochen gültig. Später: Login unter ${APP_URL}/login mit E-Mail + Passwort.`,
  ].join("\n");

  return { subject, html, text };
}

// Langzeit-Link auf /invite: E-Mail + Ablauf, HMAC-signiert mit einem aus dem
// Service-Role-Key abgeleiteten Secret. Der Supabase-Recovery-OTP wird erst
// beim Button-Klick auf der Seite gemintet. MUSS synchron bleiben mit
// lib/invite-token.ts (signInviteToken/verifyInviteToken).
function makeLongInviteLink(email, days = 28) {
  const secret = createHmac("sha256", SERVICE_ROLE).update("sportnexus-invite-link-v1").digest();
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const payload = `${email.trim().toLowerCase()}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  const token = `${Buffer.from(payload).toString("base64url")}.${sig}`;
  return `${APP_URL}/invite?t=${token}`;
}

async function sendWelcome(to, first, actionUrl) {
  const tx = transporter();
  if (!tx) return { ok: false, reason: "SMTP_PASS fehlt" };
  const tpl = (BETA ? betaEmail : welcomeEmail)({ first, actionUrl });
  await tx.sendMail({ from: SMTP_FROM, to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  return { ok: true };
}

// Erzeugt einen Passwort-Setzen-Link: 'invite' für neue Accounts (legt den User
// + via Trigger die members-Zeile an), 'recovery' als Fallback für bestehende.
// generateLink verschickt KEINE Mail — wir versenden selbst (gebrandet).
//
// WICHTIG: Wir versenden NICHT den rohen Supabase-action_link (/auth/v1/verify).
// Der verifiziert den Einmal-Token schon beim ersten GET und ist damit fragil:
// Mail-Scanner-Prefetch (SafeLinks/Defender/Proxies) ODER ein verspäteter Klick
// entwerten ihn → "Link ungültig / klappt nicht" (genau das Problem, an dem
// Oliver D. hing). Stattdessen bauen wir — identisch zum In-App-Reset-Flow
// (siehe app/actions/auth.ts) — einen Link auf unsere /reset-confirm-Seite mit
// dem hashed_token. Dort wird beim Laden NICHTS verifiziert; erst der Button-
// Klick (POST → confirmRecoveryAction → verifyOtp) verbraucht den Token.
async function makeActionLink(admin, email, first, last) {
  const safeLink = (data, type) => {
    const th = data?.properties?.hashed_token;
    return th ? `${APP_URL}/reset-confirm?token_hash=${encodeURIComponent(th)}&type=${type}` : null;
  };
  let r = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { first, last } },
  });
  if (r.error && /already|registered|exists/i.test(r.error.message)) {
    r = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (r.error) return { error: r.error.message };
    return { link: safeLink(r.data, "recovery") };
  }
  if (r.error) return { error: r.error.message };
  return { link: safeLink(r.data, "invite") };
}

if (!HUBSPOT_TOKEN) {
  console.error("✗ HUBSPOT_TOKEN fehlt in .env.local. Lege einen HubSpot Private App Token an (CRM-Lese-Rechte) und trage ihn dort ein.");
  process.exit(1);
}
if (LIVE && (!SUPABASE_URL || !SERVICE_ROLE)) {
  console.error("✗ Für --live werden NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY benötigt.");
  process.exit(1);
}

// Properties, die wir aus HubSpot ziehen (echte interne Namen, docs/HUBSPOT-SYNC.md).
const PROPS = [
  "firstname", "lastname", "email", "company", "jobtitle",
  "branche_dropdown", "zweitbranche_dropdown", "date_of_birth",
  "hauptarbeitsort", "city", "mobilephone", "website", "hs_linkedin_url",
  "sportarten___interessen", "was_biete_ich", "zusatzfunktionen",
  "vertrag", "vertragsdatum", "memberstatus", "timeline", "createdate",
];

// ---------- HubSpot: Kontakte mit vertrag=true suchen (paginiert) ----------
async function fetchContracted() {
  const out = [];
  let after = undefined;
  do {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "vertrag", operator: "EQ", value: "true" }] }],
        properties: PROPS,
        limit: 100,
        after,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`HubSpot search HTTP ${res.status}: ${t.slice(0, 400)}`);
    }
    const json = await res.json();
    out.push(...(json.results ?? []));
    after = json.paging?.next?.after;
  } while (after);
  return out;
}

// Firmenname über die verknüpfte Company holen (Kontakt-Property `company` ist
// im Bestand leer; die Firma hängt am Company-Objekt). Braucht Scope
// crm.objects.companies.read. Best-effort — bei Fehler leer.
async function fetchCompanyName(contactId) {
  try {
    const h = { Authorization: `Bearer ${HUBSPOT_TOKEN}` };
    const a = await fetch(`https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/companies`, { headers: h });
    if (!a.ok) return "";
    const aj = await a.json();
    const compId = aj.results?.[0]?.toObjectId;
    if (!compId) return "";
    const c = await fetch(`https://api.hubapi.com/crm/v3/objects/companies/${compId}?properties=name`, { headers: h });
    if (!c.ok) return "";
    const cj = await c.json();
    return cj.properties?.name ?? "";
  } catch {
    return "";
  }
}

// „Member seit" = Datum, an dem `vertrag` auf JA gesetzt wurde (Konzept-Logik).
// Steckt nur in der Property-History (timeline/vertragsdatum sind im Bestand leer).
// Liefert Map: contactId → "YYYY-MM-DD" (frühestes true). Batch-Read max 100/Call.
async function fetchVertragSince(ids) {
  const map = new Map();
  const h = { Authorization: `Bearer ${HUBSPOT_TOKEN}`, "Content-Type": "application/json" };
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    try {
      const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/read", {
        method: "POST",
        headers: h,
        body: JSON.stringify({ propertiesWithHistory: ["vertrag"], inputs: chunk.map((id) => ({ id })) }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      for (const c of j.results ?? []) {
        const hist = c.propertiesWithHistory?.vertrag ?? [];
        const trueTs = hist
          .filter((v) => String(v.value).toLowerCase() === "true")
          .map((v) => String(v.timestamp))
          .sort();
        if (trueTs[0]) map.set(String(c.id), trueTs[0].slice(0, 10));
      }
    } catch {
      // still — Fallback (createdate) greift im Mapping.
    }
  }
  return map;
}

// ---------- Mapping HubSpot-Properties → members-Row ----------
const EN_DASH = "–"; // « – »

function splitBranche(v) {
  if (!v) return { branch: "", sub: "" };
  const sep = ` ${EN_DASH} `;
  const i = v.indexOf(sep);
  if (i === -1) return { branch: v.trim(), sub: "" };
  return { branch: v.slice(0, i).trim(), sub: v.slice(i + sep.length).trim() };
}

function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const dot = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // HubSpot date-Typ liefert teils Epoch-ms.
  if (/^\d{10,13}$/.test(s)) {
    const d = new Date(Number(s.length === 10 ? s * 1000 : s));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseSports(v) {
  if (!v) return [];
  return String(v)
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapContact(p) {
  const { branch, sub } = splitBranche(p.branche_dropdown);
  return {
    first: p.firstname ?? "",
    last: p.lastname ?? "",
    email: (p.email ?? "").trim().toLowerCase(),
    company: p.company ?? "",
    role: p.jobtitle ?? "",
    branch,
    sub,
    branch2: p.zweitbranche_dropdown ?? "",
    work: p.hauptarbeitsort ?? "",
    home: p.city ?? "",
    mobile: p.mobilephone ?? "",
    web: p.website ?? "",
    linkedin: p.hs_linkedin_url ?? "",
    sports: parseSports(p.sportarten___interessen),
    offer: p.was_biete_ich ?? "",
    additional_roles: p.zusatzfunktionen ?? "",
    date_of_birth: parseDate(p.date_of_birth),
    // „Member seit": primär das vertrag→JA-Datum (in main aus der Property-
    // History gesetzt); hier nur Fallbacks, falls History fehlt.
    since: parseDate(p.vertragsdatum) || parseDate(p.timeline) || parseDate(p.createdate),
    memberstatus: p.memberstatus ?? "",
  };
}

// ---------- Supabase: ein Mitglied onboarden ----------
// WICHTIG: Der DB-Trigger on_auth_user_created (handle_new_user) legt beim
// inviteUserByEmail automatisch eine members-Zeile an bzw. verknüpft eine
// bestehende per E-Mail. Wir dürfen daher NICHT zusätzlich inserten (sonst
// Duplikat) — wir UPDATEN die vom Trigger verknüpfte Zeile mit den HubSpot-Daten.
async function onboardOne(admin, m) {
  // 1. Bestehende members-Zeile(n) zu dieser E-Mail prüfen (bevorzugt auth-verknüpft).
  const { data: pre, error: preErr } = await admin
    .from("members")
    .select("id, slug, auth_id, first")
    .eq("email", m.email);
  if (preErr) return { status: "error", reason: `Select: ${preErr.message}` };
  const existing = (pre ?? []).find((r) => r.auth_id) ?? (pre ?? [])[0] ?? null;
  const fullyOnboarded = Boolean(existing && existing.auth_id && existing.first && existing.first.trim());

  // Schon vollständig onboarded: standardmässig überspringen. Mit --reinvite
  // erzeugen wir dennoch einen frischen Link + Welcome-Mail (für Founder, deren
  // erster Invite-Link abgelaufen ist).
  if (fullyOnboarded && !REINVITE) {
    return { status: "skip", reason: "bereits onboarded" };
  }

  // 2. Passwort-Setzen-Link erzeugen. 'invite' legt bei neuen Adressen den
  //    Auth-User an (Trigger handle_new_user erstellt/verknüpft die members-Zeile),
  //    'recovery' greift als Fallback bei bestehenden. generateLink verschickt
  //    KEINE Mail — wir versenden gleich selbst die gebrandete Welcome-Mail.
  const linkRes = await makeActionLink(admin, m.email, m.first, m.last);
  if (linkRes.error) return { status: "error", reason: `Auth: ${linkRes.error}` };
  // Beta-Einladungen verlinken den 4 Wochen gültigen Langzeit-Link (/invite)
  // statt des 24h-OTP-Links — makeActionLink oben stellt trotzdem sicher,
  // dass der Auth-User existiert (invite legt ihn bei Bedarf an).
  const actionLink = BETA ? makeLongInviteLink(m.email) : linkRes.link;

  // 3. Verknüpfte Zeile (nach evtl. Invite/Trigger) holen und mit HubSpot-Daten füllen.
  const { data: rows, error: selErr } = await admin
    .from("members")
    .select("id, slug, auth_id, first")
    .eq("email", m.email);
  if (selErr) return { status: "error", reason: `Select: ${selErr.message}` };
  if (!rows || rows.length === 0) return { status: "error", reason: "Keine members-Zeile nach Invite" };
  const target = rows.find((r) => r.auth_id) ?? rows[0];

  // CRM-Felder setzen. since/date_of_birth nur, wenn HubSpot einen Wert liefert
  // (sonst nicht den Trigger-Default current_date überschreiben).
  const update = {
    first: m.first,
    last: m.last,
    company: m.company,
    role: m.role,
    branch: m.branch,
    sub: m.sub,
    branch2: m.branch2,
    work: m.work,
    home: m.home,
    mobile: m.mobile,
    web: m.web,
    linkedin: m.linkedin,
    sports: m.sports,
    offer: m.offer,
    additional_roles: m.additional_roles,
  };
  if (m.date_of_birth) update.date_of_birth = m.date_of_birth;
  if (m.since) update.since = m.since;

  const { error: updErr } = await admin.from("members").update(update).eq("id", target.id);
  if (updErr) return { status: "error", reason: `Update: ${updErr.message}` };
  return { status: fullyOnboarded ? "reinvite" : "onboarded", slug: target.slug, actionLink };
}

// ---------- Test-Hook: nur die Welcome-Mail rendern + zustellen ----------
// node scripts/hubspot-onboard.mjs --test-mail=info@space-media.ch
// Schickt eine Beispiel-Welcome-Mail (Platzhalter-Link) an die Adresse, um
// Rendering + Zustellbarkeit zu prüfen — ohne HubSpot/Onboarding.
const testMailArg = args.find((a) => a.startsWith("--test-mail="));
if (testMailArg) {
  const to = testMailArg.split("=")[1].trim();
  // Mit --beta: echter Langzeit-Link auf die eigene Adresse (voll klickbar),
  // sonst Platzhalter-Link wie bisher.
  const link = BETA ? makeLongInviteLink(to) : `${APP_URL}/auth/callback?next=/reset-password`;
  log(`\nTest-${BETA ? "Beta" : "Welcome"}-Mail an ${to}...`);
  try {
    const res = await sendWelcome(to, "Test", link);
    log(res.ok ? `✓ verschickt.` : `✗ übersprungen: ${res.reason}`);
    process.exit(res.ok ? 0 : 1);
  } catch (e) {
    log(`✗ FEHLER: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

// ---------- Main ----------
log(`\n=== HubSpot-Onboarding (${LIVE ? "LIVE" : "DRY-RUN"}) ===`);
log(`Freigegebene memberstatus: ${ALLOWED_STATUS.join(", ")}${ONLY ? `  ·  nur ${ONLY.join(", ")}` : ""}\n`);

const contacts = await fetchContracted();
log(`HubSpot: ${contacts.length} Kontakt(e) mit vertrag=true.`);

// Welche memberstatus-Werte kommen real vor? (hilft, die internen Werte zu sehen)
const seenStatus = new Set(contacts.map((c) => (c.properties.memberstatus ?? "(leer)")));
log(`Vorkommende memberstatus-Werte: ${[...seenStatus].join(" | ")}\n`);

const candidates = contacts
  .map((c) => ({ hsId: c.id, ...mapContact(c.properties) }))
  .filter((m) => m.email)
  .filter((m) => ALLOWED_STATUS.includes((m.memberstatus ?? "").toLowerCase()))
  .filter((m) => !ONLY || ONLY.includes(m.email));

// Firma aus dem verknüpften Company-Objekt nachladen (Kontakt-Feld ist leer).
for (const m of candidates) {
  if (!m.company && m.hsId) {
    const name = await fetchCompanyName(m.hsId);
    if (name) m.company = name;
  }
}

// „Member seit" aus der vertrag→JA-Property-History setzen (überschreibt den
// Fallback aus mapContact, weil timeline/vertragsdatum im Bestand leer sind).
const sinceMap = await fetchVertragSince(candidates.map((m) => m.hsId).filter(Boolean));
for (const m of candidates) {
  const hist = sinceMap.get(String(m.hsId));
  if (hist) m.since = hist;
}

log(`→ ${candidates.length} Kandidat(en) nach Status-Filter:\n`);
for (const m of candidates) {
  log(`  • ${m.first} ${m.last}  <${m.email}>  [${m.memberstatus}]`);
  log(`    ${m.role || "—"} @ ${m.company || "—"}  ·  ${m.branch || "—"}${m.sub ? " / " + m.sub : ""}${m.branch2 ? "  · 2.: " + m.branch2 : ""}`);
  log(`    Sport: ${m.sports.join(", ") || "—"}  ·  Geb: ${m.date_of_birth || "—"}  ·  seit: ${m.since || "—"}`);
}

if (!LIVE) {
  log(`\nDRY-RUN — es wurde nichts angelegt und keine Mail verschickt.`);
  log(`Zum echten Onboarding: node scripts/hubspot-onboard.mjs --live\n`);
  process.exit(0);
}

if (candidates.length === 0) {
  log(`\nKeine Kandidaten — nichts zu tun.\n`);
  process.exit(0);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
log(`\nLIVE — lege Konten an...\n`);
let ok = 0, skip = 0, err = 0, mailed = 0;
for (const m of candidates) {
  const r = await onboardOne(admin, m);
  if (r.status === "onboarded" || r.status === "reinvite") {
    ok++;
    let mailNote = " (kein Link — keine Mail)";
    if (NOMAIL) {
      mailNote = " (--no-mail: nur Daten aktualisiert)";
    } else if (r.actionLink) {
      try {
        const sent = await sendWelcome(m.email, m.first, r.actionLink);
        if (sent.ok) { mailed++; mailNote = " + Welcome-Mail ✉"; }
        else { mailNote = ` (Mail übersprungen: ${sent.reason})`; }
      } catch (e) {
        mailNote = ` (Mail-FEHLER: ${e instanceof Error ? e.message : e})`;
      }
    }
    log(`  ✓ ${m.email} → ${r.status} (${r.slug})${mailNote}`);
  } else if (r.status === "skip") {
    skip++;
    log(`  – ${m.email} → übersprungen (${r.reason}${REINVITE ? "" : " — mit --reinvite trotzdem mailen"})`);
  } else {
    err++;
    log(`  ✗ ${m.email} → FEHLER: ${r.reason}`);
  }
}
log(`\nFertig: ${ok} verarbeitet, ${mailed} Welcome-Mails verschickt, ${skip} übersprungen, ${err} Fehler.\n`);
