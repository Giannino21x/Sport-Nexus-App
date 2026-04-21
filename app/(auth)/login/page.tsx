"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction, signUpAction } from "@/app/actions/auth";
import { Icon } from "@/components/icon";
import { LogoWordmark } from "@/components/logo-wordmark";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

// Palette locked to the handoff design — always light on login, independent of app theme.
const C = {
  bg: "#F1EBDC",
  bgInput: "#FBF7EE",
  border: "#D9D0BC",
  text: "#0A0A0A",
  textDim: "#6B6456",
  textSub: "#9A9281",
  btnBg: "#0A0A0A",
  btnText: "#FFFFFF",
  ghostBg: "#FBF7EE",
  divider: "#D9D0BC",
} as const;

const SANS = "var(--font-poppins), 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

function LoginInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [signInState, signInFormAction, signInPending] = useActionState(signInAction, undefined);
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpAction, undefined);

  const enterDemo = () => {
    document.cookie = "sn-mode=demo; path=/; max-age=31536000; samesite=lax";
    window.location.assign("/dashboard");
  };

  const inputStyle = {
    background: C.bgInput,
    borderColor: C.border,
    color: C.text,
    fontFamily: SANS,
  } as const;

  const labelStyle = { color: C.textDim } as const;

  return (
    <div className="login-root" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* LEFT — full-bleed hero */}
      <div
        className="login-visual"
        style={{ position: "relative", overflow: "hidden", minHeight: "100vh", background: "#0A0A0A" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-hero-clean.jpg"
          alt="Sport trifft auf Business"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "60%",
            background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "28%",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "absolute", top: 36, left: 40, zIndex: 3, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}>
          <LogoWordmark height={26} variant="color-on-dark" />
        </div>

        <div style={{ position: "absolute", left: 40, right: 40, bottom: 44, zIndex: 3, color: "#FFFFFF" }}>
          <h1
            style={{
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: "clamp(46px, 5.2vw, 70px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "#FFFFFF",
              textShadow: "0 2px 24px rgba(0,0,0,0.35)",
            }}
            className="login-hero-headline"
          >
            Sport trifft auf Business.
          </h1>
          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 14,
              fontSize: 11,
              color: "rgba(255,255,255,0.80)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontFamily: SANS,
              fontWeight: 500,
            }}
          >
            <span>Since 2024</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>Zürich · Basel · Bern</span>
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          background: C.bg,
          minHeight: "100vh",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380, fontFamily: SANS }}>
          {mode === "signin" ? (
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
                Login
              </div>
              <h2
                style={{
                  fontFamily: SANS,
                  fontWeight: 500,
                  fontSize: 38,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  marginBottom: 10,
                  color: C.text,
                }}
              >
                Willkommen zurück
              </h2>
              <div style={{ color: C.textDim, marginBottom: 32, fontSize: 14, fontFamily: SANS, fontWeight: 400 }}>
                Melde dich im Member-Bereich an.
              </div>

              <form action={signInFormAction}>
                <input type="hidden" name="next" value={next} />
                <div className="field">
                  <label className="field-label" style={labelStyle}>E-Mail</label>
                  <input
                    className="input"
                    style={inputStyle}
                    type="email"
                    name="email"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
                <div className="field">
                  <label className="field-label" style={{ ...labelStyle, display: "flex", justifyContent: "space-between" }}>
                    <span>Passwort</span>
                    <a href="#" style={{ color: C.textDim, fontSize: 11.5 }}>Passwort vergessen?</a>
                  </label>
                  <input
                    className="input"
                    style={inputStyle}
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                {signInState?.error && (
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
                    {signInState.error}
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
                  disabled={signInPending}
                >
                  {signInPending ? "Anmelden..." : "Anmelden"} <Icon name="arrow" size={14} />
                </button>
              </form>
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
                Registrieren
              </div>
              <h2
                style={{
                  fontFamily: SANS,
                  fontWeight: 500,
                  fontSize: 38,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  marginBottom: 10,
                  color: C.text,
                }}
              >
                Account anlegen
              </h2>
              <div style={{ color: C.textDim, marginBottom: 32, fontSize: 14, fontFamily: SANS, fontWeight: 400 }}>
                Erstelle deinen SportNexus-Account.
              </div>

              <form action={signUpFormAction}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label className="field-label" style={labelStyle}>Vorname</label>
                    <input className="input" style={inputStyle} type="text" name="first" required autoComplete="given-name" />
                  </div>
                  <div className="field">
                    <label className="field-label" style={labelStyle}>Nachname</label>
                    <input className="input" style={inputStyle} type="text" name="last" required autoComplete="family-name" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" style={labelStyle}>E-Mail</label>
                  <input className="input" style={inputStyle} type="email" name="email" required autoComplete="email" />
                </div>
                <div className="field">
                  <label className="field-label" style={labelStyle}>
                    Passwort <span style={{ color: C.textSub }}>· min. 8 Zeichen</span>
                  </label>
                  <input
                    className="input"
                    style={inputStyle}
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                {signUpState?.error && (
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
                    {signUpState.error}
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
                  disabled={signUpPending}
                >
                  {signUpPending ? "Registrieren..." : "Account erstellen"} <Icon name="arrow" size={14} />
                </button>
              </form>
            </>
          )}

          <div style={{ margin: "24px 0", display: "flex", alignItems: "center", gap: 12, color: C.textSub, fontSize: 11.5 }}>
            <span style={{ flex: 1, height: 1, background: C.divider }} /> oder <span style={{ flex: 1, height: 1, background: C.divider }} />
          </div>
          <button
            type="button"
            className="btn"
            style={{
              width: "100%",
              background: C.ghostBg,
              color: C.text,
              border: "1px solid " + C.border,
              padding: "11px",
              fontFamily: SANS,
              fontWeight: 500,
            }}
            onClick={enterDemo}
          >
            Als Demo-User ansehen
          </button>
          <div style={{ marginTop: 10, fontSize: 11.5, color: C.textSub, textAlign: "center", lineHeight: 1.5 }}>
            Demo-Modus zeigt fiktive Daten. Echte Accounts, Nachrichten und Posts gibt es nur im Live-Modus.
          </div>

          <div style={{ marginTop: 32, fontSize: 12.5, color: C.textDim, textAlign: "center" }}>
            {mode === "signin" ? (
              <>
                Noch kein Mitglied?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  style={{
                    color: C.text,
                    textDecoration: "underline",
                    fontWeight: 500,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: SANS,
                    fontSize: "inherit",
                  }}
                >
                  Aufnahmeantrag stellen
                </button>
              </>
            ) : (
              <>
                Bereits Mitglied?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  style={{
                    color: C.text,
                    textDecoration: "underline",
                    fontWeight: 500,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: SANS,
                    fontSize: "inherit",
                  }}
                >
                  Einloggen
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 780px) {
          .login-root { grid-template-columns: 1fr !important; }
          .login-visual { min-height: 44vh !important; }
          .login-hero-headline { font-size: 40px !important; }
        }
      `}</style>
    </div>
  );
}
