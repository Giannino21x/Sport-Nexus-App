"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { reload, useEvents, useMe, useMember } from "@/lib/hooks";
import { setMemberExtraAction } from "@/app/actions/members";

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: m, loading } = useMember(id);
  const { data: me } = useMe();
  const { data: events } = useEvents();
  const isAdmin = Boolean(me?.isAdmin);

  if (loading) return <div style={{ padding: 40, color: "var(--ink-3)" }}>Lade...</div>;
  if (!m) {
    return (
      <div>
        <Link href="/directory" className="btn btn-text" style={{ marginBottom: 12, padding: "6px 10px", fontSize: 12.5, color: "var(--ink-3)", display: "inline-flex" }}>
          ← Zurück zum Directory
        </Link>
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
          <div className="serif" style={{ fontSize: 24 }}>Mitglied nicht gefunden</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Dieses Profil existiert nicht (mehr).</div>
        </div>
      </div>
    );
  }

  const upcomingEvents = events.filter((e) => e.status === "upcoming").slice(0, 2);

  return (
    <div>
      <Link href="/directory" className="btn btn-text" style={{ marginBottom: 12, padding: "6px 10px", fontSize: 12.5, color: "var(--ink-3)", display: "inline-flex" }}>
        ← Zurück zum Directory
      </Link>

      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div
          style={{
            height: 140,
            background: `linear-gradient(135deg, ${m.color} 0%, var(--ink) 140%)`,
            position: "relative",
          }}
        >
          <div aria-hidden="true" className="avatar-stripes" />
        </div>
        <div
          style={{
            padding: "18px 28px 24px",
            display: "flex",
            gap: 20,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ marginTop: -74, flexShrink: 0 }}>
            <Avatar
              first={m.first}
              last={m.last}
              color={m.color}
              size={108}
              square
              url={m.avatarUrl}
            />
          </div>
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <div
              className="serif"
              style={{
                fontSize: "clamp(26px, 4.2vw, 40px)",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {m.first} {m.last}
            </div>
            <div
              style={{
                fontSize: 15,
                color: "var(--ink-2)",
                marginTop: 6,
                overflowWrap: "anywhere",
              }}
            >
              {m.role} · {m.company}
            </div>
            <ExtraTitle member={m} isAdmin={isAdmin} />
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {m.email && (
              <a className="btn btn-ghost" href={`mailto:${m.email}`}>
                <Icon name="mail" size={14} /> E-Mail
              </a>
            )}
            <Link href={`/messages?to=${m.id}`} className="btn btn-accent">
              <Icon name="message" size={14} /> Nachricht
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 18 }} className="dash-grid">
        <div className="col" style={{ gap: 18 }}>
          {m.bio && (
            <div className="card" style={{ padding: 24 }}>
              <div className="upper-label" style={{ marginBottom: 10 }}>Bio</div>
              <div className="serif" style={{ fontSize: 20, lineHeight: 1.45 }}>{m.bio}</div>
            </div>
          )}

          <div className="card" style={{ padding: 24 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>Unternehmen & Angebot</div>
            <InfoRow label="Firma" value={m.company} />
            <InfoRow label="Rolle" value={m.role} />
            <InfoRow label="Zusatzfunktionen" value={m.extra} />
            <InfoRow label="Angebot" value={m.offer} />
            <InfoRow label="Branche" value={`${m.branch}${m.sub ? " · " + m.sub : ""}`} />
            <InfoRow
              label="Webseite"
              value={
                m.web ? (
                  <a href={`https://${m.web}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                    {m.web}
                  </a>
                ) : null
              }
            />
          </div>

          {m.search && (
            <div className="card" style={{ padding: 24, background: "var(--accent-soft)", borderColor: "transparent" }}>
              <div className="upper-label" style={{ color: "var(--accent)" }}>Suche</div>
              <div className="serif" style={{ fontSize: 22, marginTop: 8, lineHeight: 1.3 }}>{m.search}</div>
              <Link href={`/messages?to=${m.id}`} className="btn btn-primary" style={{ marginTop: 14, display: "inline-flex" }}>
                Ich kann helfen →
              </Link>
            </div>
          )}

          <div className="card" style={{ padding: 24 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>Persönliches</div>
            <InfoRow label="Arbeitsort" value={m.work} />
            <InfoRow label="Wohnort" value={m.home} />
            <InfoRow
              label="Sportinteressen"
              value={
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {m.sports.map((s) => <span key={s} className="chip">{s}</span>)}
                </div>
              }
            />
            <InfoRow label="Member seit" value={m.since} mono />
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="upper-label" style={{ marginBottom: 10 }}>Kontakt</div>
            {m.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
                <Icon name="mail" size={14} className="text-ink-3" />
                <a href={`mailto:${m.email}`} style={{ color: "var(--accent)", textDecoration: "underline" }}>
                  {m.email}
                </a>
              </div>
            )}
            {m.mobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
                <Icon name="phone" size={14} className="text-ink-3" />
                <a href={`tel:${m.mobile.replace(/\s+/g, "")}`} style={{ color: "var(--accent)", textDecoration: "underline" }}>
                  {m.mobile}
                </a>
              </div>
            )}
            {m.web && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
                <Icon name="globe" size={14} className="text-ink-3" />
                <a
                  href={m.web.startsWith("http") ? m.web : `https://${m.web}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "underline" }}
                >
                  {m.web.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </div>
            )}
            {m.linkedin && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
                <Icon name="link" size={14} className="text-ink-3" />
                <a
                  href={m.linkedin.startsWith("http") ? m.linkedin : `https://${m.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "underline" }}
                >
                  {m.linkedin.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 12, lineHeight: 1.5, padding: "8px 10px", background: "var(--bg-sunken)", borderRadius: 8 }}>
              Kontaktdaten sind nur für SportNexus-Members sichtbar und dürfen nicht weitergegeben werden.
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="upper-label" style={{ marginBottom: 12 }}>Trifft man bei Events</div>
            {upcomingEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: "1px solid var(--line)" }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1, width: 36 }}>
                  {new Date(ev.date).getDate()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{ev.subtitle}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{ev.city} · {ev.venue}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: ReactNode | null | undefined; mono?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)", alignItems: "baseline" }}>
      <div className="upper-label">{label}</div>
      <div className={mono ? "mono" : ""} style={{ fontSize: 13.5 }}>{value}</div>
    </div>
  );
}

function ExtraTitle({
  member,
  isAdmin,
}: {
  member: ReturnType<typeof useMember>["data"];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(member?.extra ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!member) return null;

  const onSave = async () => {
    if (!member.dbId) { setErr("Kein DB-ID für dieses Profil."); return; }
    setErr(null);
    setSaving(true);
    try {
      const r = await setMemberExtraAction(member.dbId, draft);
      if (r.error) { setErr(r.error); return; }
      setEditing(false);
      reload("members");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="z.B. Admin, SportNexus Co-Founder, Forbes 30U30"
          style={{ flex: "1 1 240px", minWidth: 0, fontSize: 13 }}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSave(); } if (e.key === "Escape") setEditing(false); }}
        />
        <button className="btn btn-primary" onClick={onSave} disabled={saving} style={{ padding: "6px 12px", fontSize: 12.5 }}>
          {saving ? "..." : "Speichern"}
        </button>
        <button className="btn btn-ghost" onClick={() => { setDraft(member.extra ?? ""); setEditing(false); }} disabled={saving} style={{ padding: "6px 12px", fontSize: 12.5 }}>
          Abbrechen
        </button>
        {err && <div style={{ fontSize: 11.5, color: "var(--danger)", width: "100%" }}>{err}</div>}
      </div>
    );
  }

  const isAdminBadge = (member.extra ?? "").trim().toLowerCase() === "admin";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: member.extra ? 4 : 6, flexWrap: "wrap" }}>
      {member.extra ? (
        isAdminBadge ? (
          <span
            style={{
              fontSize: 11,
              padding: "3px 9px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "#2563EB",
              color: "#FFFFFF",
              borderRadius: 999,
              display: "inline-block",
              lineHeight: 1.4,
            }}
          >
            Admin
          </span>
        ) : (
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontStyle: "italic" }}>
            {member.extra}
          </div>
        )
      ) : null}
      {isAdmin && (
        <button
          className="btn-text"
          onClick={() => { setDraft(member.extra ?? ""); setEditing(true); }}
          style={{ padding: 0, fontSize: 11.5, color: "var(--ink-4)", cursor: "pointer" }}
          title="Titel als Admin setzen"
        >
          {member.extra ? "· Titel bearbeiten" : "+ Titel setzen"}
        </button>
      )}
    </div>
  );
}
