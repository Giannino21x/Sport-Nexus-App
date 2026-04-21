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

  return (
    <div className="login-root" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      <div
        style={{
          background: "var(--ink)",
          color: "var(--bg)",
          padding: "48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
        className="login-visual"
      >
        <div style={{ display: "flex", alignItems: "center", position: "relative", zIndex: 2 }}>
          <LogoWordmark height={28} invert />
        </div>
        <div style={{ position: "relative", zIndex: 2 }}>
          <div className="serif" style={{ fontSize: 64, lineHeight: 1.02, letterSpacing: "-0.02em", maxWidth: 560 }}>
            Sport trifft auf<br /><em style={{ color: "var(--accent)" }}>Business.</em>
          </div>
          <div style={{ marginTop: 20, maxWidth: 440, color: "rgba(241,235,219,0.75)", fontSize: 15, lineHeight: 1.55 }}>
            Der exklusive Memberbereich von SportNexus — Directory, Events, Verbindungen. Nur für Mitglieder.
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 12, color: "rgba(241,235,219,0.55)", letterSpacing: "0.1em", textTransform: "uppercase", position: "relative", zIndex: 2 }}>
          <span>Since 2024</span><span>·</span><span>Zürich · Basel · Bern</span>
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "repeating-linear-gradient(115deg, transparent 0 120px, rgba(255,255,255,0.025) 120px 121px)",
            pointerEvents: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, background: "var(--bg)" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 3, background: "var(--bg-sunken)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
            <button
              onClick={() => setMode("signin")}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: 13,
                border: "none",
                background: mode === "signin" ? "var(--bg-elevated)" : "transparent",
                color: "var(--ink)",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: mode === "signin" ? 500 : 400,
                boxShadow: mode === "signin" ? "var(--shadow-sm)" : "none",
              }}
            >
              Anmelden
            </button>
            <button
              onClick={() => setMode("signup")}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: 13,
                border: "none",
                background: mode === "signup" ? "var(--bg-elevated)" : "transparent",
                color: "var(--ink)",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: mode === "signup" ? 500 : 400,
                boxShadow: mode === "signup" ? "var(--shadow-sm)" : "none",
              }}
            >
              Registrieren
            </button>
          </div>

          {mode === "signin" ? (
            <>
              <div className="upper-label" style={{ marginBottom: 8 }}>Login</div>
              <div className="serif" style={{ fontSize: 36, lineHeight: 1, letterSpacing: "-0.015em", marginBottom: 8 }}>Willkommen zurück</div>
              <div style={{ color: "var(--ink-3)", marginBottom: 24, fontSize: 14 }}>Melde dich im Member-Bereich an.</div>

              <form action={signInFormAction}>
                <input type="hidden" name="next" value={next} />
                <div className="field">
                  <label className="field-label">E-Mail</label>
                  <input className="input" type="email" name="email" required autoFocus autoComplete="email" />
                </div>
                <div className="field">
                  <label className="field-label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Passwort</span>
                  </label>
                  <input className="input" type="password" name="password" required autoComplete="current-password" />
                </div>
                {signInState?.error && (
                  <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12, padding: "8px 10px", background: "var(--accent-soft)", borderRadius: 6 }}>
                    {signInState.error}
                  </div>
                )}
                <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "11px", marginTop: 6 }} disabled={signInPending}>
                  {signInPending ? "Anmelden..." : "Anmelden"} <Icon name="arrow" size={14} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="upper-label" style={{ marginBottom: 8 }}>Registrieren</div>
              <div className="serif" style={{ fontSize: 36, lineHeight: 1, letterSpacing: "-0.015em", marginBottom: 8 }}>Account anlegen</div>
              <div style={{ color: "var(--ink-3)", marginBottom: 24, fontSize: 14 }}>Erstelle deinen SportNexus-Account.</div>

              <form action={signUpFormAction}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label className="field-label">Vorname</label>
                    <input className="input" type="text" name="first" required autoComplete="given-name" />
                  </div>
                  <div className="field">
                    <label className="field-label">Nachname</label>
                    <input className="input" type="text" name="last" required autoComplete="family-name" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">E-Mail</label>
                  <input className="input" type="email" name="email" required autoComplete="email" />
                </div>
                <div className="field">
                  <label className="field-label">Passwort <span style={{ color: "var(--ink-4)" }}>· min. 8 Zeichen</span></label>
                  <input className="input" type="password" name="password" required minLength={8} autoComplete="new-password" />
                </div>
                {signUpState?.error && (
                  <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12, padding: "8px 10px", background: "var(--accent-soft)", borderRadius: 6 }}>
                    {signUpState.error}
                  </div>
                )}
                <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "11px", marginTop: 6 }} disabled={signUpPending}>
                  {signUpPending ? "Registrieren..." : "Account erstellen"} <Icon name="arrow" size={14} />
                </button>
              </form>
            </>
          )}

          <div style={{ margin: "20px 0", display: "flex", alignItems: "center", gap: 10, color: "var(--ink-4)", fontSize: 11.5 }}>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} /> oder <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>
          <button type="button" className="btn btn-ghost" style={{ width: "100%" }} onClick={enterDemo}>
            Als Demo-User ansehen
          </button>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-4)", textAlign: "center", lineHeight: 1.5 }}>
            Demo-Modus zeigt fiktive Daten. Echte Accounts, Nachrichten und Posts gibt es nur im Live-Modus.
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 780px) {
          .login-visual { display: none; }
          .login-root { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
