"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useEvents, useMe, useMembers } from "@/lib/hooks";

export default function DashboardPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: members } = useMembers();
  const { data: events } = useEvents();

  if (!me) return null;

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Hallo" : "Guten Abend";

  const upcoming = events.filter((e) => e.status === "upcoming").sort((a, b) => a.date.localeCompare(b.date));
  const matchSuggestions = members.filter(
    (m) => m.id !== me.id && (m.branch === me.branch || m.sports.some((s) => me.sports.includes(s))),
  ).slice(0, 3);

  const branchCount = new Set(members.map((m) => m.branch).filter(Boolean)).size;
  const profileFields: (string | undefined)[] = [me.bio, me.offer, me.search, me.mobile, me.web];
  const profileFilled = profileFields.filter((v) => v && v.trim().length > 0).length
    + (me.sports.length > 0 ? 1 : 0);
  const profilePct = Math.round((profileFilled / (profileFields.length + 1)) * 100);

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
                    <Avatar first={m.first} last={m.last} color={m.color} size={34} />
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

          <div className="card" style={{ padding: 20 }}>
            <div className="upper-label">Deine Profil-Sichtbarkeit</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8, marginBottom: 12 }}>
              Dein Profil ist zu {profilePct}% ausgefüllt.
              {profilePct < 100 && " Ergänze fehlende Felder, um gefunden zu werden."}
            </div>
            <div style={{ height: 6, background: "var(--bg-sunken)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${profilePct}%`, height: "100%", background: "var(--accent)" }} />
            </div>
            <Link href="/profile" className="btn btn-text" style={{ marginTop: 12, padding: "6px 0" }}>
              Profil vervollständigen →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
