import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendPushToMember } from "@/lib/push-server";

// Wird vom DB-Trigger notifications_dispatch_push (pg_net) für jede neue
// Notification aufgerufen. Lädt die Zeile per Service-Role nach (die Payload
// ist damit nie die Quelle der Wahrheit) und verschickt FCM/APNs.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret || req.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { id?: string | number } | null;
  if (!body?.id) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: notif } = await supabase
    .from("notifications")
    .select("id, member_id, title, preview, link")
    .eq("id", body.id)
    .maybeSingle();
  if (!notif) return NextResponse.json({ ok: false }, { status: 404 });

  await sendPushToMember(String(notif.member_id), {
    title: String(notif.title ?? "SportNexus"),
    body: String(notif.preview ?? ""),
    link: notif.link ? String(notif.link) : "",
  });
  return NextResponse.json({ ok: true });
}
