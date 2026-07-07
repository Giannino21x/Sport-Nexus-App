import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// TEMPORÄRE Shell-Diagnose (2026-07-07): nimmt Viewport-Messwerte der nativen
// App-Hülle entgegen (app-shell.tsx sendet sie nur, wenn window.Capacitor
// existiert) und legt sie in public.shell_diag ab. Dient dazu, das Safe-Area-
// Verhalten der installierten Binary-Generationen (contentInset 'always' vs.
// 'never') mit echten Gerätedaten zu klären. Nach der Analyse wieder
// entfernen (Route + Tabelle + Beacon).

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > 4000) return NextResponse.json({ ok: false }, { status: 413 });
    const payload = JSON.parse(raw);
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { error } = await admin.from("shell_diag").insert({ payload });
    if (error) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
