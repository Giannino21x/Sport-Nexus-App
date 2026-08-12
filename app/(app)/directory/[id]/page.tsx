"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { reload, useEvents, useMe, useMember } from "@/lib/hooks";
import { setMemberExtraAction, uploadMemberAvatarAction } from "@/app/actions/members";
import { normalizeAvatarFile } from "@/lib/image";
import { getMemberEventRegistrationsAction } from "@/app/actions/events";
import { Skel, SkelCircle, SkelLines } from "@/components/skeleton";
import {
  getMyTableWishesAction,
  toggleTableWishAction,
} from "@/app/actions/table-wishes";

// `since` kommt aus rowToMember bereits als "TT.MM.JJJJ" — new Date() darauf
// ergibt Invalid Date. Deshalb explizit parsen; unbekannte Formate (z.B. Demo-
// Freitext) unverändert anzeigen.
function formatSinceLong(s: string): string {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s.trim());
  if (!m) return s;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    .toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" });
}

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: m, isDemo, resolved } = useMember(id);
  const { data: me } = useMe();
  const { data: events } = useEvents();
  const isAdmin = Boolean(me?.isAdmin);

  // Echte Anmeldungen dieses Members (Self-Marks + Guestoo-Sync) für die Karte
  // „Angemeldete Events" — statt wie früher generisch die nächsten Events.
  const memberDbId = m?.dbId ?? null;
  const [regIds, setRegIds] = useState<string[] | null>(null);
  useEffect(() => {
    if (!memberDbId) return;
    let cancelled = false;
    getMemberEventRegistrationsAction(memberDbId).then((r) => {
      if (!cancelled) setRegIds(r.ids);
    });
    return () => { cancelled = true; };
  }, [memberDbId]);

  // Skeleton in den echten Layout-Massen, solange die erste Antwort aussteht —
  // "nicht gefunden" erst NACH aufgelösten Daten (kein Flash).
  if (!resolved && !m) {
    return (
      <div>
        <Link href="/directory" className="btn btn-text" style={{ marginBottom: 12, padding: "6px 10px", fontSize: 12.5, color: "var(--ink-3)", display: "inline-flex" }}>
          ← Zurück zur Memberübersicht
        </Link>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
          <Skel h={140} r={0} />
          <div style={{ padding: "18px 28px 24px", display: "flex", gap: 18, alignItems: "flex-end" }}>
            <SkelCircle size={96} style={{ marginTop: -48, border: "4px solid var(--bg-elevated)" }} />
            <div style={{ flex: 1, display: "grid", gap: 8, paddingBottom: 6 }}>
              <Skel w={220} h={26} />
              <Skel w={160} h={13} />
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 18 }} className="dash-grid">
          <div className="col" style={{ gap: 18 }}>
            <div className="card" style={{ padding: 24 }}>
              <Skel w={60} h={12} style={{ marginBottom: 16 }} />
              <SkelLines n={3} h={13} />
            </div>
            <div className="card" style={{ padding: 24 }}>
              <Skel w={110} h={12} style={{ marginBottom: 16 }} />
              <SkelLines n={5} h={13} />
            </div>
          </div>
          <div className="col" style={{ gap: 18 }}>
            <div className="card" style={{ padding: 20 }}>
              <Skel w={70} h={12} style={{ marginBottom: 14 }} />
              <SkelLines n={3} h={13} />
            </div>
            <div className="card" style={{ padding: 20 }}>
              <Skel w={140} h={12} style={{ marginBottom: 14 }} />
              <SkelLines n={2} h={13} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!m) {
    return (
      <div>
        <Link href="/directory" className="btn btn-text" style={{ marginBottom: 12, padding: "6px 10px", fontSize: 12.5, color: "var(--ink-3)", display: "inline-flex" }}>
          ← Zurück zur Memberübersicht
        </Link>
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
          <div className="serif" style={{ fontSize: 24 }}>Mitglied nicht gefunden</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Dieses Profil existiert nicht (mehr).</div>
        </div>
      </div>
    );
  }

  // Demo-Modus hat keine echten Anmeldungen → dort zeigen wir als fiktive
  // Vorschau die nächsten zwei Events; live nur tatsächliche Anmeldungen.
  const upcomingEvents = isDemo
    ? events.filter((e) => e.status === "upcoming").slice(0, 2)
    : events.filter((e) => e.status === "upcoming" && (regIds ?? []).includes(e.id));

  return (
    <div>
      <Link href="/directory" className="btn btn-text" style={{ marginBottom: 12, padding: "6px 10px", fontSize: 12.5, color: "var(--ink-3)", display: "inline-flex" }}>
        ← Zurück zur Memberübersicht
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
          <div style={{ marginTop: -74, flexShrink: 0, textAlign: "center" }}>
            <Avatar
              first={m.first}
              last={m.last}
              color={m.color}
              size={108}
              square
              url={m.avatarUrl}
            />
            {isAdmin && m.dbId && (
              <AdminAvatarUpload memberDbId={m.dbId} hasPhoto={Boolean(m.avatarUrl)} />
            )}
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
            {me && me.id !== m.id && (isDemo || m.dbId) && (
              <TableWishButton targetMemberDbId={m.dbId ?? m.id} />
            )}
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
            <InfoRow label="Zusatzfunktionen" value={m.additional} />
            <InfoRow label="Angebot" value={m.offer} />
            <InfoRow label="Branche" value={`${m.branch}${m.sub ? " · " + m.sub : ""}`} />
            <InfoRow label="Zweitbranche" value={m.branch2} />
            <InfoRow
              label="Webseite"
              value={
                m.web ? (
                  <a href={m.web.startsWith("http") ? m.web : `https://${m.web}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
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
            <InfoRow label="Member seit" value={m.since ? formatSinceLong(m.since) : null} />
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="upper-label" style={{ marginBottom: 10 }}>Kontakt</div>
            {/* Privacy-Toggles respektieren: Wer "sichtbar" deaktiviert hat,
                dessen Kontaktdaten erscheinen hier NICHT (showX !== false,
                weil ältere Rows das Feld evtl. nicht gesetzt haben = Default true). */}
            {m.email && m.showEmail !== false && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
                <Icon name="mail" size={14} className="text-ink-3" />
                <a href={`mailto:${m.email}`} style={{ color: "var(--accent)", textDecoration: "underline" }}>
                  {m.email}
                </a>
              </div>
            )}
            {m.mobile && m.showMobile !== false && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
                <Icon name="phone" size={14} className="text-ink-3" />
                <a href={`tel:${m.mobile.replace(/\s+/g, "")}`} style={{ color: "var(--accent)", textDecoration: "underline" }}>
                  {m.mobile}
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
            <div className="upper-label" style={{ marginBottom: 12 }}>Angemeldete Events</div>
            {!isDemo && upcomingEvents.length === 0 && (
              regIds === null ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Skel w={36} h={30} r={6} />
                    <div style={{ flex: 1, display: "grid", gap: 6 }}>
                      <Skel w="70%" h={12} />
                      <Skel w="45%" h={10} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
                  Aktuell für kein kommendes Event angemeldet.
                </div>
              )
            )}
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

function TableWishButton({ targetMemberDbId }: { targetMemberDbId: string }) {
  const { dataSource } = useSettings();
  const [wished, setWished] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (dataSource !== "live") {
      // Demo: state nur lokal halten, kein Server-Roundtrip.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- bewusster Reset auf Demo
      setWished(false);
      return;
    }
    let cancelled = false;
    getMyTableWishesAction().then((r) => {
      if (cancelled) return;
      setWished(r.items.some((w) => w.targetId === targetMemberDbId));
    });
    return () => { cancelled = true; };
  }, [dataSource, targetMemberDbId]);

  const onToggle = () => {
    if (dataSource !== "live") {
      setWished((v) => !v);
      return;
    }
    startTransition(async () => {
      const r = await toggleTableWishAction(targetMemberDbId);
      if (r.error) {
        alert(r.error);
        return;
      }
      setWished(Boolean(r.wished));
    });
  };

  // Sofort rendern statt auf getMyTableWishesAction zu warten — der Button
  // ploppte sonst verzögert in die Seite (Pascal-Feedback 2026-07-22). Bis der
  // Status da ist, neutral anzeigen und Klicks sperren.
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        disabled={pending || wished === null}
        className={wished ? "btn btn-primary" : "btn btn-ghost"}
        title={
          wished
            ? "Du hast diese Person als Tischwunsch für das nächste Event markiert."
            : "An einem kommenden Event am gleichen Tisch – SportNexus versucht dies bei der Tischzuweisung zu berücksichtigen."
        }
      >
        <Icon name={wished ? "check" : "users"} size={14} />
        {wished ? "Tischwunsch gemeldet" : "Tischwunsch melden"}
      </button>
      {/* Bestätigung unterhalb der Button-Zeile (Pascal-Feedback 2026-08-12):
          flexBasis 100% bricht in der wrap-Row auf eine eigene Zeile um. */}
      {wished && (
        <div style={{ flexBasis: "100%", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-2)" }}>
          Tischwunsch gespeichert: SportNexus versucht, euch beim nächsten Event am gleichen
          Tisch zu platzieren. Das sehen nur du und die Organisatoren — die Person selbst wird
          nicht benachrichtigt.
        </div>
      )}
    </>
  );
}

// Admin lädt ein Profilbild für dieses Mitglied hoch (Pascal Feedback 6) —
// nützlich für Member, die noch keins gepflegt haben. Sie können es später
// selbst ersetzen.
function AdminAvatarUpload({ memberDbId, hasPhoto }: { memberDbId: string; hasPhoto: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      setErr("Nur JPG, PNG oder WebP.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErr("Datei zu gross (max. 25 MB).");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      // Riesige Originale vor dem Upload auf max. 1600px verkleinern.
      fd.append("file", await normalizeAvatarFile(file));
      const r = await uploadMemberAvatarAction(memberDbId, fd);
      if (r.error) {
        setErr(r.error);
        return;
      }
      reload("members");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFile}
        style={{ display: "none" }}
      />
      <button
        className="btn-text"
        onClick={() => { setErr(null); fileRef.current?.click(); }}
        disabled={busy}
        style={{ fontSize: 11.5, color: "var(--ink-4)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
        title="Als Admin ein Profilbild für dieses Mitglied hochladen"
      >
        <Icon name="image" size={12} />
        {busy ? "Lädt..." : hasPhoto ? "Foto ersetzen (Admin)" : "Foto hochladen (Admin)"}
      </button>
      {err && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>{err}</div>}
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
          style={{ flex: "1 1 240px", minWidth: 0 }}
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
