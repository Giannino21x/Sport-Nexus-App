// Sendet eine Test-Mail über Hostpoint-SMTP an info@space-media.ch.
// Liefert klares OK/Fehler — vor allem ob Auth + TLS klappen.
import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]),
);

const port = Number(env.SMTP_PORT ?? "587");
const tx = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port,
  secure: port === 465,
  requireTLS: port === 587,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

console.log(`Testing SMTP: ${env.SMTP_HOST}:${port} as ${env.SMTP_USER}`);

try {
  await tx.verify();
  console.log("✓ verify OK — Auth + TLS funktionieren");
} catch (e) {
  console.error("✗ verify failed:", e.message);
  process.exit(1);
}

const TO = "info@space-media.ch";
try {
  const info = await tx.sendMail({
    from: env.SMTP_FROM,
    to: TO,
    subject: "SportNexus SMTP Test — bitte ignorieren",
    text: "Test-Mail aus SportNexus-App via Hostpoint-SMTP. Wenn diese ankommt, funktioniert Messages-Notification.",
    html: "<p>Test-Mail aus SportNexus-App via Hostpoint-SMTP. Wenn diese ankommt, funktioniert Messages-Notification.</p>",
  });
  console.log(`✓ sent to ${TO} — id=${info.messageId}`);
} catch (e) {
  console.error("✗ send failed:", e.message);
  process.exit(1);
}
