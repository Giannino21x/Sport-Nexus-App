"use server";

import { createClient } from "@/lib/supabase/server";

export type AdminOverview = {
  memberCount: number;
  adminCount: number;
  upcomingEventCount: number;
};

export async function getAdminOverviewAction(): Promise<{ data?: AdminOverview; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };
  const { data: me } = await supabase
    .from("members")
    .select("is_admin")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!me?.is_admin) return { error: "Keine Berechtigung." };

  // Zürcher Tagesdatum statt UTC — sonst zählt der Admin-Zähler nachts falsch.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());

  const [members, admins, events] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("is_admin", true),
    supabase.from("events").select("id", { count: "exact", head: true }).gte("date", today),
  ]);

  return {
    data: {
      memberCount: members.count ?? 0,
      adminCount: admins.count ?? 0,
      upcomingEventCount: events.count ?? 0,
    },
  };
}
