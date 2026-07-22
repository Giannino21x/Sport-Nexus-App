// Server-only Email-Helper. Nutzt SMTP via Nodemailer — selbe Hostpoint-
// Credentials wie Supabase Auth (asmtp.mail.hostpoint.ch:587), nur dass wir
// sie hier aus ENV holen statt aus Supabase. Fehlt SMTP_PASS, fällt sendEmail
// auf no-op zurück (kein Throw, damit der Send-Action-Flow nicht blockiert).
//
// ACHTUNG Absenderdomain: Auth-User ist die Hostpoint-Mailbox
// no-reply@sport-nexus.ch (MIT Bindestrich), aber als From MUSS
// no-reply@sportnexus.ch (OHNE Bindestrich) raus — sport-nexus.ch ist nicht
// registriert (NXDOMAIN) und Gmail & Co. verwerfen Mails solcher Absender
// komplett (kein Spam-Ordner, einfach weg).

import nodemailer, { type Transporter } from "nodemailer";

// Die in Vercel hinterlegten Werte enden teils mit einem Zeilenumbruch
// (Copy-Paste ins Dashboard) — ungetrimmt schlägt dann schon der DNS-Lookup
// des Hosts fehl und alle Mails scheitern still.
const clean = (v: string | undefined) => v?.trim() || undefined;

const SMTP_HOST = clean(process.env.SMTP_HOST) ?? "asmtp.mail.hostpoint.ch";
const SMTP_PORT = Number(clean(process.env.SMTP_PORT) ?? "587");
const SMTP_USER = clean(process.env.SMTP_USER) ?? "no-reply@sport-nexus.ch";
const SMTP_FROM = clean(process.env.SMTP_FROM) ?? "SportNexus <no-reply@sportnexus.ch>";
const APP_URL = clean(process.env.APP_URL) ?? "https://sport-nexus-app.vercel.app";

let transporter: Transporter | null = null;
function getTransporter(): Transporter | null {
  const pass = clean(process.env.SMTP_PASS);
  if (!pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      // 587 = STARTTLS (secure: false + requireTLS), 465 = implicit TLS.
      secure: SMTP_PORT === 465,
      requireTLS: SMTP_PORT === 587,
      auth: { user: SMTP_USER, pass },
    });
  }
  return transporter;
}

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(p: EmailPayload): Promise<{ ok: true } | { ok: false; reason: string }> {
  const tx = getTransporter();
  if (!tx) {
    // IMMER loggen (auch in Prod) — fehlt SMTP_PASS, fallen sonst Passwort-
    // Reset- und Benachrichtigungs-Mails komplett still aus.
    console.error("[email] SMTP_PASS fehlt — Mail NICHT versendet:", p.to, "—", p.subject);
    return { ok: false, reason: "SMTP_PASS missing" };
  }
  try {
    await tx.sendMail({
      from: SMTP_FROM,
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
  slug: string | null;
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
  // Alle Profilfelder escapen — sie sind von Members frei editierbar und
  // landen sonst als rohes HTML in einer vertrauenswürdigen SportNexus-Mail.
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
  const fullName = esc(`${opts.sender.first} ${opts.sender.last}`.trim());
  const role = esc([opts.sender.role, opts.sender.company].filter(Boolean).join(" · "));
  const greeting = opts.recipientFirst ? `Hallo ${esc(opts.recipientFirst)},` : "Hallo,";
  const subject = `Neue Nachricht von ${fullName}`;
  const replyUrl = opts.sender.slug
    ? `${APP_URL}/messages?to=${encodeURIComponent(opts.sender.slug)}`
    : `${APP_URL}/messages`;
  const profileUrl = opts.sender.slug ? `${APP_URL}/directory/${encodeURIComponent(opts.sender.slug)}` : null;

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
  const linkedinRaw = opts.sender.linkedin
    ? (opts.sender.linkedin.startsWith("http") ? opts.sender.linkedin : `https://${opts.sender.linkedin}`)
    : null;
  // Nur echte http(s)-URLs in den href lassen (kein javascript: o.ä.).
  const linkedinHref = linkedinRaw && /^https?:\/\/[\w.-]/i.test(linkedinRaw) ? esc(linkedinRaw) : null;
  const senderEmail = opts.sender.email?.trim() ? esc(opts.sender.email.trim()) : null;
  const senderMobile = opts.sender.mobile?.trim() ? esc(opts.sender.mobile.trim()) : null;
  const hasContact = Boolean(senderEmail || senderMobile || linkedinHref);

  const contextLine = esc([opts.sender.branch, opts.sender.work].filter(Boolean).join(" · "));

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
      ${profileUrl ? `<a href="${profileUrl}" style="display:inline-block; background:#fff; color:#000; padding:11px 18px; border-radius:6px; text-decoration:none; font-size:14px; border:1px solid #D9D9D9;">Profil ansehen</a>` : ""}
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
    profileUrl ? `Profil: ${profileUrl}` : "",
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

// Template: Passwort-Reset. Wird ueber unseren Hostpoint-Nodemailer verschickt
// statt ueber den Supabase-internen SMTP, weil dort ein Rate-Limit greift
// (Free-Plan: ~4 Reset-Mails/h) und Pascal seine Mail nicht erhalten hat.
export function passwordResetEmail(opts: {
  recoveryUrl: string;
  recipientFirst?: string | null;
}): { subject: string; html: string; text: string } {
  const greeting = opts.recipientFirst ? `Hallo ${opts.recipientFirst},` : "Hallo,";
  const subject = "SportNexus · Passwort zurücksetzen";

  const html = `<!doctype html><html><body style="margin:0; padding:0; background:#F7F7F7; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#000;">
  <div style="max-width:560px; margin:24px auto; padding:32px; background:#FFFFFF; border-radius:8px;">
    <div style="font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#868686;">SportNexus · Passwort-Reset</div>
    <h1 style="font-size:22px; font-weight:600; margin:14px 0 6px; color:#000;">${greeting}</h1>
    <p style="margin:0 0 18px; font-size:15px; line-height:1.5; color:#000;">
      Klicke auf den Button unten, um ein neues Passwort fuer deinen SportNexus-Account zu setzen. Der Link ist 24 Stunden gueltig.
    </p>
    <div style="margin:24px 0;">
      <a href="${opts.recoveryUrl}" style="display:inline-block; background:#000; color:#fff; padding:11px 18px; border-radius:6px; text-decoration:none; font-size:14px; font-weight:500;">Neues Passwort setzen</a>
    </div>
    <p style="margin:18px 0 0; font-size:12.5px; line-height:1.5; color:#575757;">
      Falls der Button nicht funktioniert, kopiere diesen Link in den Browser:<br>
      <span style="word-break:break-all; color:#006FB6;">${opts.recoveryUrl}</span>
    </p>
    <hr style="margin:32px 0; border:none; border-top:1px solid #ECECEC;">
    <p style="font-size:11px; color:#868686; margin:0; line-height:1.5;">
      Du hast diesen Reset nicht angefordert? Dann ignoriere diese Mail — dein Passwort bleibt unveraendert.
    </p>
  </div>
</body></html>`;

  const text = [
    greeting,
    ``,
    `Klicke auf den Link unten, um ein neues Passwort zu setzen (24 Stunden gueltig):`,
    ``,
    opts.recoveryUrl,
    ``,
    `Du hast diesen Reset nicht angefordert? Dann ignoriere diese Mail.`,
  ].join("\n");

  return { subject, html, text };
}
