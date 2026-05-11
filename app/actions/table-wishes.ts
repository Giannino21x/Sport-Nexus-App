"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TableWish = {
  id: string;
  requesterId: string;
  targetId: string;
  createdAt: string;
};

export type AdminTableWish = TableWish & {
  requester: {
    slug: string | null;
    first: string;
    last: string;
    company: string | null;
    role: string | null;
  };
  target: {
    slug: string | null;
    first: string;
    last: string;
    company: string | null;
    role: string | null;
  };
};

// Holt die eigenen Tischwünsche (was ich mir gewünscht habe) — für die UI im
// Profildetail, um den Button-State (gemeldet vs. nicht gemeldet) auflösen zu
// können, ohne pro Profilbesuch eine separate Existenz-Abfrage zu machen.
export async function getMyTableWishesAction(): Promise<{ items: TableWish[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { items: [], error: "Nicht eingeloggt." };
  const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
  if (!me) return { items: [], error: "Kein Member-Profil." };

  const { data, error } = await supabase
    .from("table_wishes")
    .select("id, requester_id, target_id, created_at")
    .eq("requester_id", me.id);
  if (error) return { items: [], error: error.message };

  const items: TableWish[] = (data ?? []).map((r) => ({
    id: r.id,
    requesterId: r.requester_id,
    targetId: r.target_id,
    createdAt: r.created_at,
  }));
  return { items };
}

// Toggle: wenn schon gewünscht, lösche; sonst lege an. Liefert den neuen
// Status zurück, damit die UI ohne Refetch updaten kann.
export async function toggleTableWishAction(
  targetMemberId: string,
): Promise<{ wished?: boolean; error?: string }> {
  if (!targetMemberId) return { error: "Kein Ziel-Member übergeben." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };
  const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
  if (!me) return { error: "Kein Member-Profil." };
  if (me.id === targetMemberId) return { error: "Tischwunsch auf eigenes Profil nicht möglich." };

  const { data: existing } = await supabase
    .from("table_wishes")
    .select("id")
    .eq("requester_id", me.id)
    .eq("target_id", targetMemberId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("table_wishes").delete().eq("id", existing.id);
    if (error) return { error: error.message };
    revalidatePath(`/directory/${targetMemberId}`);
    revalidatePath("/admin/table-wishes");
    return { wished: false };
  }

  const { error } = await supabase
    .from("table_wishes")
    .insert({ requester_id: me.id, target_id: targetMemberId });
  if (error) return { error: error.message };
  revalidatePath(`/directory/${targetMemberId}`);
  revalidatePath("/admin/table-wishes");
  return { wished: true };
}

// Admin-only: alle Tischwünsche mit Namen + Datum für die Listenansicht.
export async function listAllTableWishesAction(): Promise<{ items: AdminTableWish[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { items: [], error: "Nicht eingeloggt." };
  const { data: me } = await supabase
    .from("members")
    .select("is_admin")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!me?.is_admin) return { items: [], error: "Keine Berechtigung." };

  const { data, error } = await supabase
    .from("table_wishes")
    .select(
      `
      id,
      requester_id,
      target_id,
      created_at,
      requester:members!table_wishes_requester_id_fkey (slug, first, last, company, role),
      target:members!table_wishes_target_id_fkey (slug, first, last, company, role)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) return { items: [], error: error.message };

  type Raw = {
    id: string;
    requester_id: string;
    target_id: string;
    created_at: string;
    requester: { slug: string | null; first: string; last: string; company: string | null; role: string | null } | null;
    target: { slug: string | null; first: string; last: string; company: string | null; role: string | null } | null;
  };

  const items: AdminTableWish[] = ((data as unknown) as Raw[] ?? []).map((r) => ({
    id: r.id,
    requesterId: r.requester_id,
    targetId: r.target_id,
    createdAt: r.created_at,
    requester: r.requester ?? { slug: null, first: "?", last: "", company: null, role: null },
    target: r.target ?? { slug: null, first: "?", last: "", company: null, role: null },
  }));
  return { items };
}
