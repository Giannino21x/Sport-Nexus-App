import Link from "next/link";
import { confirmRecoveryAction } from "@/app/actions/auth";
import { Icon } from "@/components/icon";
import { LogoWordmark } from "@/components/logo-wordmark";

// Bestätigungs-Zwischenseite gegen Mail-Scanner-Prefetch (Outlook SafeLinks &
// Co.): Der Recovery-Link aus der Mail landet hier, aber es wird BEIM LADEN
// nichts verifiziert. Erst der Klick auf "Neues Passwort setzen" postet an
// confirmRecoveryAction → verifyOtp → Token verbraucht. Scanner folgen GET-
// Links, drücken aber keine Buttons, also überlebt der Einmal-Token bis zum
// echten User-Klick. Siehe app/actions/auth.ts (requestPasswordResetAction).

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

export default async function ResetConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const tokenHash = sp.token_hash ?? "";
  const type = sp.type ?? "recovery";
  const valid = Boolean(tokenHash);

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
              Link abgelaufen
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
              Dieser Link ist ungültig
            </h2>
            <div style={{ color: C.textDim, marginBottom: 24, fontSize: 14 }}>
              Der Reset-Link ist unvollständig oder abgelaufen. Fordere einen neuen Link an.
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
              Passwort zurücksetzen
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
              Reset bestätigen
            </h2>
            <div style={{ color: C.textDim, marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
              Klicke auf den Button, um fortzufahren. Anschliessend kannst du dein neues Passwort
              festlegen.
            </div>

            <form action={confirmRecoveryAction}>
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
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
                Neues Passwort setzen <Icon name="arrow" size={14} />
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
              Der Link ist eine Stunde gültig und kann nur einmal verwendet werden.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
