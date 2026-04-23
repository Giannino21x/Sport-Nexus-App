"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/actions/auth";
import { Icon } from "@/components/icon";
import { LogoWordmark } from "@/components/logo-wordmark";

const C = {
  bg: "#F1EBDC",
  bgInput: "#FBF7EE",
  border: "#D9D0BC",
  text: "#0A0A0A",
  textDim: "#6B6456",
  textSub: "#9A9281",
  btnBg: "#0A0A0A",
  btnText: "#FFFFFF",
} as const;

const SANS = "var(--font-poppins), 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

export function ResetPasswordClient({ hasSession, email }: { hasSession: boolean; email: string }) {
  const [state, formAction, pending] = useActionState(updatePasswordAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  const inputStyle = {
    background: C.bgInput,
    borderColor: C.border,
    color: C.text,
    fontFamily: SANS,
  } as const;

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

        {!hasSession ? (
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
              Der Reset-Link ist abgelaufen oder wurde bereits verwendet. Fordere einen neuen Link an.
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
              Neues Passwort wählen
            </h2>
            <div style={{ color: C.textDim, marginBottom: 24, fontSize: 14 }}>
              {email ? <>Für <strong style={{ color: C.text }}>{email}</strong></> : <>Wähle ein neues Passwort für deinen Account.</>}
            </div>

            <form action={formAction}>
              <div className="field">
                <label className="field-label" style={{ color: C.textDim }}>
                  Neues Passwort <span style={{ color: C.textSub }}>· min. 8 Zeichen</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    style={{ ...inputStyle, paddingRight: 40 }}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    minLength={8}
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      padding: 6,
                      cursor: "pointer",
                      color: C.textDim,
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                  </button>
                </div>
              </div>
              {state?.error && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--danger)",
                    marginBottom: 12,
                    padding: "8px 10px",
                    background: "rgba(225,90,43,0.1)",
                    borderRadius: 6,
                  }}
                >
                  {state.error}
                </div>
              )}
              <button
                type="submit"
                className="btn"
                style={{
                  width: "100%",
                  padding: "13px",
                  marginTop: 6,
                  background: C.btnBg,
                  color: C.btnText,
                  border: "none",
                  fontFamily: SANS,
                  fontWeight: 500,
                }}
                disabled={pending}
              >
                {pending ? "Speichern..." : "Passwort speichern"} <Icon name="arrow" size={14} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
