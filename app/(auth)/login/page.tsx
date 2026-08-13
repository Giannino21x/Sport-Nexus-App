"use client";

import { Suspense, useActionState, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction, signUpAction, requestPasswordResetAction } from "@/app/actions/auth";
import { Icon } from "@/components/icon";
import { LogoWordmark } from "@/components/logo-wordmark";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

// Palette gemäss SN_Markenrichtlinien — weiss/farbneutral, Schwarz als Primär-Ink.
const C = {
  bg: "#FFFFFF",
  bgInput: "#FFFFFF",
  border: "#D9D9D9",
  text: "#000000",
  textDim: "#575757",
  textSub: "#868686",
  btnBg: "#000000",
  btnText: "#FFFFFF",
  ghostBg: "#F4F4F4",
  divider: "#ECECEC",
} as const;

const SANS = "var(--font-manrope), 'Azo Sans', 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif";

function LoginInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const callbackError = searchParams.get("error");
  const initialMode =
    callbackError || searchParams.get("mode") === "forgot" ? "forgot" : "signin";
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // „Erinnert sich an einen“: die zuletzt benutzte Login-E-Mail bleibt lokal
  // auf dem Gerät (localStorage) und wird nach Abmelden/App-Neustart
  // vorausgefüllt — der Fokus springt dann direkt ins Passwortfeld. Das
  // Passwort selbst speichern wir NIE; das ist Sache des Passwort-Managers.
  // Erst nach dem Mount lesen (SSR kennt localStorage nicht → Hydration-Diff).
  const [email, setEmail] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let stored = "";
    try { stored = localStorage.getItem("sn_login_email") || ""; } catch { /* Safari private mode */ }
    if (!stored) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Client-only-Quelle (localStorage)
    setEmail(stored);
    passwordRef.current?.focus();
  }, []);
  const rememberEmail = () => {
    const v = email.trim();
    if (!v) return;
    try { localStorage.setItem("sn_login_email", v); } catch { /* Safari private mode */ }
  };

  const [signInState, signInFormAction, signInPending] = useActionState(signInAction, undefined);
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpAction, undefined);
  const [forgotState, forgotFormAction, forgotPending] = useActionState(
    requestPasswordResetAction,
    undefined,
  );

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
          src="/login-hero-1.jpg"
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

        <div className="login-logo" style={{ position: "absolute", top: "calc(36px + var(--safe-top, 0px))", left: 40, zIndex: 3, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}>
          <LogoWordmark height={38} variant="color-on-dark" />
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
            <span>Zürich · Basel</span>
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div
        className="login-form-col"
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
          {mode === "signin" && (
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
                Herzlich willkommen
              </h2>
              <div style={{ color: C.textDim, marginBottom: 32, fontSize: 14, fontFamily: SANS, fontWeight: 400 }}>
                Melde dich im Member-Bereich an.
              </div>

              <form action={signInFormAction} onSubmit={rememberEmail}>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    suppressHydrationWarning
                  />
                </div>
                <div className="field">
                  <label className="field-label" style={{ ...labelStyle, display: "flex", justifyContent: "space-between" }}>
                    <span>Passwort</span>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      style={{
                        color: C.textDim,
                        fontSize: 11.5,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontFamily: SANS,
                        textDecoration: "underline",
                      }}
                    >
                      Passwort vergessen?
                    </button>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input"
                      style={{ ...inputStyle, paddingRight: 40 }}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      autoComplete="current-password"
                      ref={passwordRef}
                      suppressHydrationWarning
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
          )}
          {mode === "signup" && (
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
                    <input className="input" style={inputStyle} type="text" name="first" required autoComplete="given-name" suppressHydrationWarning />
                  </div>
                  <div className="field">
                    <label className="field-label" style={labelStyle}>Nachname</label>
                    <input className="input" style={inputStyle} type="text" name="last" required autoComplete="family-name" suppressHydrationWarning />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" style={labelStyle}>E-Mail</label>
                  <input className="input" style={inputStyle} type="email" name="email" required autoComplete="email" suppressHydrationWarning />
                </div>
                <div className="field">
                  <label className="field-label" style={labelStyle}>
                    Passwort <span style={{ color: C.textSub }}>· min. 8 Zeichen</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input"
                      style={{ ...inputStyle, paddingRight: 40 }}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      suppressHydrationWarning
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
          {mode === "forgot" && (
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
                Passwort vergessen
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
                Link zum Zurücksetzen
              </h2>
              <div style={{ color: C.textDim, marginBottom: 32, fontSize: 14, fontFamily: SANS, fontWeight: 400 }}>
                Wir senden dir eine E-Mail mit einem Link zum Festlegen eines neuen Passworts.
              </div>

              {callbackError && !forgotState?.info && (
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
                  Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.
                </div>
              )}

              <form action={forgotFormAction} onSubmit={rememberEmail}>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    suppressHydrationWarning
                  />
                </div>
                {forgotState?.error && (
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
                    {forgotState.error}
                  </div>
                )}
                {forgotState?.info && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: C.text,
                      marginBottom: 12,
                      padding: "10px 12px",
                      background: "rgba(10,10,10,0.05)",
                      border: "1px solid " + C.border,
                      borderRadius: 6,
                      lineHeight: 1.5,
                    }}
                  >
                    {forgotState.info}
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
                  disabled={forgotPending}
                >
                  {forgotPending ? "Wird gesendet..." : "Reset-Link senden"} <Icon name="arrow" size={14} />
                </button>
              </form>
            </>
          )}

          <div style={{ marginTop: 32, fontSize: 12.5, color: C.textDim, textAlign: "center" }}>
            {mode === "signin" && (
              <>
                Noch kein Mitglied?{" "}
                <a
                  href="https://www.sportnexus.ch/kontakt"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: C.text,
                    textDecoration: "underline",
                    fontWeight: 500,
                    fontFamily: SANS,
                    fontSize: "inherit",
                  }}
                >
                  Nimm Kontakt mit uns auf
                </a>
              </>
            )}
            {mode === "signup" && (
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
            {mode === "forgot" && (
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
                Zurück zum Login
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 780px) {
          .login-root { grid-template-columns: 1fr !important; }
          .login-visual { min-height: 44vh !important; }
          .login-hero-headline { font-size: 40px !important; }
          /* Mobil ist die Formular-Spalte KEIN zweiter 100vh-Screen: das
             vertikale Zentrieren riss sonst ein riesiges weisses Loch
             zwischen Hero und Formular (User-Report 2026-07-21). */
          .login-form-col {
            min-height: 0 !important;
            padding: 36px 20px 48px !important;
          }
          /* Das Foto zeigt die Leinwand mit dem SPORTNEXUS-Schriftzug gross im
             Bild — das Overlay-Logo lag mobil genau darüber (Doppel-Logo,
             User-Report). Der schmale Ausschnitt lässt sich nicht verschieben
             (Bild ist breitenbeschränkt), darum mobil ohne Overlay-Logo. */
          .login-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
