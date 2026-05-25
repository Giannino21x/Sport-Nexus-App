"use server";

import { createClient } from "@/lib/supabase/server";

export type RecentWish = {
  id: string;
  createdAt: string;
  requesterName: string;
  targetName: string;
  requesterSlug: string | null;
  targetSlug: string | null;
};

export type AdminOverview = {
  memberCount: number;
  adminCount: number;
  upcomingEventCount: number;
  tableWishCount: number;
  recentWishes: RecentWish[];
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

  const today = new Date().toISOString().slice(0, 10);

  const [members, admins, events, wishes, recent] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("is_admin", true),
    supabase.from("events").select("id", { count: "exact", head: true }).gte("date", today),
    supabase.from("table_wishes").select("id", { count: "exact", head: true }),
    supabase
      .from("table_wishes")
      .select(
        `
        id,
        created_at,
        requester:members!table_wishes_requester_id_fkey (slug, first, last),
        target:members!table_wishes_target_id_fkey (slug, first, last)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  type RawWish = {
    id: string;
    created_at: string;
    requester: { slug: string | null; first: string; last: string } | null;
    target: { slug: string | null; first: string; last: string } | null;
  };
  const recentWishes: RecentWish[] = ((recent.data as unknown as RawWish[]) ?? []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    requesterName: `${r.requester?.first ?? "?"} ${r.requester?.last ?? ""}`.trim(),
    targetName: `${r.target?.first ?? "?"} ${r.target?.last ?? ""}`.trim(),
    requesterSlug: r.requester?.slug ?? null,
    targetSlug: r.target?.slug ?? null,
  }));

  return {
    data: {
      memberCount: members.count ?? 0,
      adminCount: admins.count ?? 0,
      upcomingEventCount: events.count ?? 0,
      tableWishCount: wishes.count ?? 0,
      recentWishes,
    },
  };
}
