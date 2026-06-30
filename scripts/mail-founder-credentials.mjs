// Schickt den 6 blockierten Foundern ihre Zugangsdaten (E-Mail + Temp-Passwort)
// als gebrandete, SCANNER-SICHERE Mail: KEIN klickbarer Token-Link, nur die
// Login-URL + Zugangsdaten im Text. Passwort steht direkt drin → kein Link, den
// ein Mail-Scanner verbrauchen kann.
//
//   node scripts/mail-founder-credentials.mjs --test   → 1 Testmail an SELF
//   node scripts/mail-founder-credentials.mjs --live    → an alle 6 Founder
import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);

const APP_URL = env.APP_URL ?? "https://sport-nexus-app.vercel.app";
const LOGIN_URL = `${APP_URL}/login`;
const SELF = "info@space-media.ch";

const SMTP_HOST = env.SMTP_HOST ?? "asmtp.mail.hostpoint.ch";
const SMTP_PORT = Number(env.SMTP_PORT ?? "587");
const SMTP_USER = env.SMTP_USER ?? "no-reply@sport-nexus.ch";
const SMTP_PASS = env.SMTP_PASS;
const SMTP_FROM = env.SMTP_FROM ?? "SportNexus <no-reply@sportnexus.ch>";
if (!SMTP_PASS) { console.error("✗ SMTP_PASS fehlt in .env.local"); process.exit(1); }

const tx = nodemailer.createTransport({
  host: SMTP_HOST, port: SMTP_PORT,
  secure: SMTP_PORT === 465, requireTLS: SMTP_PORT === 587,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// Empfänger + Temp-Passwörter. Die Passwörter sind GEHEIM und stehen daher NICHT
// im Quellcode — sie werden aus einer gitignorierten Datei geladen:
//   scripts/.founder-pw.local.json  →  { "fabian.roth@hug-baustoffe.ch": "..." , ... }
// (Diese Datei mit den am 2026-06-30 via set-temp-passwords.mjs gesetzten Werten
//  füllen; sie ist über .gitignore vom Commit ausgeschlossen.)
const PW = JSON.parse(readFileSync(new URL("./.founder-pw.local.json", import.meta.url), "utf8"));
const FOUNDERS = [
  { first: "Fabian", email: "fabian.roth@hug-baustoffe.ch" },
  { first: "Felix",  email: "felix.wolfensberger@mesoneer.io" },
  { first: "Mischa", email: "mischa@hrstudio.ch" },
  { first: "Ivan",   email: "ivan.dunjic@epartners.ch" },
  { first: "Boris",  email: "boris@sportnexus.ch" },
  { first: "Fabio",  email: "fabio@sportnexus.ch" },
].map((f) => ({ ...f, pw: PW[f.email] }));

function buildMail({ first, email, pw }) {
  const subject = "Dein SportNexus-Login (Zugangsdaten)";
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F7F7F7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#000;">
  <div style="max-width:560px;margin:32px auto;padding:44px 40px;background:#FFFFFF;border-radius:10px;">
    <img src="${APP_URL}/logo-sportnexus.png" alt="SportNexus" width="190" style="display:block;width:190px;max-width:60%;height:auto;border:0;margin:0 0 28px;">
    <h1 style="font-size:23px;font-weight:600;margin:0 0 16px;line-height:1.3;">Hallo ${first},</h1>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;">
      damit der Login bei dir klappt, hier deine persönlichen Zugangsdaten für den SportNexus-Memberbereich — <strong>Sport trifft auf Business</strong>. Du brauchst keinen Link, melde dich einfach direkt an:
    </p>
    <div style="background:#F4F4F4;border-radius:10px;padding:24px 24px;margin:0 0 32px;">
      <div style="font-size:12px;color:#868686;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">E-Mail</div>
      <div style="font-size:15px;font-weight:600;margin:0 0 20px;">${email}</div>
      <div style="font-size:12px;color:#868686;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">Temporäres Passwort</div>
      <div style="font-size:18px;font-weight:700;letter-spacing:.01em;font-family:'SF Mono',Menlo,Consolas,monospace;">${pw}</div>
    </div>
    <div style="margin:0 0 28px;">
      <a href="${LOGIN_URL}" style="display:inline-block;background:#000;color:#fff;padding:14px 26px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Jetzt einloggen →</a>
    </div>
    <p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:#000;">
      <strong>Wichtig:</strong> Bitte ändere dein Passwort direkt nach dem ersten Login in den <em>Einstellungen</em> auf ein eigenes.
    </p>
    <p style="margin:0;font-size:12.5px;line-height:1.6;color:#575757;">
      Login jederzeit unter <a href="${LOGIN_URL}" style="color:#006FB6;">${LOGIN_URL.replace(/^https?:\/\//, "")}</a>. Die App fürs Handy folgt nach der Store-Freigabe.
    </p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #ECECEC;">
    <p style="font-size:11px;color:#868686;margin:0;line-height:1.6;">
      Du erhältst diese E-Mail, weil für dich ein SportNexus-Member-Zugang eingerichtet wurde. Fragen? Antworte einfach auf diese Mail.
    </p>
  </div>
</body></html>`;
  const text = [
    `Hallo ${first},`, ``,
    `damit der Login klappt, hier deine Zugangsdaten für den SportNexus-Memberbereich.`,
    `Du brauchst keinen Link — melde dich direkt an:`, ``,
    `E-Mail:   ${email}`,
    `Passwort: ${pw}`, ``,
    `Login: ${LOGIN_URL}`, ``,
    `WICHTIG: Bitte ändere dein Passwort direkt nach dem ersten Login in den Einstellungen.`, ``,
    `Fragen? Antworte einfach auf diese Mail.`,
  ].join("\n");
  return { subject, html, text };
}

const mode = process.argv.includes("--live") ? "live" : process.argv.includes("--test") ? "test" : null;
if (!mode) { console.error("Bitte --test oder --live angeben."); process.exit(1); }

if (mode === "test") {
  const f = FOUNDERS[0];
  const tpl = buildMail(f);
  await tx.sendMail({ from: SMTP_FROM, to: SELF, subject: `[TEST] ${tpl.subject}`, html: tpl.html, text: tpl.text });
  console.log(`✓ Testmail (Render von "${f.first}") an ${SELF} verschickt.`);
} else {
  let ok = 0;
  for (const f of FOUNDERS) {
    const tpl = buildMail(f);
    try {
      await tx.sendMail({ from: SMTP_FROM, to: f.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      console.log(`✓ ${f.first.padEnd(8)} → ${f.email}`);
      ok++;
    } catch (e) {
      console.log(`✗ ${f.first.padEnd(8)} → ${f.email}: ${e.message}`);
    }
  }
  console.log(`\nFertig: ${ok}/${FOUNDERS.length} Mails verschickt.`);
}
