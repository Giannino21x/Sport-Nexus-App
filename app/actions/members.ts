"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileInput = {
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

export async function updateProfileAction(input: ProfileInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { error } = await supabase
    .from("members")
    .update({
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
