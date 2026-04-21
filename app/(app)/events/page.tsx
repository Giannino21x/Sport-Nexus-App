"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { type SnEvent } from "@/lib/data";
import { useEvents } from "@/lib/hooks";

export default function EventsPage() {
  const [viewMode, setViewMode] = useState<"native" | "iframe">("native");
  const { data: events } = useEvents();
  const upcoming = events.filter((e) => e.status === "upcoming");
  const past = events.filter((e) => e.status === "past");

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Events</div>
          <h1>Kommende Treffen</h1>
          <div className="subtitle">Lunches, Dinners und exklusive Formate für Members.</div>
        </div>
        <div className="row">
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
            {upcoming.map((ev) => <EventCard key={ev.id} ev={ev} />)}
          </div>
          <div className="upper-label" style={{ marginBottom: 12 }}>Past · {past.length}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 16 }}>
            {past.map((ev) => <EventCard key={ev.id} ev={ev} past />)}
          </div>
        </>
      )}
    </div>
  );
}

function EventCard({ ev, past }: { ev: SnEvent; past?: boolean }) {
  const d = new Date(ev.date);
  return (
    <Link href={`/events/${ev.id}`} className="card" style={{ padding: 0, overflow: "hidden", opacity: past ? 0.78 : 1, cursor: "pointer", display: "block" }}>
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
