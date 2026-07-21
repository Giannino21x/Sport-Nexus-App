"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Profilmutations-Log (Feedback 5): Member-Profiländerungen landen via
// DB-Trigger (migrations/20260612010000_profile_change_log.sql) in
// profile_changes — eine Zeile pro geändertem Feld. Admins prüfen die Liste
// und übernehmen relevante Mutationen manuell ins CRM (HubSpot).

export type AdminProfileChange = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  reviewedAt: string | null;
  member: {
    slug: string | null;
    first: string;
    last: string;
    company: string | null;
    role: string | null;
  };
};

export async function listProfileChangesAction(): Promise<{ items: AdminProfileChange[]; error?: string }> {
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
    .from("profile_changes")
    .select(
      `
      id,
      field,
      old_value,
      new_value,
      changed_at,
      reviewed_at,
      member:members!profile_changes_member_id_fkey (slug, first, last, company, role)
    `,
    )
    .order("changed_at", { ascending: false })
    .limit(500);

  if (error) return { items: [], error: error.message };

  type Raw = {
    id: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
    changed_at: string;
    reviewed_at: string | null;
    member: { slug: string | null; first: string; last: string; company: string | null; role: string | null } | null;
  };

  const items: AdminProfileChange[] = ((data as unknown) as Raw[] ?? []).map((r) => ({
    id: r.id,
    field: r.field,
    oldValue: r.old_value,
    newValue: r.new_value,
    changedAt: r.changed_at,
    reviewedAt: r.reviewed_at ?? null,
    member: r.member ?? { slug: null, first: "?", last: "", company: null, role: null },
  }));
  return { items };
}

// Admin-only: Änderung als "geprüft / im CRM übernommen" markieren (oder zurücksetzen).
export async function setProfileChangeReviewedAction(
  changeId: string,
  reviewed: boolean,
): Promise<{ reviewedAt?: string | null; error?: string }> {
  if (!changeId) return { error: "Keine Änderung übergeben." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };
  const { data: me } = await supabase
    .from("members")
    .select("is_admin")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!me?.is_admin) return { error: "Keine Berechtigung." };

  const reviewedAt = reviewed ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("profile_changes")
    .update({ reviewed_at: reviewedAt })
    .eq("id", changeId);
  if (error) return { error: error.message };

  revalidatePath("/admin/profile-changes");
  return { reviewedAt };
}
