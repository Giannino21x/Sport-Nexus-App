import Link from "next/link";
import { confirmInviteAction } from "@/app/actions/auth";
import { verifyInviteToken } from "@/lib/invite-token";
import { Icon } from "@/components/icon";
import { LogoWordmark } from "@/components/logo-wordmark";

// Landeseite der Langzeit-Einladungslinks (?t=<signierter Token>, siehe
// lib/invite-token.ts). Beim Laden wird nur die Signatur/Ablaufzeit geprüft —
// NICHTS verbraucht (Mail-Scanner-sicher). Erst der Button-Klick postet an
// confirmInviteAction, die einen frischen Recovery-OTP mintet und sofort
// einlöst → /reset-password zum Passwort-Festlegen.

const C = {
  bg: "#FFFFFF",
  border: "#D9D9D9",
  text: "#000000",
  textDim: "#575757",
  textSub: "#868686",
  btnBg: "#000000",
  btnText: "#FFFFFF",
} as const;

const SANS =
  "var(--font-manrope), 'Azo Sans', 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.t ?? "";
  const v = token ? verifyInviteToken(token) : { error: "invalid" as const };
  const valid = Boolean(v.email);
  const expired = v.error === "expired";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        fontFamily: SANS,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 32 }}>
          <LogoWordmark height={22} variant="color" />
        </div>

        {!valid ? (
          <>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: C.textDim,
                marginBottom: 14,
              }}
            >
              {expired ? "Link abgelaufen" : "Link ungültig"}
            </div>
            <h2
              style={{
                fontWeight: 500,
                fontSize: 32,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginBottom: 10,
                color: C.text,
              }}
            >
              {expired ? "Dieser Link ist abgelaufen" : "Dieser Link ist ungültig"}
            </h2>
            <div style={{ color: C.textDim, marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
              {expired
                ? "Die Einladung ist nicht mehr gültig. Über «Passwort vergessen» bekommst du sofort einen neuen Zugangslink an deine E-Mail-Adresse."
                : "Der Einladungslink ist unvollständig. Öffne den Link aus der Mail noch einmal oder fordere über «Passwort vergessen» einen neuen an."}
            </div>
            <Link
              href="/login?mode=forgot"
              className="btn"
              style={{
                display: "inline-flex",
                justifyContent: "center",
                width: "100%",
                padding: "13px",
                background: C.btnBg,
                color: C.btnText,
                border: "none",
                textDecoration: "none",
                fontFamily: SANS,
                fontWeight: 500,
              }}
            >
              Neuen Link anfordern <Icon name="arrow" size={14} />
            </Link>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: C.textDim,
                marginBottom: 14,
              }}
            >
              Deine Einladung
            </div>
            <h2
              style={{
                fontWeight: 500,
                fontSize: 32,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginBottom: 10,
                color: C.text,
              }}
            >
              Willkommen bei SportNexus
            </h2>
            <div style={{ color: C.textDim, marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
              Klicke auf den Button und lege dein persönliches Passwort fest. Danach bist du
              direkt eingeloggt.
            </div>

            <form action={confirmInviteAction}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="btn"
                style={{
                  width: "100%",
                  padding: "13px",
                  background: C.btnBg,
                  color: C.btnText,
                  border: "none",
                  fontFamily: SANS,
                  fontWeight: 500,
                }}
              >
                Passwort festlegen &amp; einloggen <Icon name="arrow" size={14} />
              </button>
            </form>

            <div
              style={{
                marginTop: 16,
                fontSize: 11.5,
                color: C.textSub,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Du hast schon ein Passwort? Dann kannst du dich auch direkt{" "}
              <Link href="/login" style={{ color: C.textDim, textDecoration: "underline" }}>
                einloggen
              </Link>
              .
            </div>
          </>
        )}
      </div>
    </div>
  );
}
