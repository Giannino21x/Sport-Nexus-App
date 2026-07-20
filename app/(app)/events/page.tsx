"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { type SnEvent } from "@/lib/data";
import { reload, useEvents, useMe } from "@/lib/hooks";
import { useMyRegistrations } from "@/lib/registrations";
import { createEventAction, deleteEventAction, type EventInput } from "@/app/actions/events";
import { getEventAttendeeCountsAction } from "@/app/actions/guestoo";

export default function EventsPage() {
  const { data: events } = useEvents();
  const { data: me } = useMe();
  const { isRegistered } = useMyRegistrations();
  const isAdmin = Boolean(me?.isAdmin);
  const upcoming = events.filter((e) => e.status === "upcoming");
  // Past-Events: jüngstes zuoberst, ältestes zuunterst (Pascal-Feedback).
  // Die Quelle ist nach Datum aufsteigend sortiert, hier kehren wir die
  // Reihenfolge für die vergangenen Events explizit um.
  const past = events
    .filter((e) => e.status === "past")
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Verlässliche Anmeldezahlen pro kommendem Event über die öffentliche Guestoo-
  // API (kein Login, läuft nicht ab).
  const upcomingGuestooIds = useMemo(
    () => upcoming.map((e) => e.guestooId).filter((id): id is string => Boolean(id)),
    [upcoming],
  );
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const countsKey = upcomingGuestooIds.join(",");
  useEffect(() => {
    if (upcomingGuestooIds.length === 0) return;
    let cancelled = false;
    getEventAttendeeCountsAction(upcomingGuestooIds).then((r) => {
      if (!cancelled) setCounts(r.counts);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stabilisiert über countsKey
  }, [countsKey]);

  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Events</div>
          <h1>
            {upcoming.length} <em style={{ color: "var(--accent)", fontStyle: "italic", fontSize: "0.9em" }}>kommende Events</em>
          </h1>
          <div className="subtitle">Hier findest Du alle SportNexus-Events.</div>
        </div>
        {isAdmin && (
          <div className="row">
            <button className="btn btn-ghost" onClick={() => setComposerOpen((v) => !v)}>
              <Icon name="plus" size={14} /> {composerOpen ? "Schließen" : "Neues Event"}
            </button>
          </div>
        )}
      </div>

      {isAdmin && composerOpen && (
        <EventComposer onDone={() => { setComposerOpen(false); reload("events"); }} onCancel={() => setComposerOpen(false)} />
      )}

      {/* Kein "Upcoming"-Label mehr — die Zahl steht bereits im Seitentitel
          (Pascal). Die vergangenen Events bekommen dafür einen deutlich
          abgesetzten, fetten Titel in Schwarz. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 16, marginBottom: 40 }}>
        {upcoming.map((ev) => <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} registered={isRegistered(ev.id)} count={ev.guestooId ? counts[ev.guestooId] : undefined} />)}
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 28, marginBottom: 16 }}>
        <div style={{ fontSize: 21, fontWeight: 700, color: "var(--ink)" }}>
          {past.length} vergangene Events
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 16 }}>
        {past.map((ev) => <EventCard key={ev.id} ev={ev} past isAdmin={isAdmin} />)}
      </div>
    </div>
  );
}

function EventComposer({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<EventInput>({
    title: "",
    subtitle: "",
    date: "",
    time: "",
    city: "",
    venue: "",
    address: "",
    guests: 0,
    featured: false,
    description: "",
    long_description: "",
    image_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async () => {
    setErr(null);
    if (!form.title.trim()) { setErr("Titel ist erforderlich."); return; }
    if (!form.date) { setErr("Datum ist erforderlich."); return; }
    setSaving(true);
    try {
      const r = await createEventAction(form);
      if (r.error) { setErr(r.error); return; }
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 24 }}>
      <div className="upper-label" style={{ marginBottom: 12 }}>Neues Event</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Titel *</label>
          <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="z.B. SportNexus Lunch Zürich" autoFocus />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Untertitel</label>
          <input className="input" value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="z.B. mit Andy Schmid" />
        </div>
        <div className="field">
          <label className="field-label">Datum *</label>
          <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Uhrzeit</label>
          <input className="input" value={form.time ?? ""} onChange={(e) => set("time", e.target.value)} placeholder="z.B. 12:00" />
        </div>
        <div className="field">
          <label className="field-label">Stadt</label>
          <input className="input" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Zürich" />
        </div>
        <div className="field">
          <label className="field-label">Venue</label>
          <input className="input" value={form.venue ?? ""} onChange={(e) => set("venue", e.target.value)} placeholder="Widder Hotel" />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Adresse</label>
          <input className="input" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Rennweg 7, 8001 Zürich" />
        </div>
        <div className="field">
          <label className="field-label">Gäste (ca.)</label>
          <input className="input" type="number" value={form.guests ?? 0} onChange={(e) => set("guests", parseInt(e.target.value || "0", 10))} min={0} />
        </div>
        <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={form.featured ?? false} onChange={(e) => set("featured", e.target.checked)} />
            Featured Event
          </label>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Bild-URL <span style={{ color: "var(--ink-4)" }}>· optional</span></label>
          <input className="input" value={form.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} placeholder="https://..." />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Kurzbeschreibung</label>
          <input className="input" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Ein Satz für die Card-Ansicht" />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Langbeschreibung <span style={{ color: "var(--ink-4)" }}>· für die Detail-Seite</span></label>
          <textarea className="textarea" value={form.long_description ?? ""} onChange={(e) => set("long_description", e.target.value)} style={{ minHeight: 90 }} />
        </div>
      </div>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>Abbrechen</button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
          {saving ? "Erstellen..." : "Event erstellen"}
        </button>
      </div>
    </div>
  );
}

function EventCard({ ev, past, isAdmin, registered, count }: { ev: SnEvent; past?: boolean; isAdmin?: boolean; registered?: boolean; count?: number | null }) {
  const d = new Date(ev.date);
  // Breite Bilder (~16:9) füllen den Rahmen komplett (cover) — keine grauen
  // Ränder. Nur bei quadratischen Guestoo-Motiven bleibt contain + Blur-Füllung.
  const [coverFit, setCoverFit] = useState(false);
  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalHeight > 0 && img.naturalWidth / img.naturalHeight >= 1.45) setCoverFit(true);
  };

  const onDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Event "${ev.subtitle || ev.title}" wirklich löschen?`)) return;
    const r = await deleteEventAction(ev.id);
    if (r.error) { alert(r.error); return; }
    reload("events");
  };

  return (
    <Link href={`/events/${ev.id}`} className="card event-card" style={{ padding: 0, overflow: "hidden", opacity: past ? 0.78 : 1, cursor: "pointer", display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <div style={{ aspectRatio: "16/9", background: past ? "var(--ink-3)" : "var(--ink)", position: "relative", color: "var(--bg)", overflow: "hidden", flexShrink: 0 }}>
        {ev.img && (
          <>
            {/* Unscharfer Füll-Hintergrund, damit nicht-16:9-Bilder den Rahmen sauber
                füllen, ohne das Motiv zu beschneiden. */}
            <img
              aria-hidden="true"
              src={ev.img}
              alt=""
              loading="lazy"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(20px) brightness(0.5)", transform: "scale(1.2)" }}
            />
            {/* Vollständiges Bild, mittig; breite Motive als cover (füllt Rahmen). */}
            <img
              src={ev.img}
              alt=""
              loading="lazy"
              onLoad={onImgLoad}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: coverFit ? "cover" : "contain", objectPosition: "center", filter: past ? "grayscale(0.3) brightness(0.92)" : "none" }}
            />
          </>
        )}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.78) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {ev.featured && (
              <span className="chip" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderColor: "transparent" }}>Featured</span>
            )}
            <span className="chip" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", borderColor: "transparent", backdropFilter: "blur(6px)" }}>
              {ev.city}
            </span>
            {past && (
              <span className="chip" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "transparent", marginLeft: "auto" }}>
                Past
              </span>
            )}
          </div>
          <div>
            <div className="serif" style={{ fontSize: 44, lineHeight: 1, color: "#fff" }}>{d.getDate()}</div>
            <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 4, color: "rgba(255,255,255,0.8)" }}>
              {d.toLocaleDateString("de-CH", { month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            title="Event löschen (Admin)"
            aria-label="Event löschen"
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
            }}
          >
            ×
          </button>
        )}
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{ev.title}</div>
        <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, marginTop: 3 }}>{ev.subtitle}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5 }}>{ev.desc}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11.5, color: "var(--ink-4)" }}>
          <span>{ev.time}</span><span>{ev.venue}</span><span>{count != null ? `${count} angemeldet` : `~${ev.guests} Gäste`}</span>
        </div>
        {!past && (
          <div style={{ marginTop: 12 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                padding: "3px 9px",
                borderRadius: 999,
                background: registered ? "var(--success)" : "var(--bg-sunken)",
                color: registered ? "#FFFFFF" : "var(--ink-3)",
                border: registered ? "none" : "1px solid var(--line)",
              }}
            >
              {registered ? "✓ Angemeldet" : "Nicht angemeldet"}
            </span>
          </div>
        )}
        <div style={{ flex: 1, minHeight: 14 }} aria-hidden="true" />
        {!past && <span className="btn btn-primary" style={{ width: "100%" }}>Details & Registrieren →</span>}
      </div>
    </Link>
  );
}
