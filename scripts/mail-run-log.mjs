// Mailt das Protokoll eines Workflow-Laufs an Giannino (info@space-media.ch) —
// damit der zeitgesteuerte Invite-Versand ohne manuelles Nachschauen auskommt.
// Aufruf: node scripts/mail-run-log.mjs <status> <logfile> [betreff-prefix]
import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1").trim()]),
);

const [status = "unknown", logfile, prefix = "SportNexus Beta-Invites"] = process.argv.slice(2);
const ok = status === "success";
const log = logfile ? readFileSync(logfile, "utf8") : "(kein Log)";

const port = Number(env.SMTP_PORT ?? "587");
const tx = nodemailer.createTransport({
  host: env.SMTP_HOST ?? "asmtp.mail.hostpoint.ch",
  port,
  secure: port === 465,
  requireTLS: port === 587,
  auth: { user: env.SMTP_USER ?? "no-reply@sport-nexus.ch", pass: env.SMTP_PASS },
});

await tx.sendMail({
  from: env.SMTP_FROM ?? "SportNexus <no-reply@sportnexus.ch>",
  to: "info@space-media.ch",
  subject: `${prefix}: ${ok ? "erfolgreich verschickt" : "FEHLGESCHLAGEN — bitte pruefen"}`,
  text: `Status: ${status}\n\n--- Protokoll ---\n${log}`,
});
console.log(`Protokoll-Mail (${status}) an info@space-media.ch verschickt.`);
