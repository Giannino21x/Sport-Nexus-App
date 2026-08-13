"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { useSettings, type Settings } from "@/components/settings-context";
import { changePasswordAction, getAuthEmailAction, updateAuthEmailAction } from "@/app/actions/auth";
import { error as hapticError, hapticsAvailable, setHapticsEnabled, success as hapticSuccess, tap } from "@/lib/haptics";
import { useMe } from "@/lib/hooks";

const ACCENTS: { k: Settings["accent"]; c: string; l: string }[] = [
  { k: "default", c: "#C3A75E", l: "Amber Glow" },
  { k: "navy", c: "#006FB6", l: "SN Blau" },
  { k: "mono", c: "#000000", l: "Schwarz" },
];

export default function SettingsPage() {
  const {
    theme, accent, cardStyle, dataSource, haptics,
    setTheme, setAccent, setCardStyle, setDataSource, setHaptics,
  } = useSettings();
  const { data: me } = useMe();
  // Erst nach dem Mount prüfen — hapticsAvailable() fasst navigator/window an
  // und würde beim Server-Render sonst immer false liefern (Hydration-Diff).
  const [hapticsShown, setHapticsShown] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Client-Feature-Probe
    setHapticsShown(hapticsAvailable());
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Konto</div>
          <h1>Einstellungen</h1>
          <div className="subtitle">Erscheinungsbild und Kontooptionen.</div>
        </div>
        <Link href="/dashboard" className="btn btn-ghost">← Zurück</Link>
      </div>

      <div style={{ display: "grid", gap: 18, maxWidth: 720 }}>
        {dataSource === "live"
          ? <AccountEmailCard profileEmail={me?.email ?? null} />
          : <DemoAccountCard email={me?.email ?? null} />}

        <div className="card" style={{ padding: 24 }}>
          <div className="upper-label" style={{ marginBottom: 14 }}>Erscheinungsbild</div>

          <Row label="Theme" hint="Hell oder dunkel. Folgt deinem letzten Gerätewechsel nicht automatisch.">
            <SegmentGroup
              options={[
                { k: "light", l: "Hell", icon: "sun" },
                { k: "dark", l: "Dunkel", icon: "moon" },
              ]}
              value={theme}
              onChange={(v) => setTheme(v as Settings["theme"])}
            />
          </Row>

          <Row label="Akzentfarbe" hint="Diese Farbe wird für Hervorhebungen, Buttons und Badges verwendet.">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ACCENTS.map((s) => (
                <button
                  key={s.k}
                  type="button"
                  onClick={() => setAccent(s.k)}
                  aria-pressed={accent === s.k}
                  title={s.l}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: accent === s.k ? "2px solid var(--ink)" : "2px solid transparent",
                    outline: "1px solid var(--line)",
                    background: s.c,
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </Row>

          <Row label="Directory Card-Stil" hint="Nur sichtbar, wenn das Directory als Grid angezeigt wird.">
            <SegmentGroup
              options={[
                { k: "default", l: "Standard" },
                { k: "photo", l: "Foto" },
                { k: "compact", l: "Kompakt" },
              ]}
              value={cardStyle}
              onChange={(v) => setCardStyle(v as Settings["cardStyle"])}
            />
          </Row>
        </div>

        {/* Nur in der App zeigen — im Desktop-Browser gibt es nichts zu
            spüren, und ein wirkungsloser Schalter verunsichert nur. */}
        {hapticsShown && (
          <div className="card" style={{ padding: 24 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>Bedienung</div>
            <Row
              label="Haptisches Feedback"
              hint="Kurze Vibration beim Antippen von Buttons, Tabs und Schaltern. Braucht die App — im Browser passiert nichts."
            >
              <SegmentGroup
                options={[
                  { k: "on", l: "An" },
                  { k: "off", l: "Aus" },
                ]}
                value={haptics}
                onChange={(v) => {
                  setHaptics(v as Settings["haptics"]);
                  // Direkt fühlbar machen, was man gerade eingeschaltet hat.
                  if (v === "on") { setHapticsEnabled(true); tap("medium"); }
                }}
              />
            </Row>
          </div>
        )}

        {/* Die Datenquelle-Umschaltung gibt es für Live-User nicht mehr —
            niemand soll versehentlich im Demo-Modus (fiktive Daten) landen.
            Im Demo-Modus bleibt die Karte als Ausstieg zurück zum Login. */}
        {dataSource === "demo" && (
          <div className="card" style={{ padding: 24 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>Daten</div>
            <Row
              label="Datenquelle"
              hint="Demo-Modus: fiktive Daten, Änderungen bleiben lokal im Browser."
            >
              <button className="btn btn-ghost" onClick={() => setDataSource("live")}>
                Demo verlassen → Zum Login
              </button>
            </Row>
          </div>
        )}

      </div>
    </div>
  );
}

function AccountEmailCard({ profileEmail }: { profileEmail: string | null }) {
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getAuthEmailAction()
      .then((r) => {
        if (cancelled) return;
        setAuthEmail(r.email ?? null);
        setLoading(false);
      })
      .catch(() => {
        // Fehler nicht in ewigem "Wird geladen..." enden lassen.
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const startEdit = () => {
    setDraft(authEmail ?? "");
    setEditing(true);
    setInfo(null);
    setErr(null);
  };

  const onSave = () => {
    const v = draft.trim();
    if (!v) { setErr("E-Mail erforderlich."); hapticError(); return; }
    startTransition(async () => {
      const r = await updateAuthEmailAction(v);
      if (r.error) { setErr(r.error); hapticError(); return; }
      setInfo(r.info ?? "Bestätigungs-Mail gesendet.");
      setEditing(false);
      hapticSuccess();
    });
  };

  // Wenn die Profil-E-Mail vom Auth-E-Mail abweicht, wird das im Hinweistext
  // erwähnt — das ist relevant, sobald HubSpot Accounts automatisch anlegt:
  // dort ist die HubSpot-E-Mail = Login-E-Mail + Profil-E-Mail (gleich), kann
  // aber später unabhängig geändert werden.
  const differs = profileEmail && authEmail && profileEmail.trim().toLowerCase() !== authEmail.toLowerCase();

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="upper-label" style={{ marginBottom: 14 }}>Konto</div>
      <Row
        label="Login-E-Mail / Username"
        hint="Mit dieser Adresse meldest du dich an (dein Username). Änderst du sie, wird die neue Adresse nach Bestätigung dein neues Login. Sie ist nur für dich und das SportNexus-Team sichtbar — nicht für andere Members."
      >
        {loading ? (
          <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Wird geladen...</span>
        ) : editing ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="input"
              type="email"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="neue@adresse.ch"
              style={{ width: "min(240px, 100%)" }}
              autoFocus
            />
            <button className="btn btn-primary" onClick={onSave} disabled={pending} style={{ padding: "6px 12px", fontSize: 12.5 }}>
              {pending ? "..." : "Speichern"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setEditing(false); setErr(null); }}
              disabled={pending}
              style={{ padding: "6px 12px", fontSize: 12.5 }}
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5 }}>{authEmail || "—"}</span>
            <button className="btn btn-ghost" onClick={startEdit} style={{ padding: "5px 10px", fontSize: 12 }}>
              <Icon name="edit" size={12} /> Ändern
            </button>
          </div>
        )}
      </Row>

      {info && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--ink-2)", padding: "8px 12px", background: "var(--bg-sunken)", borderRadius: 8, lineHeight: 1.5 }}>
          {info}
        </div>
      )}
      {err && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--danger)", padding: "8px 12px", background: "rgba(225,90,43,0.08)", borderRadius: 8 }}>
          {err}
        </div>
      )}

      <PasswordRow />

      <Row
        label="Profil-E-Mail"
        hint={
          differs
            ? "Aktuell weicht deine Profil-E-Mail von der Login-E-Mail ab. Du kannst sie unter „Profil bearbeiten“ ändern."
            : "Diese Adresse zeigen wir in deinem Member-Profil (sofern du Sichtbarkeit aktiviert hast). Sie kann unabhängig von der Login-E-Mail bearbeitet werden."
        }
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5 }}>{profileEmail || "—"}</span>
          <Link href="/profile" className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }}>
            <Icon name="edit" size={12} /> In Profil bearbeiten
          </Link>
        </div>
      </Row>
    </div>
  );
}

