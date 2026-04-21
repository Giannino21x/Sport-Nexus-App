"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function registerEventAction(eventId: string): Promise<{ error?: string; registered?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
  if (!me) return { error: "Kein Member-Profil gefunden." };

  // Check existing
  const { data: existing } = await supabase
    .from("event_registrations")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("member_id", me.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("event_registrations").delete().eq("event_id", eventId).eq("member_id", me.id);
    revalidatePath(`/events/${eventId}`);
    return { registered: false };
  }

  const { error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    member_id: me.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/events/${eventId}`);
  return { registered: true };
}
