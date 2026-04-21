"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { reload, useMe } from "@/lib/hooks";
import { BRANCHES, CITIES, ROLES, SPORTS, type Member } from "@/lib/data";
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
        first: form.first,
        last: form.last,
        company: form.company,
        role: form.role,
        branch: form.branch,
        sub: form.sub,
        work: form.work,
        home: form.home,
        email: form.email,
        since: form.since,
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
            Alle Felder kannst du hier direkt bearbeiten.
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
            <div className="upper-label" style={{ marginBottom: 14 }}>Stammdaten</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <TextField label="Vorname" value={form.first} onChange={(v) => set("first", v)} />
              <TextField label="Nachname" value={form.last} onChange={(v) => set("last", v)} />
              <TextField label="Firma" value={form.company} onChange={(v) => set("company", v)} />
              <TextField
                label="Rolle"
                value={form.role}
                onChange={(v) => set("role", v)}
                list="roles-list"
              />
              <SelectField
                label="Branche"
                value={form.branch}
                onChange={(v) => {
                  set("branch", v);
                  if (!BRANCHES[v]?.includes(form.sub)) set("sub", "");
                }}
                options={Object.keys(BRANCHES)}
              />
              <SelectField
                label="Subbranche"
                value={form.sub}
                onChange={(v) => set("sub", v)}
                options={BRANCHES[form.branch] ?? []}
                disabled={!form.branch}
              />
              <TextField
                label="Arbeitsort"
                value={form.work}
                onChange={(v) => set("work", v)}
                list="cities-list"
              />
              <TextField
                label="Wohnort"
                value={form.home}
                onChange={(v) => set("home", v)}
                list="cities-list"
              />
              <TextField label="E-Mail" type="email" value={form.email} onChange={(v) => set("email", v)} />
              <TextField
                label="Member seit"
                value={form.since}
                onChange={(v) => set("since", v)}
                placeholder="TT.MM.JJJJ"
              />
            </div>
            <datalist id="roles-list">
              {ROLES.map((r) => <option key={r} value={r} />)}
            </datalist>
            <datalist id="cities-list">
              {CITIES.map((c) => <option key={c} value={c} />)}
            </datalist>
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
                <Avatar first={form.first} last={form.last} color={me.color} size={44} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{form.first} {form.last}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{form.role} · {form.company}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {form.branch && <span className="chip branch">{form.branch}</span>}
                {form.work && <span className="chip">{form.work}</span>}
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

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  list,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  list?: string;
}) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label className="field-label">{label}</label>
      <input
        className="input"
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={list}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label className="field-label">{label}</label>
      <select
        className="input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">— auswählen —</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
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