function PasswordRow() {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const startEdit = () => {
    setCurrent("");
    setNext("");
    setEditing(true);
    setInfo(null);
    setErr(null);
  };

  const onSave = () => {
    if (!current) { setErr("Aktuelles Passwort erforderlich."); hapticError(); return; }
    if (next.length < 8) { setErr("Neues Passwort muss mindestens 8 Zeichen haben."); hapticError(); return; }
    startTransition(async () => {
      const r = await changePasswordAction(current, next);
      if (r.error) { setErr(r.error); hapticError(); return; }
      setInfo(r.info ?? "Passwort geändert.");
      setErr(null);
      setEditing(false);
      hapticSuccess();
    });
  };

  return (
    <>
      <Row
        label="Passwort"
        hint="Mindestens 8 Zeichen. Wenn du dein aktuelles Passwort nicht mehr weisst, nutze „Passwort vergessen“ auf der Login-Seite."
      >
        {editing ? (
          <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
            <input
              className="input"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Aktuelles Passwort"
              autoComplete="current-password"
              style={{ width: "min(240px, 100%)" }}
              autoFocus
            />
            <input
              className="input"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Neues Passwort (min. 8 Zeichen)"
              autoComplete="new-password"
              style={{ width: "min(240px, 100%)" }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={onSave} disabled={pending} style={{ padding: "6px 12px", fontSize: 12.5 }}>
                {pending ? "..." : "Speichern"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setEditing(false); setErr(null); }}
                disabled={pending}
                style={{ padding: "6px 12px", fontSize: 12.5 }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5 }}>••••••••</span>
            <button className="btn btn-ghost" onClick={startEdit} style={{ padding: "5px 10px", fontSize: 12 }}>
              <Icon name="edit" size={12} /> Ändern
            </button>
          </div>
        )}
      </Row>

      {info && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--ink-2)", padding: "8px 12px", background: "var(--bg-sunken)", borderRadius: 8, lineHeight: 1.5 }}>
          {info}
        </div>
      )}
      {err && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--danger)", padding: "8px 12px", background: "rgba(225,90,43,0.08)", borderRadius: 8 }}>
          {err}
        </div>
      )}
    </>
  );
}

