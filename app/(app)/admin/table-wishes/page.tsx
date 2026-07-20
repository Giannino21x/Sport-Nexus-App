"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Skel } from "@/components/skeleton";
import { useMe } from "@/lib/hooks";
import {
  listAllTableWishesAction,
  setTableWishConsideredAction,
  type AdminTableWish,
} from "@/app/actions/table-wishes";

export default function AdminTableWishesPage() {
  const { data: me } = useMe();
  const [items, setItems] = useState<AdminTableWish[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAllTableWishesAction().then((r) => {
      if (cancelled) return;
      if (r.error) setError(r.error);
      setItems(r.items);
    });
    return () => { cancelled = true; };
  }, []);

  // Berücksichtigt-Status togglen — optimistisch, mit Rollback bei Fehler.
  const onToggleConsidered = (w: AdminTableWish) => {
    const considered = !w.consideredAt;
    const optimistic = considered ? new Date().toISOString() : null;
    setItems((prev) => prev?.map((x) => (x.id === w.id ? { ...x, consideredAt: optimistic } : x)) ?? prev);
    setTableWishConsideredAction(w.id, considered).then((r) => {
      if (r.error) {
        alert(r.error);
        setItems((prev) => prev?.map((x) => (x.id === w.id ? { ...x, consideredAt: w.consideredAt } : x)) ?? prev);
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
            <h1>Tischwünsche</h1>
            <div className="subtitle">Keine Berechtigung — diese Seite ist Admins vorbehalten.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Admin</div>
          <h1>Tischwünsche</h1>
          <div className="subtitle">
            Members, die jemanden am nächsten Event treffen möchten — Grundlage für die manuelle Tischzuweisung.
          </div>
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
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", gap: 14, padding: "16px 14px", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
              <Skel w="70%" h={13} />
              <Skel w="70%" h={13} />
              <Skel w={80} h={13} />
              <Skel w={140} h={24} r={999} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--ink-3)" }}>
          Noch keine Tischwünsche gemeldet.
        </div>
      ) : (
        <>
          {/* Desktop: Tabelle. Mobil: gestapelte Karten, damit ALLE Felder
              sichtbar sind (kein horizontales Wischen / verstecktes Scrollen
              nötig). Umschaltung rein per CSS-Media-Query — kein JS, daher
              kein Hydration-Mismatch. */}
          <div className="tw-desktop card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: "var(--bg-sunken)", color: "var(--ink-3)", textAlign: "left" }}>
                  <Th>Wer möchte</Th>
                  <Th>möchte kennenlernen</Th>
                  <Th>Gemeldet am</Th>
                  <Th>Berücksichtigt</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((w) => (
                  <tr key={w.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <Td>
                      <PersonCell person={w.requester} />
                    </Td>
                    <Td>
                      <PersonCell person={w.target} />
                    </Td>
                    <Td>
                      <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                        {new Date(w.createdAt).toLocaleDateString("de-CH", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </Td>
                    <Td>
                      <ConsideredCell wish={w} onToggle={() => onToggleConsidered(w)} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kein Inline-display hier: Inline-Styles schlagen die CSS-Klasse
              `.tw-mobile { display:none }` — die Karten erschienen deshalb
              auch am Desktop (doppelte Einträge). Grid/Gap kommen aus dem
              Style-Block unten. */}
          <div className="tw-mobile">
            {items.map((w) => (
              <div key={w.id} className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
                <Field label="Wer möchte">
                  <PersonCell person={w.requester} />
                </Field>
                <Field label="möchte kennenlernen">
                  <PersonCell person={w.target} />
                </Field>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    borderTop: "1px solid var(--line)",
                    paddingTop: 10,
                  }}
                >
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    Gemeldet am{" "}
                    {new Date(w.createdAt).toLocaleDateString("de-CH", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <ConsideredCell wish={w} onToggle={() => onToggleConsidered(w)} />
                </div>
              </div>
            ))}
          </div>

          <style>{`
            .tw-mobile { display: none; }
            @media (max-width: 640px) {
              .tw-desktop { display: none; }
              .tw-mobile { display: grid; gap: 10px; }
            }
          `}</style>
        </>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: "var(--ink-4)" }}>
        {items?.length ?? 0} Tischwunsch{(items?.length ?? 0) === 1 ? "" : "e"} insgesamt.
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
  return <td style={{ padding: "14px 14px", verticalAlign: "middle" }}>{children}</td>;
}

// Beschriftetes Feld für die Mobile-Karten-Ansicht.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function ConsideredCell({ wish, onToggle }: { wish: AdminTableWish; onToggle: () => void }) {
  const considered = Boolean(wish.consideredAt);
  return (
    <button
      type="button"
      onClick={onToggle}
      title={considered ? "Klicken, um die Berücksichtigung zurückzunehmen." : "Als bei der Tischzuweisung berücksichtigt markieren."}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        background: considered ? "var(--success)" : "transparent",
        color: considered ? "#FFFFFF" : "var(--ink-3)",
        border: considered ? "none" : "1px solid var(--line-strong)",
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
          border: considered ? "none" : "1.4px solid var(--ink-4)",
          background: considered ? "rgba(255,255,255,0.25)" : "transparent",
          fontSize: 10,
          lineHeight: 1,
        }}
      >
        {considered ? "✓" : ""}
      </span>
      {considered && wish.consideredAt
        ? `Berücksichtigt am ${new Date(wish.consideredAt).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}`
        : "Als berücksichtigt markieren"}
    </button>
  );
}

function PersonCell({ person }: { person: AdminTableWish["requester"] }) {
  const fullName = `${person.first} ${person.last}`.trim();
  const sub = [person.role, person.company].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {person.slug ? (
            // inline-flex hält den Pfeil auf derselben Zeile wie den Namen —
            // vorher brach das Icon als Block auf eine eigene, gequetschte Zeile um.
            <Link href={`/directory/${person.slug}`} style={{ color: "var(--ink)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              {fullName}
              <Icon name="arrow" size={11} style={{ opacity: 0.5 }} />
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
