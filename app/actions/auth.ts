"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createAdminClient, type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import { verifyInviteToken } from "@/lib/invite-token";

async function appOrigin() {
  // Env-Wert bevorzugen — Request-Header (host/x-forwarded-host) sind ausserhalb
  // von Vercel spoofbar, und der Origin landet im Passwort-Reset-Link.
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
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
  // Nur app-interne Pfade — "//evil.com" ist eine protokoll-relative externe
  // URL und wäre ein Open Redirect nach erfolgreichem Login.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

// SICHERHEIT: Selbstregistrierung ist DEAKTIVIERT. SportNexus ist ein
// geschlossener Member-Club — Accounts entstehen ausschliesslich über das
// Onboarding (scripts/hubspot-onboard.mjs) bzw. Admin-Invites. Die frühere
// Implementierung (admin.createUser mit email_confirm:true) war ein offener
// Endpoint: Kombiniert mit dem handle_new_user-Trigger (Auto-Link per
// E-Mail-Match) hätte jeder mit Kenntnis einer Member-E-Mail dieses Profil
// übernehmen können. Nicht reaktivieren ohne Invite-Token-Flow.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Signatur muss für useActionState erhalten bleiben
export async function signUpAction(_prevState: { error?: string; info?: string } | undefined, _formData: FormData) {
  return {
    error: "Die Registrierung ist nur auf Einladung möglich. Melde dich bei uns, wenn du Mitglied werden möchtest.",
  };
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

  // Wir generieren den Recovery-Link via Admin-API und versenden ihn ueber
  // unseren Hostpoint-Nodemailer (lib/email.ts) — NICHT ueber den
  // Supabase-Auth-internen SMTP. Grund: Pascals Reset-Mail kam nicht an
  // (Free-Plan-Rate-Limit ~4/h, plus moegliche Config-Drift im Dashboard).
  // Selbe SMTP-Credentials, aber der Pfad ueber unseren Nodemailer ist
  // erwiesenermassen zuverlaessig (App-Notification-Mails laufen darueber).
  try {
    const admin = adminClient();
    const { data, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/auth/callback?next=/reset-password` },
    });

    // WICHTIG: Wir versenden NICHT den Supabase-action_link (der verifiziert den
    // Einmal-Token schon beim GET auf /auth/v1/verify). Mail-Security-Scanner
    // (Outlook SafeLinks, Defender, Proxies) rufen Links automatisch vorab auf
    // und verbrauchen damit den Token, BEVOR der User klickt — Resultat:
    // "Link ungültig oder abgelaufen". Stattdessen bauen wir den Link auf unsere
    // eigene /reset-confirm-Seite mit dem hashed_token. Dort wird NICHTS beim
    // Laden verifiziert — erst der echte Button-Klick (POST) löst verifyOtp aus.
    // Scanner folgen GET-Links, drücken aber keine Buttons → Token überlebt.
    const tokenHash = data?.properties?.hashed_token;
    if (!linkErr && tokenHash) {
      const recoveryUrl = `${origin}/reset-confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
      let recipientFirst: string | null = null;
      if (data.user?.id) {
        const { data: m } = await admin
          .from("members")
          .select("first")
          .eq("auth_id", data.user.id)
          .maybeSingle();
        recipientFirst = m?.first || null;
      }
      const tpl = passwordResetEmail({
        recoveryUrl,
        recipientFirst,
      });
      const sent = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      // Serverseitig loggen, wenn der Versand scheitert — die User-Antwort
      // bleibt bewusst neutral (keine Enumeration), aber wir müssen es sehen.
      if (!sent.ok) console.error("[requestPasswordResetAction] Mail-Versand fehlgeschlagen:", sent.reason);
    } else if (linkErr) {
      // "User not found" ist hier der einzig erwartete Fall — bewusst still.
      const msg = linkErr.message.toLowerCase();
      if (!msg.includes("not found") && !msg.includes("user")) {
        console.error("[generateLink:recovery]", linkErr.message);
      }
    }
  } catch (e) {
    console.error("[requestPasswordResetAction]", e instanceof Error ? e.message : e);
  }

  // Antwort bleibt info-neutral — keine User-Enumeration.
  return {
    info: "Falls ein Account mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen geschickt. Prüfe auch den Spam-Ordner.",
  };
}

// Wird vom Button auf /reset-confirm aufgerufen (echter User-Klick, POST).
// Erst HIER wird der Einmal-Token verbraucht — nicht beim Laden der Seite —
// damit Mail-Scanner den Recovery-Token nicht vorab entwerten. Bei Erfolg ist
// die Recovery-Session gesetzt und /reset-password zeigt das Passwort-Formular.
export async function confirmRecoveryAction(formData: FormData) {
  const token_hash = String(formData.get("token_hash") || "");
  const type = (String(formData.get("type") || "recovery") || "recovery") as EmailOtpType;
  if (!token_hash) redirect("/login?error=missing_code");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) redirect("/login?error=reset_invalid");

  (await cookies()).set("sn-mode", "live", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/reset-password");
}

// Wird vom Button auf /invite aufgerufen (Langzeit-Einladungslink, siehe
// lib/invite-token.ts). Der Mail-Link hält 4 Wochen; der eigentliche Supabase-
// Recovery-OTP wird erst HIER beim echten Klick gemintet und sofort verbraucht.
// Danach ist die Recovery-Session gesetzt und /reset-password zeigt das
// Passwort-Formular.
export async function confirmInviteAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const v = verifyInviteToken(token);
  if (!v.email) redirect("/login?error=reset_invalid");

  let tokenHash: string | null = null;
  try {
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: v.email });
    if (error) console.error("[confirmInviteAction] generateLink:", error.message);
    else tokenHash = data?.properties?.hashed_token ?? null;
  } catch (e) {
    console.error("[confirmInviteAction]", e instanceof Error ? e.message : e);
  }
  if (!tokenHash) redirect("/login?error=reset_invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (error) redirect("/login?error=reset_invalid");

  (await cookies()).set("sn-mode", "live", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/reset-password");
}

// Liefert die aktuelle Auth-E-Mail (= Login-E-Mail) des eingeloggten Users.
// Wird in /settings angezeigt, damit Member sehen, mit welcher Adresse sie sich
// einloggen — getrennt von der Profil-E-Mail, die für andere Members sichtbar ist.
export async function getAuthEmailAction(): Promise<{ email?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };
  return { email: user.email ?? "" };
}

// Aktualisiert die Auth-E-Mail (Login). Supabase schickt anschliessend
// Bestätigungs-Mails an alte UND neue Adresse. Der Wechsel wird erst aktiv,
// sobald die neue Adresse bestätigt ist.
export async function updateAuthEmailAction(newEmail: string): Promise<{ info?: string; error?: string }> {
  const email = newEmail.trim().toLowerCase();
  if (!email) return { error: "E-Mail erforderlich." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };
  if (user.email?.toLowerCase() === email) {
    return { error: "Das ist bereits deine aktuelle Adresse." };
  }
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };
  return {
    info: "Bestätigungs-Link an die neue Adresse geschickt. Der Wechsel wird aktiv, sobald du den Link klickst.",
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
