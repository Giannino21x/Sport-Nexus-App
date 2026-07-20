"use server";

import { createClient } from "@/lib/supabase/server";

// Markiert alle Benachrichtigungen des eingeloggten Members als gelesen.
// Wird beim Öffnen des Glocken-Popovers aufgerufen — vorher blieb der rote
// Unread-Punkt für immer stehen, weil nirgends ein Update lief.
// RLS: notifications_update_self (initial_schema) erlaubt genau diesen Write.
export async function markNotificationsReadAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };
  const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
  if (!me) return { error: "Kein Member-Profil gefunden." };

  const { error } = await supabase
    .from("notifications")
    .update({ unread: false })
    .eq("member_id", me.id)
    .eq("unread", true);
  if (error) return { error: error.message };
  return {};
}
