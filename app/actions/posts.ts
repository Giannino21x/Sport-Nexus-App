"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
