"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { reload, useMe } from "@/lib/hooks";
import { BRANCHES, LOCATIONS, ROLES, SPORTS, type Member } from "@/lib/data";
import {
  removeAvatarAction,
  updateProfileAction,
  uploadAvatarAction,
  type ProfileInput,
} from "@/app/actions/members";

type Form = Member & { linkedin: string; showMobile: boolean; showEmail: boolean; matchmaking: boolean };

const COLOR_SWATCHES = [
  "#C7916A", // Terracotta
  "#B8876B", // Warm Taupe
  "#6B8AA8", // Steel Blue
  "#6B9A9E", // Teal
  "#7A9B7A", // Sage
  "#A67A9E", // Dusty Mauve
  "#8C7396", // Aubergine
  "#9E8A6B", // Khaki
  "#C36060", // Coral
  "#4A6670", // Slate
];

export default function ProfilePage() {
  const router = useRouter();
  const { data: me, isDemo } = useMe();
  const { dataSource } = useSettings();
  const [form, setForm] = useState<Form | null>(null);
  const [status, setStatus] = useState<{ error?: string; ok?: boolean }>({});
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [sportDraft, setSportDraft] = useState("");

  useEffect(() => {
    if (!me) return;
    setForm({
      ...me,
      linkedin: me.linkedin ?? "",
      showMobile: true,
      showEmail: true,
      matchmaking: true,
    });
    setLocalAvatarUrl(me.avatarUrl ?? null);
  }, [me]);

  if (!me || !form) return null;

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const onPickFile = () => {
    setAvatarError(null);
    fileInputRef.current?.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Nur JPG, PNG oder WebP erlaubt.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setAvatarError("Datei zu gross (max. 25 MB).");
      return;
    }

    if (isDemo) {
      const url = URL.createObjectURL(file);
      setLocalAvatarUrl(url);
      return;
    }

    setAvatarPending(true);
    setAvatarError(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await uploadAvatarAction(fd);
    setAvatarPending(false);
    if (r.error) {
      setAvatarError(r.error);
      return;
    }
    if (r.url) setLocalAvatarUrl(r.url);
    reload("members");
    router.refresh();
  };

  const onRemoveAvatar = async () => {
    setAvatarError(null);
    if (isDemo) {
      setLocalAvatarUrl(null);
      return;
    }
    setAvatarPending(true);
    const r = await removeAvatarAction();
    setAvatarPending(false);
    if (r.error) {
      setAvatarError(r.error);
      return;
    }
    setLocalAvatarUrl(null);
    reload("members");
    router.refresh();
  };

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
        color: form.color,
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
                placeholder="z.B. CEO, Gründerin, oder beliebig"
                hint="Tippe frei oder wähle aus den Vorschlägen"
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
              <ComboField
                label="Arbeitsort"
                value={form.work}
                onChange={(v) => set("work", v)}
                options={LOCATIONS}
                placeholder="Stadt oder Kanton"
              />
              <ComboField
                label="Wohnort"
                value={form.home}
                onChange={(v) => set("home", v)}
                options={LOCATIONS}
                placeholder="Stadt oder Kanton"
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
                {Array.from(new Set([...SPORTS, ...(form.sports || [])])).map((s) => {
                  const active = (form.sports || []).includes(s);
                  const isCustom = !SPORTS.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() =>
                        set("sports", active ? form.sports.filter((x) => x !== s) : [...(form.sports || []), s])
                      }
                      className="chip"
                      style={{
                        cursor: "pointer",
                        border: active
                          ? "1px solid var(--ink)"
                          : isCustom
                            ? "1px dashed var(--line-strong)"
                            : undefined,
                        background: active ? "var(--ink)" : undefined,
                        color: active ? "var(--bg)" : undefined,
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <input
                  className="input"
                  value={sportDraft}
                  onChange={(e) => setSportDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = sportDraft.trim();
                      if (!v) return;
                      if (!(form.sports || []).includes(v)) {
                        set("sports", [...(form.sports || []), v]);
                      }
                      setSportDraft("");
                    }
                  }}
                  placeholder="Eigenen Sport hinzufügen..."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const v = sportDraft.trim();
                    if (!v) return;
                    if (!(form.sports || []).includes(v)) {
                      set("sports", [...(form.sports || []), v]);
                    }
                    setSportDraft("");
                  }}
                  disabled={!sportDraft.trim()}
                >
                  Hinzufügen
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>Links & Sichtbarkeit</div>
            <div className="field">
              <label className="field-label">LinkedIn URL</label>
              <input
                className="input"
                value={form.linkedin}
                onChange={(e) => set("linkedin", e.target.value)}
                placeholder="linkedin.com/in/dein-handle"
              />
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
              <Avatar
                first={me.first}
                last={me.last}
                color={form.color}
                size={120}
                square
                url={localAvatarUrl}
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChosen}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
              <button className="btn btn-ghost" onClick={onPickFile} disabled={avatarPending}>
                {avatarPending ? "..." : localAvatarUrl ? "Ersetzen" : "Hochladen"}
              </button>
              {localAvatarUrl && (
                <button
                  className="btn btn-text"
                  style={{ color: "var(--ink-3)" }}
                  onClick={onRemoveAvatar}
                  disabled={avatarPending}
                >
                  Entfernen
                </button>
              )}
            </div>
            {avatarError && (
              <div style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 8 }}>{avatarError}</div>
            )}
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 10 }}>JPG, PNG oder WebP · max. 25 MB</div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="upper-label" style={{ marginBottom: 10 }}>Banner-Farbe</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 12, lineHeight: 1.5 }}>
              Wird als Hintergrund für dein Banner und deinen Avatar verwendet.
            </div>
            <div
              style={{
                height: 70,
                borderRadius: "var(--radius)",
                background: `linear-gradient(135deg, ${form.color} 0%, var(--ink) 140%)`,
                marginBottom: 12,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div aria-hidden="true" className="avatar-stripes" />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COLOR_SWATCHES.map((c) => {
                const active = form.color?.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    aria-label={c}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border: active ? "2px solid var(--ink)" : "2px solid transparent",
                      outline: "1px solid var(--line)",
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="upper-label" style={{ marginBottom: 10 }}>Preview</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 12 }}>
              So sehen dich andere Mitglieder im Directory:
            </div>
            <div className="card" style={{ padding: 14, boxShadow: "none" }}>
              <div className="row">
                <Avatar first={form.first} last={form.last} color={form.color} size={44} url={localAvatarUrl} />
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  list?: string;
  hint?: string;
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
      {hint && (
        <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}

function ComboField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [touched, setTouched] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = (value ?? "").trim().toLowerCase();
  // Only surface suggestions once the user starts typing — a dropdown of 90
  // Swiss cities on every focus is noisy. Exact match? Don't bother suggesting.
  const filtered = touched && q.length >= 1 && !options.some((o) => o.toLowerCase() === q)
    ? options.filter((o) => o.toLowerCase().includes(q)).slice(0, 8)
    : [];

  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label className="field-label">{label}</label>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <input
          className="input"
          type="text"
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setTouched(true);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => {
            if (touched && filtered.length > 0) setOpen(true);
          }}
          onBlur={() => {
            // Delay so a click on an option registers before close.
            setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && filtered.length > 0) {
              e.preventDefault();
              setOpen(true);
              setHighlighted((h) => Math.min(filtered.length - 1, h + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlighted((h) => Math.max(0, h - 1));
            } else if (e.key === "Enter" && open && highlighted >= 0 && filtered[highlighted]) {
              e.preventDefault();
              onChange(filtered[highlighted]);
              setOpen(false);
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Tab") {
              setOpen(false);
            }
          }}
        />
        {open && filtered.length > 0 && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 50,
              background: "var(--bg-elevated)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-lg)",
              maxHeight: 260,
              overflowY: "auto",
              padding: 4,
            }}
          >
            {filtered.map((o, i) => (
              <div
                key={o}
                role="option"
                aria-selected={o === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13.5,
                  background: highlighted === i ? "var(--bg-sunken)" : "transparent",
                  color: "var(--ink)",
                }}
              >
                {o}
              </div>
            ))}
          </div>
        )}
      </div>
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
