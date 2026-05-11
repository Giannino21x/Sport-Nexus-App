// Server-only Email-Helper. Verwendet Resend, fällt aber graceful auf no-op
// zurück wenn RESEND_API_KEY nicht gesetzt ist (z. B. lokal ohne Key oder in
// Demo-Modus). Kein Throw — Email ist Best-Effort, darf den eigentlichen
// Server-Action-Flow nicht blockieren.

import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "SportNexus <no-reply@sport-nexus.ch>";
const APP_URL = process.env.APP_URL ?? "https://sport-nexus.ch";

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(p: EmailPayload): Promise<{ ok: true } | { ok: false; reason: string }> {
  const resend = getClient();
  if (!resend) {
    if (process.env.NODE_ENV === "development") {
      console.log("[email] (dev no-op)", p.to, "—", p.subject);
    }
    return { ok: false, reason: "RESEND_API_KEY missing" };
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: p.to,
      subject: p.subject,
      html: p.html,
      text: p.text ?? p.html.replace(/<[^>]+>/g, ""),
    });
    return { ok: true };
  } catch (e) {
    console.error("[email] send failed:", e instanceof Error ? e.message : e);
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

// Template: Neue Nachricht von einem Member.
type Sender = {
  first: string;
  last: string;
  role?: string | null;
  company?: string | null;
  slug: string;
  // Optionale Kontaktdaten — werden nur reingerendert, wenn der Sender sie
  // freigegeben hat. Pascal: damit die Konversation auch ausserhalb der App
  // weiterlaufen kann (Reply per Mail, Anruf, LinkedIn).
  email?: string | null;
  mobile?: string | null;
  linkedin?: string | null;
  branch?: string | null;
  work?: string | null;
};
export function newMessageEmail(opts: {
  senderName: string;
  sender: Sender;
  bodyPreview: string;
  hasAttachment?: boolean;
  recipientFirst?: string | null;
}): { subject: string; html: string; text: string } {
  const fullName = `${opts.sender.first} ${opts.sender.last}`.trim();
  const role = [opts.sender.role, opts.sender.company].filter(Boolean).join(" · ");
  const greeting = opts.recipientFirst ? `Hallo ${opts.recipientFirst},` : "Hallo,";
  const subject = `Neue Nachricht von ${fullName}`;
  const replyUrl = `${APP_URL}/messages?to=${encodeURIComponent(opts.sender.slug)}`;
  const profileUrl = `${APP_URL}/directory/${encodeURIComponent(opts.sender.slug)}`;

  const previewClean = opts.bodyPreview
    .replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] ?? c))
    .slice(0, 400);
  const preview = previewClean
    ? `<blockquote style="margin:18px 0; padding:14px 18px; border-left:3px solid #C3A75E; background:#F4ECD7; border-radius:4px; color:#000; font-size:14px; line-height:1.55; white-space:pre-wrap;">${previewClean}${opts.bodyPreview.length > 400 ? "…" : ""}</blockquote>`
    : "";
  const attachmentNote = opts.hasAttachment
    ? `<div style="margin:14px 0; padding:10px 14px; background:#F4F4F4; border-radius:6px; color:#575757; font-size:13px;">📎 Mit einem Bild im Anhang.</div>`
    : "";

  // Kontakt-Block für externe Follow-ups — nur sichtbar, wenn mindestens ein
  // freigegebenes Kontaktfeld vorhanden ist.
  const linkedinHref = opts.sender.linkedin
    ? (opts.sender.linkedin.startsWith("http") ? opts.sender.linkedin : `https://${opts.sender.linkedin}`)
    : null;
  const senderEmail = opts.sender.email?.trim() || null;
  const senderMobile = opts.sender.mobile?.trim() || null;
  const hasContact = Boolean(senderEmail || senderMobile || linkedinHref);

  const contextLine = [opts.sender.branch, opts.sender.work].filter(Boolean).join(" · ");

  const contactRows = hasContact
    ? `<table cellpadding="0" cellspacing="0" border="0" style="margin:18px 0; width:100%; background:#FAFAFA; border-radius:6px;">
        <tbody>
          <tr>
            <td style="padding:14px 18px;">
              <div style="font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#868686; margin-bottom:8px;">Kontakt von ${fullName}</div>
              ${senderEmail ? `<div style="font-size:13.5px; line-height:1.55; color:#000;">E-Mail: <a href="mailto:${senderEmail}" style="color:#006FB6; text-decoration:underline;">${senderEmail}</a></div>` : ""}
              ${senderMobile ? `<div style="font-size:13.5px; line-height:1.55; color:#000;">Mobile: <a href="tel:${senderMobile.replace(/\s+/g, "")}" style="color:#006FB6; text-decoration:underline;">${senderMobile}</a></div>` : ""}
              ${linkedinHref ? `<div style="font-size:13.5px; line-height:1.55; color:#000;">LinkedIn: <a href="${linkedinHref}" style="color:#006FB6; text-decoration:underline;">${linkedinHref.replace(/^https?:\/\//, "")}</a></div>` : ""}
              ${contextLine ? `<div style="font-size:12px; color:#575757; margin-top:8px;">${contextLine}</div>` : ""}
            </td>
          </tr>
        </tbody>
      </table>`
    : "";

  const html = `<!doctype html><html><body style="margin:0; padding:0; background:#F7F7F7; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#000;">
  <div style="max-width:560px; margin:24px auto; padding:32px; background:#FFFFFF; border-radius:8px;">
    <div style="font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#868686;">SportNexus · Neue Nachricht</div>
    <h1 style="font-size:22px; font-weight:600; margin:14px 0 6px; color:#000;">${greeting}</h1>
    <p style="margin:0 0 18px; font-size:15px; line-height:1.5; color:#000;">
      <strong>${fullName}</strong>${role ? ` — <span style="color:#575757">${role}</span>` : ""} hat dir eine Nachricht im SportNexus-Memberbereich geschickt.
    </p>
    ${preview}
    ${attachmentNote}
    ${contactRows}
    <div style="margin-top:24px; display:flex; gap:10px;">
      <a href="${replyUrl}" style="display:inline-block; background:#000; color:#fff; padding:11px 18px; border-radius:6px; text-decoration:none; font-size:14px; font-weight:500;">Antworten in der App</a>
      <a href="${profileUrl}" style="display:inline-block; background:#fff; color:#000; padding:11px 18px; border-radius:6px; text-decoration:none; font-size:14px; border:1px solid #D9D9D9;">Profil ansehen</a>
    </div>
    <hr style="margin:32px 0; border:none; border-top:1px solid #ECECEC;">
    <p style="font-size:11px; color:#868686; margin:0; line-height:1.5;">
      Du erhältst diese E-Mail als SportNexus-Mitglied. Du kannst direkt in der App antworten oder die oben aufgeführten Kontaktdaten nutzen.
    </p>
  </div>
</body></html>`;

  const text = [
    `${greeting}`,
    ``,
    `${fullName}${role ? ` — ${role}` : ""} hat dir eine Nachricht geschickt.`,
    ``,
    opts.bodyPreview ? `> ${opts.bodyPreview.slice(0, 400)}${opts.bodyPreview.length > 400 ? "…" : ""}` : "",
    opts.hasAttachment ? `(Bild im Anhang)` : "",
    hasContact ? `\nKontakt:` : "",
    senderEmail ? `  E-Mail: ${senderEmail}` : "",
    senderMobile ? `  Mobile: ${senderMobile}` : "",
    linkedinHref ? `  LinkedIn: ${linkedinHref}` : "",
    contextLine ? `  ${contextLine}` : "",
    ``,
    `Antworten in der App: ${replyUrl}`,
    `Profil: ${profileUrl}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
