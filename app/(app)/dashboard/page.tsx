"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useEvents, useMe, useMembers } from "@/lib/hooks";
import { useMyRegistrations } from "@/lib/registrations";
import { getEventAttendeeCountsAction } from "@/app/actions/guestoo";

export default function DashboardPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: members, resolved: membersReady } = useMembers();
  const { data: events, resolved: eventsReady } = useEvents();
  const { isRegistered } = useMyRegistrations();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Keep the greeting in sync across hour-boundary transitions without a full page reload.
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Hooks müssen unbedingt VOR dem early-return stehen — Rules of Hooks. Wir
  // berechnen `upcoming` daher hier oben (auch wenn `me` evtl. noch fehlt),
  // damit `useMemo`/`useState`/`useEffect` stabil sind.
  const upcoming = events.filter((e) => e.status === "upcoming").sort((a, b) => a.date.localeCompare(b.date));

  // Echtzeit-Anmeldungen aus Guestoo für die Top-3 — Pascals F1-Wunsch, dass
  // Gästeanzahl pro Event im Memberbereich angezeigt wird. Best-effort: wenn
  // ein Event keine guestooId hat oder Guestoo nicht erreichbar ist, fallen wir
  // auf die statische ev.guests-Kapazität zurück.
  const top3GuestooIds = useMemo(
    () => upcoming.slice(0, 3).map((e) => e.guestooId).filter((id): id is string => Boolean(id)),
    [upcoming],
  );
  const [guestooCounts, setGuestooCounts] = useState<Record<string, number | null>>({});
  const guestooKey = top3GuestooIds.join(",");
  useEffect(() => {
    if (top3GuestooIds.length === 0) return;
    let cancelled = false;
    getEventAttendeeCountsAction(top3GuestooIds).then((r) => {
      if (cancelled) return;
      setGuestooCounts(r.counts);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Stabilisiert via guestooKey, sonst Endlosschleife durch neue Array-Identität
  }, [guestooKey]);

  if (!me) return null;

  const hour = now.getHours();
  const greeting =
    hour < 5 ? "Gute Nacht" :
    hour < 11 ? "Guten Morgen" :
    hour < 17 ? "Guten Tag" :
    hour < 22 ? "Guten Abend" :
    "Gute Nacht";

  // Matchmaking: score every other member by shared signals — Branche zählt am
  // schwersten, dann Subbranche, geteilte Sportarten, gleicher Arbeitsort,
  // gleicher Wohnort. Wer kein Profil ausgefüllt hat, sieht trotzdem Vorschläge
  // (zufällige stabile Reihenfolge), damit das Modul nicht leer wirkt.
  const meHasSignal = Boolean(me.branch || me.sub || me.work || me.home || (me.sports ?? []).length > 0);
  const others = members.filter((m) => m.id !== me.id);
  const scored = others
    .map((m) => {
      let s = 0;
      if (me.branch && m.branch === me.branch) s += 3;
      if (me.sub && m.sub === me.sub) s += 2;
      const sharedSports = (m.sports ?? []).filter((sp) => (me.sports ?? []).includes(sp)).length;
      s += sharedSports;
      if (me.work && m.work === me.work) s += 1;
      if (me.home && m.home === me.home) s += 1;
      return { m, s };
    })
    .sort((a, b) => b.s - a.s || a.m.id.localeCompare(b.m.id));
  const matchSuggestions = (
    meHasSignal && scored.some((x) => x.s > 0)
      ? scored.filter((x) => x.s > 0)
      : scored
  )
    .slice(0, 3)
    .map((x) => x.m);

  // Bei wie vielen kommenden Events bin ich bereits angemeldet (lokaler Marker,
  // bis die Guestoo/HubSpot-Verknüpfung die verbindliche Quelle liefert).
  const registeredUpcomingCount = upcoming.filter((e) => isRegistered(e.id)).length;

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

  // Erste Ladung (noch nichts im Cache): "–" statt 0 zeigen — eine falsche 0,
  // die dann zur echten Zahl umspringt, wirkt wie ein Flicker.
  const stats = [
    { k: "Mitglieder", v: membersReady ? members.length : "–", sub: "im Netzwerk" },
    { k: "Kommende Events", v: eventsReady ? upcoming.length : "–", sub: "angekündigt" },
    { k: "Angemeldete Events", v: eventsReady ? registeredUpcomingCount : "–", sub: eventsReady ? `von ${upcoming.length} möglichen` : "wird geladen" },
    { k: "Matchmaking", v: membersReady ? matchSuggestions.length : "–", sub: "Vorschläge für dich" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Dashboard</div>
          <h1 style={{ marginTop: 6 }}>
            {greeting}, <em style={{ color: "var(--accent)", fontStyle: "italic" }}>{me.first}</em>.
          </h1>
          <div className="subtitle">Schön, dass du Teil der SportNexus Community bist.</div>
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
              <div className="serif" style={{ fontSize: 22 }}>Kommende Events</div>
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
              const liveCount = ev.guestooId ? guestooCounts[ev.guestooId] : undefined;
              const attendeesLabel =
                liveCount !== undefined && liveCount !== null
                  ? `${liveCount} angemeldet${ev.guests ? ` · ${ev.guests} Plätze` : ""}`
                  : `~${ev.guests} Gäste`;
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 500, fontSize: 15 }}>{ev.title} — {ev.city}</span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 500,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: isRegistered(ev.id) ? "var(--success)" : "var(--bg-sunken)",
                          color: isRegistered(ev.id) ? "#FFFFFF" : "var(--ink-3)",
                          border: isRegistered(ev.id) ? "none" : "1px solid var(--line)",
                        }}
                      >
                        {isRegistered(ev.id) ? "Angemeldet" : "Nicht angemeldet"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{ev.subtitle}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>{ev.time}</span><span>{ev.venue}</span><span>{attendeesLabel}</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "7px 12px", fontSize: 12.5 }}
                    onClick={(e) => { e.stopPropagation(); router.push(`/events/${ev.id}`); }}
                  >
                    Details
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
                Basierend auf Branche, Sportinteressen und deiner &bdquo;Suche&ldquo;.
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
                {meHasSignal ? "Noch keine Vorschläge" : "Profil vervollständigen für Vorschläge"}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>
                {meHasSignal
                  ? "Sobald mehr Mitglieder beigetreten sind, findest du hier passende Kontakte."
                  : 'Trag Branche, Sportinteressen und deine „Suche" ein — dann findest du hier passende Members.'}
              </div>
              {!meHasSignal && (
                <Link href="/profile" className="btn btn-primary" style={{ marginTop: 14, display: "inline-flex" }}>
                  Profil bearbeiten →
                </Link>
              )}
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
