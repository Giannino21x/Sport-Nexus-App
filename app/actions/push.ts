"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// push_tokens hat RLS ohne Policies — Schreibzugriff läuft bewusst nur über
// den Service-Role-Key, nachdem die Session hier serverseitig geprüft wurde.
function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function currentMemberDbId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await adminClient()
    .from("members")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  return data ? String(data.id) : null;
}

// Geräte-Token registrieren/erneuern. Upsert auf den Token selbst: wechselt
// das Gerät den Besitzer (Logout → Login als anderer Member), wandert der
// Token mit — es bekommt nie zwei Members denselben Gerätepush.
export async function savePushTokenAction(
  token: string,
  platform: "ios" | "android",
): Promise<{ ok: boolean }> {
  const t = token.trim();
  if (!t || t.length > 4096) return { ok: false };
  if (platform !== "ios" && platform !== "android") return { ok: false };
  const memberId = await currentMemberDbId();
  if (!memberId) return { ok: false };
  const { error } = await adminClient()
    .from("push_tokens")
    .upsert({ token: t, member_id: memberId, platform, updated_at: new Date().toISOString() });
  if (error) console.error("[savePushTokenAction]", error.message);
  return { ok: !error };
}

// Beim Logout aufrufen: das Gerät soll keine Pushes des alten Users mehr
// bekommen.
export async function removePushTokenAction(token: string): Promise<{ ok: boolean }> {
  const t = token.trim();
  if (!t) return { ok: false };
  const memberId = await currentMemberDbId();
  if (!memberId) return { ok: false };
  const { error } = await adminClient()
    .from("push_tokens")
    .delete()
    .eq("token", t)
    .eq("member_id", memberId);
  return { ok: !error };
}