function DemoAccountCard({ email }: { email: string | null }) {
  // Im Demo-Modus gibt es keinen echten Supabase-Auth-Account — wir zeigen die
  // Demo-E-Mail als Login-/Username- und Profil-Angabe an, damit die Konto-Sektion
  // nicht leer ist (Feedback: "Demo-Umgebung — hier fehlen die Konto-E-Mail-Angaben").
  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="upper-label" style={{ marginBottom: 14 }}>Konto</div>
      <Row
        label="Login-E-Mail / Username"
        hint="Mit dieser Adresse meldest du dich an (dein Username). Im Demo-Modus ist sie fix — im Live-Modus wird eine geänderte Adresse nach Bestätigung dein neues Login."
      >
        <span style={{ fontSize: 13.5 }}>{email || "—"}</span>
      </Row>
      <Row
        label="Profil-E-Mail"
        hint="Diese Adresse zeigen wir in deinem Member-Profil. Im Live-Modus unter „Profil bearbeiten“ anpassbar."
      >
        <span style={{ fontSize: 13.5 }}>{email || "—"}</span>
      </Row>
      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.5 }}>
        Demo-Modus — Kontoänderungen sind nur im Live-Modus möglich.
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    // Layout liegt in globals.css (.settings-row) — als Inline-Style war die
    // 180px-Label-Spalte per Media Query nicht aufzubrechen und sprengte auf
    // dem Handy die Karte.
    <div className="settings-row">
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div className="settings-value">{children}</div>
    </div>
  );
}

function SegmentGroup<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { k: V; l: string; icon?: Parameters<typeof Icon>[0]["name"] }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: 2,
        background: "var(--bg-elevated)",
      }}
    >
      {options.map((o) => {
        const active = value === o.k;
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onChange(o.k)}
            aria-pressed={active}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: 12.5,
              border: "none",
              background: active ? "var(--bg-sunken)" : "transparent",
              color: "var(--ink)",
              borderRadius: 7,
              cursor: "pointer",
            }}
          >
            {o.icon && <Icon name={o.icon} size={13} />}
            <span>{o.l}</span>
          </button>
        );
      })}
    </div>
  );
}
