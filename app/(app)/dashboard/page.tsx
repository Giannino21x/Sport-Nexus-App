"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useEvents, useMe, useMembers } from "@/lib/hooks";

export default function DashboardPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: members } = useMembers();
  const { data: events } = useEvents();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Keep the greeting in sync across hour-boundary transitions without a full page reload.
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!me) return null;

  const hour = now.getHours();
  const greeting =
    hour < 5 ? "Gute Nacht" :
    hour < 11 ? "Guten Morgen" :
    hour < 17 ? "Guten Tag" :
    hour < 22 ? "Guten Abend" :
    "Gute Nacht";

  const upcoming = events.filter((e) => e.status === "upcoming").sort((a, b) => a.date.localeCompare(b.date));
  const matchSuggestions = members.filter(
    (m) => m.id !== me.id && (m.branch === me.branch || m.sports.some((s) => me.sports.includes(s))),
  ).slice(0, 3);

  const branchCount = new Set(members.map((m) => m.branch).filter(Boolean)).size;

  const nonEmpty = (v?: string | null) => Boolean(v && v.trim().length > 0);
  const profileChecks: { label: string; filled: boolean }[] = [
    { label: "Profilbild", filled: nonEmpty(me.avatarUrl) },
    { label: "Firma", filled: nonEmpty(me.company) },
    { label: "Rolle", filled: nonEmpty(me.role) },
    { label: "Branche", filled: nonEmpty(me.branch) },
    { label: "Arbeitsort", filled: nonEmpty(me.work) },
    { label: "Wohnort", filled: nonEmpty(me.home) },
    { label: "Bio", filled: nonEmpty(me.bio) },
    { label: "Angebot", filled: nonEmpty(me.offer) },
    { label: "Suche", filled: nonEmpty(me.search) },
    { label: "Sportinteressen", filled: (me.sports ?? []).length > 0 },
    { label: "Mobile", filled: nonEmpty(me.mobile) },
    { label: "Webseite", filled: nonEmpty(me.web) },
    { label: "LinkedIn", filled: nonEmpty(me.linkedin) },
  ];
  const profileFilled = profileChecks.filter((c) => c.filled).length;
  const profileTotal = profileChecks.length;
  const profilePct = Math.round((profileFilled / profileTotal) * 100);
  const profileMissing = profileChecks.filter((c) => !c.filled).map((c) => c.label);

  const stats = [
    { k: "Mitglieder", v: members.length, sub: "im Netzwerk" },
    { k: "Kommende Events", v: upcoming.length, sub: "angekündigt" },
    { k: "Branchen", v: branchCount, sub: "vertreten" },
    { k: "Matchmaking", v: matchSuggestions.length, sub: "Vorschläge für dich" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Dashboard</div>
          <h1 style={{ marginTop: 6 }}>
            {greeting}, <em style={{ color: "var(--accent)", fontStyle: "italic" }}>{me.first}</em>.
          </h1>
          <div className="subtitle">Du bist seit {me.since} Teil der SportNexus Community.</div>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/profile">
            <Icon name="edit" size={14} /> Profil bearbeiten
          </Link>
          <Link className="btn btn-accent" href="/directory">
            Kontakte finden <Icon name="arrow" size={14} />
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        {stats.map((s) => (
          <div key={s.k} className="card" style={{ padding: "16px 18px" }}>
            <div className="upper-label">{s.k}</div>
            <div className="serif" style={{ fontSize: 36, lineHeight: 1.05, marginTop: 6 }}>{s.v}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 18 }} className="dash-grid">
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <div className="upper-label">Kommende Events</div>
              <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>Nächste Treffen</div>
            </div>
            <Link href="/events" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
              Alle ansehen →
            </Link>
          </div>
          <div className="col" style={{ gap: 0 }}>
            {upcoming.length === 0 && (
              <div style={{ padding: "20px 0", fontSize: 13, color: "var(--ink-3)", textAlign: "center" }}>
                Noch keine Events angekündigt.
              </div>
            )}
            {upcoming.slice(0, 3).map((ev, i) => {
              const d = new Date(ev.date);
              return (
                <div
                  key={ev.id}
                  onClick={() => router.push(`/events/${ev.id}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "68px 1fr auto",
                    gap: 16,
                    padding: "14px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--line)",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div className="serif" style={{ fontSize: 32, lineHeight: 1 }}>{d.getDate()}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", marginTop: 4 }}>
                      {d.toLocaleDateString("de-CH", { month: "short" })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 15 }}>{ev.title} — {ev.city}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{ev.subtitle}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 4, display: "flex", gap: 12 }}>
                      <span>{ev.time}</span><span>{ev.venue}</span><span>~{ev.guests} Gäste</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "7px 12px", fontSize: 12.5 }}
                    onClick={(e) => { e.stopPropagation(); router.push(`/events/${ev.id}`); }}
                  >
                    Registrieren
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          {matchSuggestions.length > 0 ? (
            <div
              className="card"
              style={{ padding: 20, background: "linear-gradient(180deg, var(--accent-soft) 0%, var(--bg-elevated) 100%)", borderColor: "transparent" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--accent)" }}>
                <Icon name="sparkle" size={14} />
                <span className="upper-label" style={{ color: "var(--accent)" }}>Beta · Matchmaking</span>
              </div>
              <div className="serif" style={{ fontSize: 22, marginTop: 8, lineHeight: 1.15 }}>
                {matchSuggestions.length === 1
                  ? "1 Kontakt, der zu dir passen könnte"
                  : `${matchSuggestions.length} Kontakte, die zu dir passen könnten`}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>
                Basierend auf Branche, Sportinteressen und deiner „Suche".
              </div>
              <div className="col" style={{ gap: 10, marginTop: 16 }}>
                {matchSuggestions.map((m) => (
                  <Link
                    key={m.id}
                    href={`/directory/${m.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <Avatar first={m.first} last={m.last} color={m.color} size={34} url={m.avatarUrl} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{m.first} {m.last}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.role} · {m.company}
                      </div>
                    </div>
                    <Icon name="arrow" size={14} />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--accent)" }}>
                <Icon name="sparkle" size={14} />
                <span className="upper-label" style={{ color: "var(--accent)" }}>Beta · Matchmaking</span>
              </div>
              <div className="serif" style={{ fontSize: 20, marginTop: 8, lineHeight: 1.2 }}>
                Noch keine Vorschläge
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>
                Sobald mehr Mitglieder beigetreten sind, findest du hier passende Kontakte.
              </div>
            </div>
          )}

          <Link
            href="/profile"
            className="card"
            style={{ padding: 20, display: "block", cursor: "pointer", transition: "transform 120ms" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div className="upper-label">Deine Profil-Sichtbarkeit</div>
              <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                {profileFilled}/{profileTotal}
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8, marginBottom: 12 }}>
              {profilePct === 100
                ? "Dein Profil ist komplett ausgefüllt."
                : `Dein Profil ist zu ${profilePct}% ausgefüllt. Ergänze fehlende Felder, um gefunden zu werden.`}
            </div>
            <div
              style={{
                height: 8,
                background: "var(--bg-sunken)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${profilePct}%`,
                  height: "100%",
                  background: profilePct === 100 ? "var(--success)" : "var(--accent)",
                  transition: "width 240ms ease-out",
                }}
              />
            </div>
            {profileMissing.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {profileMissing.slice(0, 8).map((label) => (
                  <span
                    key={label}
                    className="chip"
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      border: "1px dashed var(--line-strong)",
                      background: "transparent",
                      color: "var(--ink-3)",
                    }}
                  >
                    {label}
                  </span>
                ))}
                {profileMissing.length > 8 && (
                  <span style={{ fontSize: 11, color: "var(--ink-4)", alignSelf: "center" }}>
                    +{profileMissing.length - 8} weitere
                  </span>
                )}
              </div>
            )}
            <div className="btn btn-text" style={{ marginTop: 14, padding: "6px 0", display: "inline-flex" }}>
              {profilePct === 100 ? "Profil ansehen" : "Profil vervollständigen"} →
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
