"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Icon, type IconName } from "@/components/icon";
import { useEvent, useMe, useMembers } from "@/lib/hooks";
import { useMyRegistrations } from "@/lib/registrations";
import { getEventAttendeesAction, getEventStatsAction, type EventAttendee, type EventStats } from "@/app/actions/guestoo";

// Solange Guestoo das System of Record für Anmeldungen ist, leiten wir
// Registration-Klicks zur Guestoo-Übersichtsseite. Wenn das Event eine
// guestooId hat, hängen wir sie als Query-Param dran, damit Guestoo (sofern
// unterstützt) direkt auf das richtige Event scrollt.
const GUESTOO_PUBLIC_URL = "https://events.guestoo.de/sportnexus";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: ev, loading, isDemo } = useEvent(id);
  const { data: members } = useMembers();
  const { data: me } = useMe();
  const { isRegistered, setRegistered } = useMyRegistrations();

  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [attendees, setAttendees] = useState<EventAttendee[] | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);

  // Verlässliche Anmeldezahlen über die ÖFFENTLICHE Guestoo-API (kein Login,
  // läuft nicht ab). Das ist die stabile Quelle für "X angemeldet / Y frei".
  useEffect(() => {
    if (!ev?.guestooId) return;
    let cancelled = false;
    getEventStatsAction(ev.guestooId).then((res) => {
      if (cancelled) return;
      if (res.stats) setStats(res.stats);
    });
    return () => { cancelled = true; };
  }, [ev?.guestooId]);

  // Namensliste der Anmeldungen — Best Effort über die cookie-basierte Visitors-
  // API. Fehler (z.B. abgelaufene Guestoo-Session) werden bewusst still behandelt,
  // im Live-Modus erscheint nirgends eine technische Fehlermeldung.
  useEffect(() => {
    if (!ev?.guestooId) return;
    let cancelled = false;
    getEventAttendeesAction(ev.guestooId).then((res) => {
      if (cancelled) return;
      if (!res.error) setAttendees(res.items ?? []);
    });
    return () => { cancelled = true; };
  }, [ev?.guestooId]);

  // Abgleich lokaler Anmelde-Marker mit der echten Guestoo-Anmeldeliste: taucht
  // mein Name in den Anmeldungen auf, markieren wir das Event automatisch als
  // "angemeldet". So stimmt der Status, sobald die Guestoo-Daten da sind.
  useEffect(() => {
    if (!ev || !me || !attendees) return;
    const mine = attendees.some(
      (a) =>
        a.firstName.trim().toLowerCase() === me.first.trim().toLowerCase() &&
        a.lastName.trim().toLowerCase() === me.last.trim().toLowerCase(),
    );
    if (mine && !isRegistered(ev.id)) setRegistered(ev.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei neuen Anmeldungen/Event abgleichen
  }, [ev?.id, me?.id, attendees]);

  if (loading) return <div style={{ padding: 40, color: "var(--ink-3)" }}>Lade...</div>;
  if (!ev) {
    return (
      <div>
        <Link href="/events" className="btn btn-text" style={{ marginBottom: 12, padding: "6px 10px", fontSize: 12.5, color: "var(--ink-3)", display: "inline-flex" }}>
          ← Zurück zu Events
        </Link>
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
          <div className="serif" style={{ fontSize: 24 }}>Event nicht gefunden</div>
        </div>
      </div>
    );
  }

  const d = new Date(ev.date);
  const past = ev.status === "past";
  // Live: ausschliesslich echte Guestoo-Anmeldungen. Demo: fiktive Members-
  // Vorschau (Demo-Daten haben keine Guestoo-Verknüpfung). Im Live-Modus zeigen
  // wir KEINE Platzhalter-Members und keine Fehlermeldung, wenn (noch) keine
  // Daten da sind — stattdessen einen neutralen Zustand (siehe unten).
  const realAttendees = attendees ?? [];
  const hasRealAttendees = realAttendees.length > 0;
  // Verlässliche Zahlen aus der Public-API (kein Login, kein Ablauf).
  const confirmed = stats?.confirmed ?? null;
  const freeSlots = stats?.freeSlots ?? null;
  const maxSlots = stats?.maxVisitor ?? ev.guests;
  // Vollständige Anmeldeliste (alle Namen, die wir haben) — beim Aufklappen
  // sollen ALLE sichtbar sein, nicht nur eine Vorschau.
  const attendeesFull = hasRealAttendees
    ? realAttendees.map((a) => ({
        id: `gst-${a.guestooId}`,
        first: a.firstName,
        last: a.lastName,
        company: a.company ?? "",
        role: "",
        color: "#6B8AA8",
        avatarUrl: undefined as string | undefined,
        memberSlug: null as string | null,
      }))
    : isDemo
      ? members.slice(0, Math.min(8, Math.max(4, Math.floor(ev.guests / 10)))).map((m) => ({
          id: m.id,
          first: m.first,
          last: m.last,
          company: m.company,
          role: m.role,
          color: m.color,
          avatarUrl: m.avatarUrl,
          memberSlug: m.id as string | null,
        }))
      : [];
  // Avatar-Cluster oben zeigt weiterhin nur eine kompakte Vorschau (max. 8 Gesichter).
  const attendingPreview = attendeesFull.slice(0, 8);
  // Bevorzugt die verlässliche Public-Zahl; sonst echte Namensliste; sonst Demo.
  const totalAttendees = confirmed ?? (hasRealAttendees ? realAttendees.length : isDemo ? ev.guests : 0);

  // Guestoo bleibt vorerst das System of Record für Registrationen. Wenn das
  // Event eine guestooId hat, hängen wir sie als Query-Param an die Public-URL,
  // sonst fällt der Link auf die Übersichts-Seite zurück.
  // Deep-Link auf die spezifische öffentliche Event-/Anmeldeseite (nicht die
  // Übersicht) — Format aus der Guestoo-Public-Page: app.guestoo.de/public/event/{id}.
  const guestooRegisterUrl = ev.guestooId
    ? `https://app.guestoo.de/public/event/${encodeURIComponent(ev.guestooId)}?lang=de`
    : GUESTOO_PUBLIC_URL;

  const reg = isRegistered(ev.id);
  const onRegisterClick = () => {
    // Deep-Link auf die spezifische Guestoo-Eventseite öffnen und lokal als
    // angemeldet markieren (bis Guestoo/HubSpot die verbindliche Verknüpfung liefert).
    if (typeof window !== "undefined") window.open(guestooRegisterUrl, "_blank", "noopener,noreferrer");
    setRegistered(ev.id, true);
  };

  return (
    <div>
      <Link
        href="/events"
        className="btn btn-text"
        style={{ marginBottom: 12, padding: "6px 10px", fontSize: 12.5, color: "var(--ink-3)", display: "inline-flex" }}
      >
        ← Zurück zu Events
      </Link>

      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        {/* Bild als sauberes Banner — unscharfer Füll-Hintergrund, damit auch
            quadratische Guestoo-Motive den Rahmen füllen, ohne beschnitten zu
            werden. Titel/Datum liegen NICHT mehr darüber, sondern darunter. */}
        <div className="event-hero-media">
          {ev.img && (
            <>
              <img aria-hidden="true" src={ev.img} alt="" className="event-hero-bg" />
              <img
                src={ev.img}
                alt={ev.subtitle || ev.title}
                className="event-hero-img"
                style={{ filter: past ? "grayscale(0.15) brightness(0.92)" : "none" }}
              />
            </>
          )}
          <div className="event-hero-chips">
            {ev.featured && <span className="chip" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderColor: "transparent" }}>Featured</span>}
            <span className="chip" style={{ background: "rgba(0,0,0,0.45)", color: "#fff", borderColor: "transparent", backdropFilter: "blur(6px)" }}>{ev.city}</span>
            {past && <span className="chip" style={{ background: "rgba(0,0,0,0.45)", color: "#fff", borderColor: "transparent", backdropFilter: "blur(6px)" }}>Vergangenes Event</span>}
          </div>
        </div>

        <div className="event-hero-body">
          <div className="event-hero-head">
            <div style={{ minWidth: 0 }}>
              <div className="upper-label">{ev.title}</div>
              <h1 className="serif event-hero-title">{ev.subtitle}</h1>
            </div>
            <div className="event-hero-date">
              <div className="serif day">{d.getDate()}</div>
              <div className="mon">{d.toLocaleDateString("de-CH", { month: "short" })}</div>
            </div>
          </div>
          <div className="event-hero-meta">
            <span><b>{d.toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</b></span>
            {ev.time && <span>{ev.time}</span>}
            {ev.venue && <span>{ev.venue}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 18 }} className="dash-grid">
        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 28 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>Über diesen Event</div>
            <div className="serif" style={{ fontSize: 22, lineHeight: 1.45 }}>{ev.long || ev.desc}</div>
          </div>

          {ev.speakers.length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <div className="upper-label" style={{ marginBottom: 14 }}>Speakers & Gäste</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {ev.speakers.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bg-sunken)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink)" }}>
                      {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{s.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ev.agenda.length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <div className="upper-label" style={{ marginBottom: 14 }}>Ablauf</div>
              {ev.agenda.map((a, i) => (
                <div
                  key={i}
                  style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 16, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)", alignItems: "baseline" }}
                >
                  <div className="mono" style={{ fontSize: 13, color: "var(--accent)" }}>{a.t}</div>
                  <div style={{ fontSize: 14 }}>{a.l}</div>
                </div>
              ))}
            </div>
          )}

          {/* "Wer kommt" wurde ans Seitenende verschoben (siehe AttendeesCard unten). */}
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            {!past ? (
              reg ? (
                <>
                  <div className="upper-label" style={{ marginBottom: 10, color: "var(--success)" }}>Bereits angemeldet</div>
                  <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
                    Du bist für dieses Event angemeldet. Bestätigung und Reminder-Mails kommen von Guestoo.
                  </div>
                  <a
                    href={guestooRegisterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                    style={{ width: "100%", padding: "12px", justifyContent: "center" }}
                  >
                    Anmeldung auf Guestoo ansehen <Icon name="arrow" size={14} />
                  </a>
                  <button
                    className="btn btn-text"
                    style={{ width: "100%", marginTop: 8, color: "var(--ink-4)" }}
                    onClick={() => setRegistered(ev.id, false)}
                  >
                    Markierung „angemeldet“ entfernen
                  </button>
                </>
              ) : (
                <>
                  <div className="upper-label" style={{ marginBottom: 10 }}>Registrieren</div>
                  {freeSlots != null && (
                    <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 10, fontWeight: 500 }}>
                      {freeSlots > 0 ? `Noch ${freeSlots} von ${maxSlots} Plätzen frei` : "Ausgebucht — Anmeldung über Warteliste"}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
                    Die Anmeldung läuft über Guestoo — dort bekommst du auch
                    Bestätigung und Reminder-Mails.
                  </div>
                  <button
                    onClick={onRegisterClick}
                    className="btn btn-accent"
                    style={{ width: "100%", padding: "12px", justifyContent: "center" }}
                  >
                    Jetzt anmelden <Icon name="arrow" size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-text"
                    style={{ width: "100%", marginTop: 8, color: "var(--ink-3)", fontSize: 12.5 }}
                    onClick={() => setRegistered(ev.id, true)}
                  >
                    Ich bin bereits angemeldet
                  </button>
                </>
              )
            ) : (
              <>
                <div className="upper-label" style={{ marginBottom: 10 }}>Vergangenes Event</div>
                <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
                  Dieses Event fand am {d.toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" })} statt.
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>Details</div>
            <DetailRow icon="calendar" label="Datum" value={d.toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
            <DetailRow icon="calendar" label="Zeit" value={ev.time} />
            <DetailRow icon="building" label="Venue" value={ev.venue} />
            <DetailRow icon="map" label="Adresse" value={ev.address} />
            <DetailRow icon="users" label="Gäste" value={`~${ev.guests} Teilnehmende`} />
          </div>

          {(ev.address || ev.venue) && (() => {
            // Google Maps Embed ohne API-Key: ?q=<query>&output=embed.
            // Wir kombinieren Venue + Adresse für möglichst präzise Geocodierung.
            const q = [ev.venue, ev.address].filter(Boolean).join(", ");
            const enc = encodeURIComponent(q);
            const embed = `https://www.google.com/maps?q=${enc}&output=embed`;
            const open = `https://www.google.com/maps/search/?api=1&query=${enc}`;
            return (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <iframe
                  title={`Karte: ${q}`}
                  src={embed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ width: "100%", aspectRatio: "4/3", border: "none", display: "block" }}
                />
                <a
                  href={open}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink-2)" }}
                >
                  <Icon name="map" size={14} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q}</span>
                  <span style={{ color: "var(--ink-3)" }}>In Google Maps öffnen ↗</span>
                </a>
              </div>
            );
          })()}
        </div>
      </div>

      {/* "Wer kommt" am Seitenende, standardmässig eingeklappt — die vollständige
          Anmeldeliste kommt aus Guestoo und ist noch nicht abschliessend stabil. */}
      <div className="card" style={{ padding: 24, marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10 }}>
          <div className="upper-label">{past ? "Das war dabei" : "Wer kommt"}</div>
          {attendingPreview.length > 0 && (
            <button
              type="button"
              onClick={() => setAttendeesOpen((v) => !v)}
              className="btn-text"
              style={{ padding: "4px 10px", fontSize: 12, color: "var(--ink-3)" }}
              aria-expanded={attendeesOpen}
            >
              {attendeesOpen ? "Ausblenden" : `Alle ${totalAttendees} anzeigen`}
            </button>
          )}
        </div>

        {attendingPreview.length === 0 ? (
          <>
            {confirmed != null && confirmed > 0 && !past && (
              <div style={{ display: "flex", marginBottom: 12 }} aria-hidden="true">
                {Array.from({ length: Math.min(confirmed, 7) }).map((_, i) => (
                  <span
                    key={i}
                    style={{ marginLeft: i === 0 ? 0 : -10, width: 40, height: 40, borderRadius: "50%", background: "var(--accent-soft)", border: "2px solid var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}
                  >
                    <Icon name="user" size={18} />
                  </span>
                ))}
                {confirmed > 7 && (
                  <span style={{ marginLeft: -10, width: 40, height: 40, borderRadius: "50%", background: "var(--bg-sunken)", border: "2px solid var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 500, color: "var(--ink-2)" }}>
                    +{confirmed - 7}
                  </span>
                )}
              </div>
            )}
            <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
            {confirmed != null ? (
              <>
                <strong style={{ color: "var(--ink)" }}>{confirmed}</strong> von {maxSlots} Plätzen belegt
                {freeSlots != null ? ` · ${freeSlots} frei` : ""}.{" "}
              </>
            ) : (
              <>{ev.guests} Plätze.{" "}</>
            )}
            {past ? (
              "Dieses Event ist vorbei."
            ) : (
              <>
                Anmeldung über Guestoo —{" "}
                <a href={guestooRegisterUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                  auf Guestoo ansehen ↗
                </a>
                .
              </>
            )}
            </div>
          </>
        ) : (
        <>
        <button
          type="button"
          onClick={() => setAttendeesOpen((v) => !v)}
          aria-label={attendeesOpen ? "Anmeldungen ausblenden" : "Anmeldungen anzeigen"}
          style={{
            display: "flex",
            marginBottom: 10,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          {attendingPreview.map((m, i) => (
            <span
              key={m.id}
              style={{ marginLeft: i === 0 ? 0 : -10, border: "2px solid var(--bg-elevated)", borderRadius: "50%", display: "inline-flex" }}
            >
              <Avatar first={m.first} last={m.last} color={m.color} size={40} url={m.avatarUrl} />
            </span>
          ))}
          {totalAttendees > attendingPreview.length && (
            <span
              style={{
                marginLeft: -10,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--bg-sunken)",
                border: "2px solid var(--bg-elevated)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11.5,
                fontWeight: 500,
                color: "var(--ink-2)",
              }}
            >
              +{totalAttendees - attendingPreview.length}
            </span>
          )}
        </button>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          {past
            ? `${totalAttendees} Mitglieder & Gäste waren dabei.`
            : `${maxSlots} Plätze · ${totalAttendees} angemeldet${freeSlots != null ? ` · ${freeSlots} frei` : ""}`}
        </div>
        {attendeesOpen && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <div className="upper-label" style={{ marginBottom: 10 }}>
              {past ? "Alle Teilnehmenden" : "Alle Anmeldungen"} · {attendeesFull.length}
            </div>
            <div style={{ maxHeight: 460, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 4, marginRight: -6, paddingRight: 6 }}>
              {attendeesFull.map((m) => m.memberSlug ? (
                <Link
                  key={m.id}
                  href={`/directory/${m.memberSlug}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 8px",
                    borderRadius: 8,
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Avatar first={m.first} last={m.last} color={m.color} size={34} url={m.avatarUrl} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.first} {m.last}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.role}{m.company ? ` · ${m.company}` : ""}
                    </div>
                  </div>
                  <Icon name="arrow" size={14} className="text-ink-3" />
                </Link>
              ) : (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 8px",
                    borderRadius: 8,
                  }}
                >
                  <Avatar first={m.first} last={m.last} color={m.color} size={34} url={m.avatarUrl} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.first} {m.last}
                    </div>
                    {m.company && (
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.company}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {totalAttendees > attendeesFull.length && (
              <div style={{ fontSize: 11.5, color: "var(--ink-4)", padding: "10px 8px 0" }}>
                +{totalAttendees - attendeesFull.length} weitere ohne Namensangabe.
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 12, padding: "10px 0", borderTop: "1px solid var(--line)", alignItems: "baseline" }}>
      <Icon name={icon} size={14} className="text-ink-3" />
      <div>
        <div className="upper-label" style={{ marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13.5 }}>{value}</div>
      </div>
    </div>
  );
}
