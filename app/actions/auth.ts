"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");
  return `${proto}://${host}`;
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function signInAction(prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "E-Mail und Passwort erforderlich." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  // Successful sign-in → force live mode (so middleware protects routes).
  (await cookies()).set("sn-mode", "live", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const next = String(formData.get("next") || "/dashboard");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUpAction(prevState: { error?: string; info?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const first = String(formData.get("first") || "").trim();
  const last = String(formData.get("last") || "").trim();

  if (!email || !password) return { error: "E-Mail und Passwort erforderlich." };
  if (password.length < 8) return { error: "Passwort muss mindestens 8 Zeichen haben." };
  if (!first || !last) return { error: "Vor- und Nachname erforderlich." };

  // Create the auth user via admin API with email already confirmed, so we can sign them in
  // immediately. This avoids requiring SMTP setup in Supabase for confirmation emails.
  const admin = adminClient();
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first, last },
  });
  if (createErr) {
    // Friendly message for the most common case
    if (createErr.message.toLowerCase().includes("already")) {
      return { error: "Diese E-Mail ist bereits registriert." };
    }
    return { error: createErr.message };
  }

  // Sign the new user in (sets auth cookies)
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) return { error: signInErr.message };

  (await cookies()).set("sn-mode", "live", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(
  prevState: { error?: string; info?: string } | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "E-Mail erforderlich." };

  const origin = await appOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Don't leak which addresses are registered — same response either way.
  if (error) console.error("[resetPasswordForEmail]", error.message);

  return {
    info: "Falls ein Account mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen geschickt. Prüfe auch den Spam-Ordner.",
  };
}

export async function updatePasswordAction(
  prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { error: "Passwort muss mindestens 8 Zeichen haben." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Dein Reset-Link ist abgelaufen. Bitte fordere einen neuen an." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  (await cookies()).set("sn-mode", "live", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/dashboard");
}
