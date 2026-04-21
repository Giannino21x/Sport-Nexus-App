"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
