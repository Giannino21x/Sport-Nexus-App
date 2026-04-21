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

export async function likePostAction(postId: string): Promise<{ error?: string; likes?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data, error } = await supabase.rpc("increment_post_likes", { p_post_id: postId });
  if (error) return { error: error.message };

  revalidatePath("/feed");
  return { likes: typeof data === "number" ? data : undefined };
}
