"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { newMessageEmail, sendEmail } from "@/lib/email";

type MessageSender = {
  id: string;
  slug: string | null;
  first: string;
  last: string;
  role: string | null;
  company: string | null;
  email: string | null;
  mobile: string | null;
  linkedin: string | null;
  show_email: boolean | null;
  show_mobile: boolean | null;
  branch: string | null;
  work: string | null;
};

type MessageRecipient = {
  email: string | null;
  first: string | null;
};

// Holt Sender + Empfänger fürs Email-Notification-Template (best-effort).
// Der Sender liefert zusätzlich Kontaktdaten (Email, Mobile, LinkedIn) — die
// schicken wir mit, wenn der Sender Sichtbarkeit erlaubt hat. So kann der
// Empfänger direkt extern weitermachen, ohne erst in die App zurück zu müssen.
async function loadMessageParties(
  supabase: Awaited<ReturnType<typeof createClient>>,
  meId: string,
  recipientId: string,
): Promise<{ sender: MessageSender | null; recipient: MessageRecipient | null }> {
  const [{ data: sender }, { data: recipient }] = await Promise.all([
    supabase
      .from("members")
      .select("id, slug, first, last, role, company, email, mobile, linkedin, show_email, show_mobile, branch, work")
      .eq("id", meId)
      .maybeSingle(),
    supabase.from("members").select("first, email").eq("id", recipientId).maybeSingle(),
  ]);
  return { sender: sender as MessageSender | null, recipient: recipient as MessageRecipient | null };
}

// Fire-and-forget E-Mail an den Empfänger (kein await im Aufrufer).
async function notifyRecipient(args: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  meId: string;
  recipientId: string;
  body: string;
  hasAttachment?: boolean;
}): Promise<void> {
  try {
    const { sender, recipient } = await loadMessageParties(args.supabase, args.meId, args.recipientId);
    if (!sender || !recipient?.email) return;
    if (!sender.slug) return; // ohne Slug kein Profil-Link → trotzdem senden, aber nicht ohne Identität
    const tpl = newMessageEmail({
      senderName: `${sender.first} ${sender.last}`,
      sender: {
        first: sender.first,
        last: sender.last,
        role: sender.role,
        company: sender.company,
        slug: sender.slug,
        // Kontaktdaten nur weiterreichen, wenn der Sender sie freigegeben hat
        // (Sichtbarkeits-Toggles im Profil) — damit das Email-Template eine
        // verlässliche Vorlage liefert und keine privaten Daten leakt.
        email: sender.show_email ? sender.email : null,
        mobile: sender.show_mobile ? sender.mobile : null,
        linkedin: sender.linkedin,
        branch: sender.branch,
        work: sender.work,
      },
      bodyPreview: args.body,
      hasAttachment: args.hasAttachment,
      recipientFirst: recipient.first,
    });
    await sendEmail({ to: recipient.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
  } catch (e) {
    console.error("[messages] notifyRecipient error:", e instanceof Error ? e.message : e);
  }
}

export async function sendMessageAction(recipientDbId: string, body: string): Promise<{ error?: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Nachricht ist leer." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
  if (!me) return { error: "Kein Member-Profil gefunden." };

  const { error } = await supabase.from("messages").insert({
    sender_id: me.id,
    recipient_id: recipientDbId,
    body: trimmed,
  });
  if (error) return { error: error.message };

  // Email-Benachrichtigung — via after(): läuft nach der Response, aber Vercel
  // hält die Function am Leben (waitUntil). Ein nacktes `void ...` wurde beim
  // Einfrieren der Lambda abgebrochen → Mails kamen nie an (Pascal-Feedback).
  after(() => notifyRecipient({ supabase, meId: me.id, recipientId: recipientDbId, body: trimmed }));

  revalidatePath("/messages");
  return {};
}

const MAX_CHAT_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_CHAT_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export async function sendMessageWithAttachmentAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const recipientDbId = String(formData.get("recipientDbId") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const file = formData.get("file");

  if (!recipientDbId) return { error: "Kein Empfänger ausgewählt." };
  if (!(file instanceof File) || file.size === 0) return { error: "Keine Datei empfangen." };
  if (file.size > MAX_CHAT_IMAGE_BYTES) return { error: "Datei zu gross (max. 25 MB)." };
  if (!ALLOWED_CHAT_IMAGE_TYPES.has(file.type)) return { error: "Nur JPG, PNG, WebP oder GIF erlaubt." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
  if (!me) return { error: "Kein Member-Profil gefunden." };

  const extMap: Record<string, string> = {
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = extMap[file.type] ?? "jpg";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("chat-attachments")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) return { error: upErr.message };

  const { data: pub } = supabase.storage.from("chat-attachments").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error } = await supabase.from("messages").insert({
    sender_id: me.id,
    recipient_id: recipientDbId,
    body: body || "",
    attachment_url: publicUrl,
  });
  if (error) return { error: error.message };

  after(() => notifyRecipient({ supabase, meId: me.id, recipientId: recipientDbId, body: body || "(Bild)", hasAttachment: true }));

  revalidatePath("/messages");
  return {};
}

export async function markThreadReadAction(otherDbId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
  if (!me) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherDbId)
    .eq("recipient_id", me.id)
    .is("read_at", null);
}
