"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Icon, type IconName } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { useEvent, useMembers } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";
import { registerEventAction } from "@/app/actions/events";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: ev, loading } = useEvent(id);
  const { data: members } = useMembers();
  const { dataSource } = useSettings();

  const [registered, setRegistered] = useState<boolean | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (dataSource !== "live" || !id) return;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
      if (!me) return;
      const { data: reg } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("event_id", id)
        .eq("member_id", me.id)
        .maybeSingle();
      setRegistered(Boolean(reg));
    })();
  }, [dataSource, id]);

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
  const attendingCount = Math.min(8, Math.max(4, Math.floor(ev.guests / 10)));
  const attending = members.slice(0, attendingCount);

  const onRegister = () => {
    setRegisterError(null);
    if (dataSource !== "live") {
      setRegistered(true);
      return;
    }
    startTransition(async () => {
      const r = await registerEventAction(ev.id);
      if (r.error) setRegisterError(r.error);
      else setRegistered(r.registered ?? false);
    });
  };

  const onAddToCalendar = () => {
    const ics = buildIcs(ev);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.id}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        <div style={{ position: "relative", aspectRatio: "21/9", background: "var(--ink)", overflow: "hidden" }}>
          {ev.img && (
            <img
              src={ev.img}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: past ? "grayscale(0.15) brightness(0.75)" : "brightness(0.68)" }}
            />
          )}
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, padding: "32px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#fff" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {ev.featured && <span className="chip" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderColor: "transparent" }}>Featured</span>}
              <span className="chip" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", borderColor: "transparent", backdropFilter: "blur(6px)" }}>{ev.city}</span>
              {past && <span className="chip" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "transparent" }}>Vergangenes Event</span>}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                <div className="upper-label" style={{ color: "rgba(255,255,255,0.7)" }}>{ev.title}</div>
                <div
                  className="serif"
                  style={{
                    fontSize: "clamp(28px, 5vw, 52px)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.015em",
                    marginTop: 8,
                    maxWidth: 720,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {ev.subtitle}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="serif" style={{ fontSize: 64, lineHeight: 1.1 }}>{d.getDate()}</div>
                <div className="mono" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 4, color: "rgba(255,255,255,0.8)" }}>
                  {d.toLocaleDateString("de-CH", { month: "long", year: "numeric" })}
                </div>
              </div>
            </div>
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

          <div className="card" style={{ padding: 24 }}>
            <div className="upper-label" style={{ marginBottom: 14 }}>{past ? "Das war dabei" : "Wer kommt"}</div>
            <div style={{ display: "flex", marginBottom: 10 }}>
              {attending.map((m, i) => (
                <Link
                  key={m.id}
                  href={`/directory/${m.id}`}
                  style={{ marginLeft: i === 0 ? 0 : -10, cursor: "pointer", border: "2px solid var(--bg-elevated)", borderRadius: "50%", display: "inline-flex" }}
                >
                  <Avatar first={m.first} last={m.last} color={m.color} size={40} url={m.avatarUrl} />
                </Link>
              ))}
              <div
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
                +{Math.max(0, ev.guests - attending.length)}
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
              {past
                ? `${ev.guests} Mitglieder & Gäste waren dabei.`
                : `${ev.guests} Plätze · bisher ${attending.length + Math.floor(ev.guests * 0.4)} Anmeldungen`}
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            {!past ? (
              <>
                <div className="upper-label" style={{ marginBottom: 10 }}>
                  {registered ? "Du bist registriert" : "Registrieren"}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
                  {registered
                    ? `Platz reserviert · ${ev.time} im ${ev.venue}.`
                    : "Sichere dir deinen Platz mit einem Klick."}
                </div>
                {registerError && (
                  <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8 }}>{registerError}</div>
                )}
                <button
                  className={registered ? "btn btn-ghost" : "btn btn-accent"}
                  style={{ width: "100%", padding: "12px" }}
                  onClick={onRegister}
                  disabled={pending}
                >
                  {pending ? "..." : registered ? "Abmelden" : "Jetzt registrieren"} <Icon name="arrow" size={14} />
                </button>
                <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={onAddToCalendar}>
                  <Icon name="calendar" size={14} /> Zum Kalender hinzufügen
                </button>
              </>
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

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ aspectRatio: "4/3", background: "repeating-linear-gradient(45deg, var(--bg-sunken) 0 10px, var(--bg) 10px 11px)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "var(--ink-3)", gap: 6 }}>
              <Icon name="map" size={22} />
              <div className="mono" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em" }}>Map placeholder</div>
              <div style={{ fontSize: 11, textAlign: "center", padding: "0 20px" }}>{ev.address}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildIcs(ev: { id: string; title: string; subtitle: string; date: string; time: string; venue: string; address: string; desc: string }): string {
  // Parse "HH:MM – HH:MM" (allow en-dash or hyphen) from ev.time; fall back to a 2h block at 12:00.
  const m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(ev.time);
  const startH = m ? parseInt(m[1], 10) : 12;
  const startM = m ? parseInt(m[2], 10) : 0;
  const endH = m ? parseInt(m[3], 10) : startH + 2;
  const endM = m ? parseInt(m[4], 10) : startM;

  // ev.date is YYYY-MM-DD → build local datetimes
  const [yr, mo, dy] = ev.date.split("-").map((n) => parseInt(n, 10));
  const pad = (n: number) => n.toString().padStart(2, "0");
  const fmt = (y: number, mo: number, d: number, h: number, mi: number) =>
    `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`;
  const dtStart = fmt(yr, mo, dy, startH, startM);
  const dtEnd = fmt(yr, mo, dy, endH, endM);
  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => "\\" + c);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SportNexus//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${ev.id}@sportnexus`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escape(ev.title + (ev.subtitle ? " — " + ev.subtitle : ""))}`,
    `LOCATION:${escape(ev.venue + (ev.address ? ", " + ev.address : ""))}`,
    `DESCRIPTION:${escape(ev.desc)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
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
