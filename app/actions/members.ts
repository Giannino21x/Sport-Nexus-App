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
    })
    .eq("auth_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/directory");
  return {};
}
