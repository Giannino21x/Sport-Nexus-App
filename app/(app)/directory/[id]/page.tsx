"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useEvents, useMember } from "@/lib/hooks";

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: m, loading } = useMember(id);
  const { data: events } = useEvents();

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
        <div style={{ height: 120, background: `linear-gradient(135deg, ${m.color} 0%, var(--ink) 140%)`, position: "relative" }}>
          <div aria-hidden="true" className="avatar-stripes" />
        </div>
        <div style={{ padding: "0 28px 24px", marginTop: -50, display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Avatar first={m.first} last={m.last} color={m.color} size={108} square />
          <div style={{ flex: 1, minWidth: 240, paddingBottom: 4 }}>
            <div className="serif" style={{ fontSize: 40, lineHeight: 1, letterSpacing: "-0.01em" }}>
              {m.first} {m.last}
            </div>
            <div style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 6 }}>{m.role} · {m.company}</div>
            {m.extra && <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2, fontStyle: "italic" }}>{m.extra}</div>}
          </div>
          <div className="row" style={{ paddingBottom: 4, flexWrap: "wrap" }}>
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
                <Icon name="mail" size={14} className="text-ink-3" /> {m.email}
              </div>
            )}
            {m.mobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
                <Icon name="phone" size={14} className="text-ink-3" /> {m.mobile}
              </div>
            )}
            {m.web && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
                <Icon name="globe" size={14} className="text-ink-3" /> {m.web}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
              <Icon name="link" size={14} className="text-ink-3" /> linkedin.com/in/{m.id}
            </div>
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
