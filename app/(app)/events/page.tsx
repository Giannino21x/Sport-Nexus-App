"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { type SnEvent } from "@/lib/data";
import { reload, useEvents, useMe } from "@/lib/hooks";
import { createEventAction, deleteEventAction, type EventInput } from "@/app/actions/events";

export default function EventsPage() {
  const [viewMode, setViewMode] = useState<"native" | "iframe">("native");
  const { data: events } = useEvents();
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const upcoming = events.filter((e) => e.status === "upcoming");
  const past = events.filter((e) => e.status === "past");

  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Events</div>
          <h1>Kommende Treffen</h1>
          <div className="subtitle">Lunches, Dinners und exklusive Formate für Members.</div>
        </div>
        <div className="row">
          {isAdmin && (
            <button className="btn btn-accent" onClick={() => setComposerOpen((v) => !v)}>
              <Icon name="plus" size={14} /> {composerOpen ? "Schließen" : "Neues Event"}
            </button>
          )}
          <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 2, background: "var(--bg-elevated)" }}>
            <button
              onClick={() => setViewMode("native")}
              className="btn-text"
              style={{ padding: "6px 12px", fontSize: 12.5, background: viewMode === "native" ? "var(--bg-sunken)" : "transparent", borderRadius: 7 }}
            >
              Native
            </button>
            <button
              onClick={() => setViewMode("iframe")}
              className="btn-text"
              style={{ padding: "6px 12px", fontSize: 12.5, background: viewMode === "iframe" ? "var(--bg-sunken)" : "transparent", borderRadius: 7 }}
            >
              Guestoo iFrame
            </button>
          </div>
        </div>
      </div>

      {isAdmin && composerOpen && (
        <EventComposer onDone={() => { setComposerOpen(false); reload("events"); }} onCancel={() => setComposerOpen(false)} />
      )}

      {viewMode === "iframe" ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--ink-3)" }}>
            <Icon name="link" size={13} />
            <span className="mono">events.guestoo.de/sportnexus</span>
            <span style={{ marginLeft: "auto" }} className="chip">iframe integration</span>
          </div>
          <div style={{ padding: 40, background: "repeating-linear-gradient(45deg, var(--bg) 0 10px, var(--bg-sunken) 10px 11px)", minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--ink-3)" }}>
            <Icon name="calendar" size={28} />
            <div className="serif" style={{ fontSize: 22, color: "var(--ink)", marginTop: 10 }}>Guestoo Event-Kalender</div>
            <div style={{ fontSize: 13, maxWidth: 440, marginTop: 8 }}>
              Hier wird der Guestoo iFrame integriert. Registrierungen laufen direkt über Guestoo — Mitglieder sehen alle Termine und melden sich mit einem Klick an.
            </div>
            <code style={{ marginTop: 16, padding: "8px 12px", background: "var(--bg-elevated)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)" }}>
              &lt;iframe src=&quot;https://events.guestoo.de/sportnexus&quot; /&gt;
            </code>
          </div>
        </div>
      ) : (
        <>
          <div className="upper-label" style={{ marginBottom: 12 }}>Upcoming · {upcoming.length}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 16, marginBottom: 40 }}>
            {upcoming.map((ev) => <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} />)}
          </div>
          <div className="upper-label" style={{ marginBottom: 12 }}>Past · {past.length}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 16 }}>
            {past.map((ev) => <EventCard key={ev.id} ev={ev} past isAdmin={isAdmin} />)}
          </div>
        </>
      )}
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

function EventCard({ ev, past, isAdmin }: { ev: SnEvent; past?: boolean; isAdmin?: boolean }) {
  const d = new Date(ev.date);

  const onDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Event "${ev.subtitle || ev.title}" wirklich löschen?`)) return;
    const r = await deleteEventAction(ev.id);
    if (r.error) { alert(r.error); return; }
    reload("events");
  };

  return (
    <Link href={`/events/${ev.id}`} className="card" style={{ padding: 0, overflow: "hidden", opacity: past ? 0.78 : 1, cursor: "pointer", display: "block", position: "relative" }}>
      <div style={{ aspectRatio: "16/9", background: past ? "var(--ink-3)" : "var(--ink)", position: "relative", color: "var(--bg)", overflow: "hidden" }}>
        {ev.img && (
          <img
            src={ev.img}
            alt=""
            loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: past ? "grayscale(0.3) brightness(0.8)" : "brightness(0.72)" }}
          />
        )}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)" }} />
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
      <div style={{ padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{ev.title}</div>
        <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, marginTop: 3 }}>{ev.subtitle}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5 }}>{ev.desc}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11.5, color: "var(--ink-4)" }}>
          <span>{ev.time}</span><span>{ev.venue}</span><span>~{ev.guests} Gäste</span>
        </div>
        {!past && <span className="btn btn-primary" style={{ width: "100%", marginTop: 14 }}>Details & Registrieren →</span>}
      </div>
    </Link>
  );
}
