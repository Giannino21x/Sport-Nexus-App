// Einmal-Helfer: löst die ECHTE "Neue Nachricht"-Mailbenachrichtigung aus
// (gleiches Template + SMTP wie der reale Message-Flow), damit Pascal ein
// Beispiel im Postfach hat. Nutzt die echte Template-Funktion aus lib/email.ts
// — kein dupliziertes HTML, also 1:1 das, was ein Member beim Schreiben erhält.
//
// Aufruf:  node scripts/send-example-notification.mjs [recipientSlug] [senderSlug]
// Default: Pascal als Empfänger, Giannino als Absender.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// .env.local in process.env spiegeln, BEVOR lib/email.ts importiert wird
// (das liest SMTP_*/APP_URL teils beim Modul-Load).
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v;

const recipientSlug = process.argv[2] ?? "pascal-b-messerli";
const senderSlug = process.argv[3] ?? "giannino-peloso";

const { newMessageEmail, sendEmail } = await import("../lib/email.ts");

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const [{ data: sender }, { data: recipient }] = await Promise.all([
  supabase
    .from("members")
    .select("first, last, role, company, slug, email, mobile, linkedin, show_email, show_mobile, branch, work")
    .eq("slug", senderSlug)
    .maybeSingle(),
  supabase.from("members").select("first, last, email, slug").eq("slug", recipientSlug).maybeSingle(),
]);

if (!sender) throw new Error(`Absender (${senderSlug}) nicht gefunden.`);
if (!recipient?.email) throw new Error(`Empfänger (${recipientSlug}) hat keine E-Mail.`);

const body =
  "Hoi Pascal, das hier ist die automatische Mailbenachrichtigung, die jedes " +
  "Mitglied bekommt, sobald ihm jemand im SportNexus-Memberbereich schreibt. " +
  "Du kannst direkt über den Button in der App antworten – oder die Kontaktdaten " +
  "unten nutzen. Beste Grüsse, Giannino";

// Exakt wie notifyRecipient() in app/actions/messages.ts: Kontaktdaten nur,
// wenn der Absender sie freigegeben hat.
const tpl = newMessageEmail({
  senderName: `${sender.first} ${sender.last}`,
  sender: {
    first: sender.first,
    last: sender.last,
    role: sender.role,
    company: sender.company,
    slug: sender.slug,
    email: sender.show_email ? sender.email : null,
    mobile: sender.show_mobile ? sender.mobile : null,
    linkedin: sender.linkedin,
    branch: sender.branch,
    work: sender.work,
  },
  bodyPreview: body,
  recipientFirst: recipient.first,
});

console.log(`Sende "${tpl.subject}" an ${recipient.first} <${recipient.email}> …`);
const res = await sendEmail({ to: recipient.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
console.log(res.ok ? "✓ Versendet." : `✗ Fehlgeschlagen: ${res.reason}`);
process.exit(res.ok ? 0 : 1);
