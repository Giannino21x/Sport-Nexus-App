"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileInput = {
  first?: string;
  last?: string;
  company?: string;
  role?: string;
  branch?: string;
  sub?: string;
  work?: string;
  home?: string;
  email?: string;
  since?: string;
  bio?: string;
  offer?: string;
  search?: string;
  sports?: string[];
  mobile?: string;
  web?: string;
  linkedin?: string;
  showMobile?: boolean;
  showEmail?: boolean;
  matchmaking?: boolean;
  color?: string;
};

function parseSince(v?: string): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  // Accept "DD.MM.YYYY" or ISO "YYYY-MM-DD"
  const dotMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    return `${y}-${m}-${d}`;
  }
  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return trimmed;
  return null;
}

export async function updateProfileAction(input: ProfileInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const since = parseSince(input.since);

  const { error } = await supabase
    .from("members")
    .update({
      first: input.first ?? "",
      last: input.last ?? "",
      company: input.company ?? "",
      role: input.role ?? "",
      branch: input.branch ?? "",
      sub: input.sub ?? "",
      work: input.work ?? "",
      home: input.home ?? "",
      email: input.email ?? "",
      since,
      bio: input.bio ?? "",
      offer: input.offer ?? "",
      search: input.search ?? "",
      sports: input.sports ?? [],
      mobile: input.mobile ?? "",
      web: input.web ?? "",
      linkedin: input.linkedin ?? "",
      show_mobile: input.showMobile ?? true,
      show_email: input.showEmail ?? true,
      matchmaking: input.matchmaking ?? true,
      ...(input.color && /^#[0-9A-Fa-f]{6}$/.test(input.color) ? { color: input.color } : {}),
    })
    .eq("auth_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/directory");
  return {};
}

const MAX_AVATAR_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function uploadAvatarAction(
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Keine Datei empfangen." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Datei zu gross (max. 25 MB)." };
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { error: "Nur JPG, PNG oder WebP erlaubt." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });
  if (upErr) return { error: upErr.message };

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // Remove prior avatar files in this user's folder (keep only the new one).
  const { data: list } = await supabase.storage.from("avatars").list(user.id);
  const stale = (list ?? [])
    .map((o) => `${user.id}/${o.name}`)
    .filter((p) => p !== path);
  if (stale.length > 0) {
    await supabase.storage.from("avatars").remove(stale);
  }

  const { error: dbErr } = await supabase
    .from("members")
    .update({ avatar_url: publicUrl })
    .eq("auth_id", user.id);
  if (dbErr) return { error: dbErr.message };

  revalidatePath("/profile");
  revalidatePath("/directory");
  return { url: publicUrl };
}

export async function removeAvatarAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: list } = await supabase.storage.from("avatars").list(user.id);
  const paths = (list ?? []).map((o) => `${user.id}/${o.name}`);
  if (paths.length > 0) {
    await supabase.storage.from("avatars").remove(paths);
  }

  const { error: dbErr } = await supabase
    .from("members")
    .update({ avatar_url: "" })
    .eq("auth_id", user.id);
  if (dbErr) return { error: dbErr.message };

  revalidatePath("/profile");
  revalidatePath("/directory");
  return {};
}
