"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Skel } from "@/components/skeleton";
import { useMe } from "@/lib/hooks";
import {
  listProfileChangesAction,
  setProfileChangeReviewedAction,
  type AdminProfileChange,
} from "@/app/actions/profile-changes";

// Anzeige-Labels für die geloggten members-Spalten (siehe Trigger-Feldliste in
// migrations/20260612010000_profile_change_log.sql).
const FIELD_LABELS: Record<string, string> = {
  first: "Vorname",
  last: "Nachname",
  company: "Firma",
  role: "Rolle",
  branch: "Branche",
  sub: "Subbranche",
  branch2: "Zweitbranche",
  work: "Arbeitsort",
  home: "Wohnort",
  email: "E-Mail",
  mobile: "Mobile",
  web: "Webseite",
  linkedin: "LinkedIn",
  since: "Member seit",
  date_of_birth: "Geburtsdatum",
  additional_roles: "Zusätzliche Funktionen",
  sports: "Sportinteressen",
};

// ISO-Datumswerte (since, date_of_birth) lesbar machen; alles andere roh zeigen.
function displayValue(field: string, v: string | null): string {
  if (v == null || v === "") return "—";
  if (field === "since" || field === "date_of_birth") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  }
  return v;
}

export default function AdminProfileChangesPage() {
  const { data: me } = useMe();
  const [items, setItems] = useState<AdminProfileChange[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listProfileChangesAction().then((r) => {
      if (cancelled) return;
      if (r.error) setError(r.error);
      setItems(r.items);
    });
    return () => { cancelled = true; };
  }, []);

  // Geprüft-Status togglen — optimistisch, mit Rollback bei Fehler.
  const onToggleReviewed = (c: AdminProfileChange) => {
    const reviewed = !c.reviewedAt;
    const optimistic = reviewed ? new Date().toISOString() : null;
    setItems((prev) => prev?.map((x) => (x.id === c.id ? { ...x, reviewedAt: optimistic } : x)) ?? prev);
    setProfileChangeReviewedAction(c.id, reviewed).then((r) => {
      if (r.error) {
        // Fehler im bestehenden Banner oben zeigen statt als natives alert().
        setError(r.error);
        setItems((prev) => prev?.map((x) => (x.id === c.id ? { ...x, reviewedAt: c.reviewedAt } : x)) ?? prev);
      }
    });
  };

  if (!me) return null;
  if (!me.isAdmin) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="upper-label">Admin</div>
            <h1>Profil-Änderungen</h1>
            <div className="subtitle">Keine Berechtigung — diese Seite ist Admins vorbehalten.</div>
          </div>
        </div>
      </div>
    );
  }

  const openCount = items?.filter((c) => !c.reviewedAt).length ?? 0;
  const visible = items?.filter((c) => showReviewed || !c.reviewedAt) ?? null;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Admin</div>
          <h1>Profil-Änderungen</h1>
          <div className="subtitle">
            Von Members selbst geänderte Profilfelder — prüfen und relevante Mutationen manuell ins CRM (HubSpot) übernehmen.
          </div>
        </div>
        <div className="row">
          <button className="btn btn-ghost" onClick={() => setShowReviewed((v) => !v)}>
            {showReviewed ? "Nur offene zeigen" : "Auch geprüfte zeigen"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--accent-soft)", color: "var(--danger)", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      {items === null ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "16px 14px", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
              <Skel w={140} h={13} />
              <Skel w="40%" h={13} />
              <Skel w={90} h={12} style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      ) : visible !== null && visible.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--ink-3)" }}>
          {items.length === 0
            ? "Noch keine Profil-Änderungen protokolliert."
            : "Alle Änderungen sind geprüft. 🎉"}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Mobil: horizontales Scrollen statt gequetschter Spalten (gleiches
              Muster wie Tischwunsch-Admin). */}
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "var(--bg-sunken)", color: "var(--ink-3)", textAlign: "left" }}>
                <Th>Member</Th>
                <Th>Feld</Th>
                <Th>Alt</Th>
                <Th>Neu</Th>
                <Th>Geändert am</Th>
                <Th>Geprüft</Th>
              </tr>
            </thead>
            <tbody>
              {visible?.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--line)", opacity: c.reviewedAt ? 0.55 : 1 }}>
                  <Td>
                    <PersonCell person={c.member} />
                  </Td>
                  <Td>
                    <span className="chip">{FIELD_LABELS[c.field] ?? c.field}</span>
                  </Td>
                  <Td>
                    <ValueCell value={displayValue(c.field, c.oldValue)} muted />
                  </Td>
                  <Td>
                    <ValueCell value={displayValue(c.field, c.newValue)} />
                  </Td>
                  <Td>
                    <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                      {new Date(c.changedAt).toLocaleDateString("de-CH", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </Td>
                  <Td>
                    <ReviewedCell change={c} onToggle={() => onToggleReviewed(c)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: "var(--ink-4)" }}>
        {openCount} offene Änderung{openCount === 1 ? "" : "en"} · {items?.length ?? 0} insgesamt (max. 500 geladen).
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "10px 14px", fontWeight: 500, fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>{children}</td>;
}

function ValueCell({ value, muted }: { value: string; muted?: boolean }) {
  return (
    <span
      title={value}
      style={{
        display: "inline-block",
        maxWidth: 220,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        color: muted ? "var(--ink-3)" : "var(--ink)",
        textDecoration: muted && value !== "—" ? "line-through" : "none",
      }}
    >
      {value}
    </span>
  );
}

function ReviewedCell({ change, onToggle }: { change: AdminProfileChange; onToggle: () => void }) {
  const reviewed = Boolean(change.reviewedAt);
  return (
    <button
      type="button"
      onClick={onToggle}
      title={reviewed ? "Klicken, um die Prüfung zurückzunehmen." : "Als geprüft / im CRM übernommen markieren."}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
        background: reviewed ? "var(--success)" : "transparent",
        color: reviewed ? "#FFFFFF" : "var(--ink-3)",
        border: reviewed ? "none" : "1px solid var(--line-strong)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: reviewed ? "none" : "1.4px solid var(--ink-4)",
          background: reviewed ? "rgba(255,255,255,0.25)" : "transparent",
          fontSize: 10,
          lineHeight: 1,
        }}
      >
        {reviewed ? "✓" : ""}
      </span>
      {reviewed && change.reviewedAt
        ? `Geprüft am ${new Date(change.reviewedAt).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}`
        : "Als geprüft markieren"}
    </button>
  );
}

function PersonCell({ person }: { person: AdminProfileChange["member"] }) {
  const fullName = `${person.first} ${person.last}`.trim();
  const sub = [person.role, person.company].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {person.slug ? (
            <Link href={`/directory/${person.slug}`} style={{ color: "var(--ink)", textDecoration: "none" }}>
              {fullName}
              <Icon name="arrow" size={11} style={{ marginLeft: 4, opacity: 0.5 }} />
            </Link>
          ) : (
            fullName
          )}
        </div>
        {sub && (
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
