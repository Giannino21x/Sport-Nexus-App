"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { reload, useMe } from "@/lib/hooks";
import { SPORTS, type Member } from "@/lib/data";
import { updateProfileAction, type ProfileInput } from "@/app/actions/members";

type Form = Member & { linkedin: string; showMobile: boolean; showEmail: boolean; matchmaking: boolean };

export default function ProfilePage() {
  const router = useRouter();
  const { data: me, isDemo } = useMe();
  const { dataSource } = useSettings();
  const [form, setForm] = useState<Form | null>(null);
  const [status, setStatus] = useState<{ error?: string; ok?: boolean }>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!me) return;
    setForm({
      ...me,
      linkedin: `linkedin.com/in/${me.id}`,
      showMobile: true,
      showEmail: true,
      matchmaking: true,
    });
  }, [me]);

  if (!me || !form) return null;

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const onSave = () => {
    setStatus({});
    if (isDemo) {
      // Demo mode — just navigate back
      setStatus({ ok: true });
      setTimeout(() => router.push(`/directory/${me.id}`), 600);
      return;
    }
    startTransition(async () => {
      const input: ProfileInput = {
        bio: form.bio,
        offer: form.offer,
        search: form.search,
        sports: form.sports,
        mobile: form.mobile,
        web: form.web,
        linkedin: form.linkedin,
        showMobile: form.showMobile,
        showEmail: form.showEmail,
        matchmaking: form.matchmaking,
      };
      const r = await updateProfileAction(input);
      if (r.error) setStatus({ error: r.error });
      else {
        setStatus({ ok: true });
        reload("members");
        router.refresh();
      }
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Profil bearbeiten {isDemo && <span style={{ color: "var(--accent)", marginLeft: 6 }}>· Demo (nicht gespeichert)</span>}</div>
          <h1>Dein Profil</h1>
          <div className="subtitle">
            Daten aus HubSpot sind synchronisiert und können nur dort geändert werden. Zusätzliche Felder pflegst du hier.
          </div>
        </div>
        <div className="row">
          <Link href="/dashboard" className="btn btn-ghost">Abbrechen</Link>
          <button className="btn btn-primary" onClick={onSave} disabled={pending}>
            <Icon name="check" size={14} /> {pending ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>

      {status.error && (
        <div style={{ padding: "10px 14px", background: "var(--accent-soft)", color: "var(--danger)", borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          Fehler: {status.error}
        </div>
      )}
      {status.ok && (
        <div style={{ padding: "10px 14px", background: "var(--accent-soft)", color: "var(--success)", borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          Profil gespeichert.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 18 }} className="dash-grid">
        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 24 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>
              Stammdaten <span style={{ color: "var(--ink-4)", marginLeft: 6 }}>· aus HubSpot · read-only</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ReadOnlyField label="Vorname" value={me.first} />
              <ReadOnlyField label="Nachname" value={me.last} />
              <ReadOnlyField label="Firma" value={me.company} />
              <ReadOnlyField label="Rolle" value={me.role} />
              <ReadOnlyField label="Branche" value={me.branch} />
              <ReadOnlyField label="Subbranche" value={me.sub} />
              <ReadOnlyField label="Arbeitsort" value={me.work} />
              <ReadOnlyField label="Wohnort" value={me.home} />
              <ReadOnlyField label="E-Mail" value={me.email} />
              <ReadOnlyField label="Member seit" value={me.since} />
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>Über dich</div>
            <div className="field">
              <label className="field-label">
                Bio <span style={{ color: "var(--ink-4)" }}>· optional</span>
              </label>
              <textarea
                className="textarea"
                value={form.bio || ""}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Ein kurzer Absatz über dich — wird im Directory angezeigt."
                maxLength={280}
              />
              <div style={{ fontSize: 11, color: "var(--ink-4)", textAlign: "right", marginTop: 4 }} className="mono">
                {(form.bio || "").length}/280
              </div>
            </div>
            <div className="field">
              <label className="field-label">
                Angebot <span style={{ color: "var(--ink-4)" }}>· was du anbietest</span>
              </label>
              <input className="input" value={form.offer || ""} onChange={(e) => set("offer", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">
                Suche <span style={{ color: "var(--ink-4)" }}>· wonach du aktuell suchst</span>
              </label>
              <input
                className="input"
                value={form.search || ""}
                onChange={(e) => set("search", e.target.value)}
                placeholder="z.B. Co-Founder, Kunden, Kapital"
              />
            </div>
            <div className="field">
              <label className="field-label">Sportinteressen</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SPORTS.map((s) => {
                  const active = (form.sports || []).includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() =>
                        set("sports", active ? form.sports.filter((x) => x !== s) : [...(form.sports || []), s])
                      }
                      className="chip"
                      style={{
                        cursor: "pointer",
                        border: active ? "1px solid var(--ink)" : undefined,
                        background: active ? "var(--ink)" : undefined,
                        color: active ? "var(--bg)" : undefined,
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>Links & Sichtbarkeit</div>
            <div className="field">
              <label className="field-label">LinkedIn URL</label>
              <input className="input" value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Webseite</label>
              <input className="input" value={form.web || ""} onChange={(e) => set("web", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">
                Mobile <span style={{ color: "var(--ink-4)" }}>· sichtbar nur wenn aktiviert</span>
              </label>
              <input className="input" value={form.mobile || ""} onChange={(e) => set("mobile", e.target.value)} />
            </div>
            <hr className="hr" />
            <Toggle
              label="Mobile für Members sichtbar"
              value={form.showMobile}
              onChange={(v) => set("showMobile", v)}
            />
            <Toggle
              label="E-Mail für Members sichtbar"
              value={form.showEmail}
              onChange={(v) => set("showEmail", v)}
            />
            <Toggle
              label="Im Matchmaking berücksichtigen"
              value={form.matchmaking}
              onChange={(v) => set("matchmaking", v)}
            />
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 20, textAlign: "center" }}>
            <div className="upper-label" style={{ marginBottom: 16 }}>Profilbild</div>
            <div style={{ display: "inline-block" }}>
              <Avatar first={me.first} last={me.last} color={me.color} size={120} square />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
              <button className="btn btn-ghost">Hochladen</button>
              <button className="btn btn-text" style={{ color: "var(--ink-3)" }}>Entfernen</button>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 10 }}>JPG oder PNG · min. 400×400px</div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="upper-label" style={{ marginBottom: 10 }}>Preview</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 12 }}>
              So sehen dich andere Mitglieder im Directory:
            </div>
            <div className="card" style={{ padding: 14, boxShadow: "none" }}>
              <div className="row">
                <Avatar first={me.first} last={me.last} color={me.color} size={44} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{me.first} {me.last}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{me.role} · {me.company}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <span className="chip branch">{me.branch}</span>
                <span className="chip">{me.work}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="upper-label" style={{ marginBottom: 8 }}>Datenquelle</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
              {dataSource === "live" ? "Live-Modus: Änderungen werden in Supabase gespeichert." : "Demo-Modus: Änderungen bleiben nur lokal."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label className="field-label">{label}</label>
      <div
        style={{
          padding: "9px 12px",
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          fontSize: 13.5,
          color: "var(--ink-2)",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", cursor: "pointer", fontSize: 13.5 }}>
      <span>{label}</span>
      <span
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          background: value ? "var(--accent)" : "var(--line-strong)",
          position: "relative",
          transition: "background 120ms",
        }}
      >
        <span
          style={{
            position: "absolute",
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            top: 2,
            left: value ? 18 : 2,
            transition: "left 120ms",
          }}
        />
      </span>
    </label>
  );
}
