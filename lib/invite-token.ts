import { createHmac, timingSafeEqual } from "node:crypto";

// Langzeit-Login-Links für Einladungs-Mails (Pascal: Links sollen ~4 Wochen
// gelten, Supabase-OTPs können aber max. 24h). Der Mail-Link trägt deshalb nur
// E-Mail + Ablaufzeit, HMAC-signiert mit einem aus dem Service-Role-Key
// abgeleiteten Secret. Der eigentliche Supabase-Recovery-OTP wird erst beim
// Button-Klick auf /invite gemintet und sofort verbraucht — Mail-Scanner-
// Prefetch (GET) kann nichts entwerten, und die OTP-Lebensdauer bleibt
// unangetastet. Trade-off: der Link ist bis zum Ablauf mehrfach verwendbar
// (wie ein Magic-Link, der weitergeleitet wird) — bewusst akzeptiert.
//
// MUSS synchron bleiben mit makeLongInviteLink in scripts/hubspot-onboard.mjs.

function secret(): Buffer {
  // trim(): Der Vercel-Env-Wert endet mit einem Zeilenumbruch (vgl. Commit
  // 12e296c) — ohne trim weicht das Secret von lokal/CI geminteten Links ab
  // und jeder Link rendert als "ungültig".
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!.trim())
    .update("sportnexus-invite-link-v1")
    .digest();
}

export function signInviteToken(email: string, days = 28): string {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const payload = `${email.trim().toLowerCase()}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyInviteToken(token: string): { email?: string; error?: "invalid" | "expired" } {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return { error: "invalid" };
  let payload: string;
  try {
    payload = Buffer.from(token.slice(0, dot), "base64url").toString("utf8");
  } catch {
    return { error: "invalid" };
  }
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const given = Buffer.from(token.slice(dot + 1));
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return { error: "invalid" };

  // payload = "<email>.<exp>" — E-Mails enthalten selbst Punkte, deshalb von hinten trennen.
  const sep = payload.lastIndexOf(".");
  const email = payload.slice(0, sep);
  const exp = Number(payload.slice(sep + 1));
  if (!email || !Number.isFinite(exp)) return { error: "invalid" };
  if (exp * 1000 < Date.now()) return { error: "expired" };
  return { email };
}
