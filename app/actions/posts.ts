"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_POST_IMAGE_BYTES = 25 * 1024 * 1024;
const ALLOWED_POST_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export async function createPostAction(body: string, tag = ""): Promise<{ error?: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Post ist leer." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
  if (!me) return { error: "Kein Member-Profil gefunden." };

  const { error } = await supabase.from("posts").insert({
    author_id: me.id,
    body: trimmed,
    kind: "share",
    tag,
  });
  if (error) return { error: error.message };

  revalidatePath("/feed");
  return {};
}

export async function createPostWithImageAction(formData: FormData): Promise<{ error?: string }> {
  const body = String(formData.get("body") || "").trim();
  const tag = String(formData.get("tag") || "").trim();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) return { error: "Keine Datei empfangen." };
  if (file.size > MAX_POST_IMAGE_BYTES) return { error: "Datei zu gross (max. 25 MB)." };
  if (!ALLOWED_POST_IMAGE_TYPES.has(file.type)) return { error: "Nur JPG, PNG, WebP oder GIF erlaubt." };

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
    .from("post-images")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) return { error: upErr.message };

  const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);

  const { error } = await supabase.from("posts").insert({
    author_id: me.id,
    body,
    kind: "share",
    tag,
    image_url: pub.publicUrl,
  });
  if (error) return { error: error.message };

  revalidatePath("/feed");
  return {};
}

export async function updatePostAction(
  postId: string,
  body: string,
): Promise<{ error?: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Post darf nicht leer sein." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { error } = await supabase
    .from("posts")
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath("/feed");
  return {};
}

export async function deletePostAction(postId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath("/feed");
  return {};
}

export async function togglePostLikeAction(
  postId: string,
): Promise<{ error?: string; liked?: boolean; likes?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data, error } = await supabase.rpc("toggle_post_like", { p_post_id: postId });
  if (error) return { error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  revalidatePath("/feed");
  return { liked: Boolean(row?.liked), likes: Number(row?.likes_count ?? 0) };
}

export async function createReplyAction(
  postId: string,
  body: string,
): Promise<{ error?: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Antwort ist leer." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
  if (!me) return { error: "Kein Member-Profil gefunden." };

  const { error } = await supabase.from("post_replies").insert({
    post_id: postId,
    author_id: me.id,
    body: trimmed,
  });
  if (error) return { error: error.message };

  revalidatePath("/feed");
  return {};
}

export async function deleteReplyAction(replyId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { error } = await supabase.from("post_replies").delete().eq("id", replyId);
  if (error) return { error: error.message };

  revalidatePath("/feed");
  return {};
}
