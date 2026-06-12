// Sendet eine ECHTE In-App-Nachricht (messages-Row) + die automatische
// Mailbenachrichtigung — repliziert sendMessageAction() 1:1, nur ohne
// eingeloggte Session (Service Role). Für End-to-End-Tests der
// Benachrichtigungskette (Nachricht → Mail im Postfach des Empfängers).
//
// Aufruf:  node scripts/send-real-message.mjs [recipientSlug] [senderSlug] [bodyText]
// Default: Pascal als Empfänger, Giannino als Absender.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
const body =
  process.argv[4] ??
  "Hoi Pascal, hier der Live-Test wie gewünscht: Zu dieser Nachricht solltest " +
    "du soeben automatisch eine E-Mail an dein Postfach erhalten haben. Die " +
    "Ursache ist gefunden und behoben – Details in meiner Antwort-Mail. " +
    "Beste Grüsse, Giannino";

const { newMessageEmail, sendEmail } = await import("../lib/email.ts");

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const [{ data: sender }, { data: recipient }] = await Promise.all([
  supabase
    .from("members")
    .select("id, slug, first, last, role, company, email, mobile, linkedin, show_email, show_mobile, branch, work")
    .eq("slug", senderSlug)
    .maybeSingle(),
  supabase.from("members").select("id, first, email").eq("slug", recipientSlug).maybeSingle(),
]);

if (!sender) throw new Error(`Absender (${senderSlug}) nicht gefunden.`);
if (!recipient) throw new Error(`Empfänger (${recipientSlug}) nicht gefunden.`);
if (!recipient.email) throw new Error(`Empfänger (${recipientSlug}) hat keine E-Mail.`);

// 1) Echte Nachricht in der DB — erscheint im Messages-Tab beider Member.
const { error: insErr } = await supabase
  .from("messages")
  .insert({ sender_id: sender.id, recipient_id: recipient.id, body });
if (insErr) throw new Error(`Insert messages fehlgeschlagen: ${insErr.message}`);
console.log(`✓ In-App-Nachricht angelegt (${sender.first} → ${recipient.first}).`);

// 2) Mailbenachrichtigung — wie notifyRecipient() in app/actions/messages.ts.
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
console.log(res.ok ? "✓ Mail versendet." : `✗ Mail fehlgeschlagen: ${res.reason}`);
process.exit(res.ok ? 0 : 1);
