"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { useMe } from "@/lib/hooks";
import { listAllTableWishesAction, type AdminTableWish } from "@/app/actions/table-wishes";

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
        <div style={{ padding: 24, color: "var(--ink-3)" }}>Lade...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--ink-3)" }}>
          Noch keine Tischwünsche gemeldet.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "var(--bg-sunken)", color: "var(--ink-3)", textAlign: "left" }}>
                <Th>Wer möchte</Th>
                <Th>möchte kennenlernen</Th>
                <Th>Gemeldet am</Th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  return <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>{children}</td>;
}

function PersonCell({ person }: { person: AdminTableWish["requester"] }) {
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
