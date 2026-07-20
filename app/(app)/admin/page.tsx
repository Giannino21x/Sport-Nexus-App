"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { getAdminOverviewAction, type AdminOverview } from "@/app/actions/admin";

export default function AdminDashboardPage() {
  const { dataSource } = useSettings();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dataSource !== "live") {
      // Demo-Modus: keine Server-Calls — data bleibt null, die StatCards
      // zeigen dann "—" statt scheinbar echter Nullen.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- bewusster Demo-Reset
      setData(null);
      return;
    }
    let cancelled = false;
    getAdminOverviewAction().then((r) => {
      if (cancelled) return;
      if (r.error) setError(r.error);
      setData(r.data ?? null);
    });
    return () => { cancelled = true; };
  }, [dataSource]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Admin</div>
          <h1>Übersicht</h1>
          <div className="subtitle">
            Schnellzugriff auf die Verwaltungsbereiche und aktuelle Aktivität.
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--accent-soft)", color: "var(--danger)", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      {dataSource !== "live" && (
        <div style={{ padding: "10px 14px", background: "var(--bg-sunken)", color: "var(--ink-3)", borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          Demo-Modus — Live-Daten erscheinen nach Login.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard label="Members" value={data?.memberCount ?? "—"} sub={data?.adminCount != null ? `${data.adminCount} Admins` : ""} />
        <StatCard label="Upcoming Events" value={data?.upcomingEventCount ?? "—"} />
        <StatCard label="Tischwünsche" value={data?.tableWishCount ?? "—"} />
        <StatCard label="Offene Profil-Änderungen" value={data?.openProfileChangeCount ?? "—"} />
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <div className="upper-label" style={{ marginBottom: 14 }}>Schnellzugriff</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <QuickLink
            href="/admin/table-wishes"
            icon="trophy"
            label="Tischwünsche verwalten"
            sub="Wer möchte wen kennenlernen — Grundlage für Tischzuweisung"
          />
          <QuickLink
            href="/admin/profile-changes"
            icon="users"
            label="Profil-Änderungen prüfen"
            sub="Von Members geänderte Felder — relevante Mutationen manuell ins CRM übernehmen"
          />
          <QuickLink
            href="/directory"
            icon="users"
            label="Member-Directory"
            sub="Alle Members durchsuchen und ggf. Badges setzen"
          />
          <QuickLink
            href="/events"
            icon="calendar"
            label="Events"
            sub="Termine erstellen und verwalten"
          />
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="upper-label" style={{ marginBottom: 14 }}>Letzte Tischwünsche</div>
        {!data?.recentWishes?.length ? (
          <div style={{ color: "var(--ink-3)", fontSize: 13, padding: "12px 0" }}>
            {dataSource === "live"
              ? "Noch keine Tischwünsche gemeldet."
              : "Im Demo-Modus werden keine Tischwünsche persistiert."}
          </div>
        ) : (
          <div>
            {data.recentWishes.map((w) => (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  padding: "10px 0",
                  borderTop: "1px solid var(--line)",
                  fontSize: 13.5,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong>
                    {w.requesterSlug ? (
                      <Link href={`/directory/${w.requesterSlug}`} style={{ color: "var(--ink)", textDecoration: "none" }}>
                        {w.requesterName}
                      </Link>
                    ) : (
                      w.requesterName
                    )}
                  </strong>
                  <span style={{ color: "var(--ink-3)", margin: "0 6px" }}>möchte kennenlernen</span>
                  <strong>
                    {w.targetSlug ? (
                      <Link href={`/directory/${w.targetSlug}`} style={{ color: "var(--ink)", textDecoration: "none" }}>
                        {w.targetName}
                      </Link>
                    ) : (
                      w.targetName
                    )}
                  </strong>
                </div>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                  {new Date(w.createdAt).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
              </div>
            ))}
            <Link
              href="/admin/table-wishes"
              className="btn-text"
              style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-3)", display: "inline-block" }}
            >
              Alle anzeigen →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="upper-label" style={{ fontSize: 10.5 }}>{label}</div>
      <div className="serif" style={{ fontSize: 32, lineHeight: 1.1, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function QuickLink({ href, icon, label, sub }: { href: string; icon: IconName; label: string; sub: string }) {
  return (
    <Link
      href={href}
      className="nav-item"
      style={{ padding: "10px 12px", gap: 12, alignItems: "flex-start" }}
    >
      <Icon name={icon} className="icon" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>
      </div>
      <Icon name="arrow" size={14} style={{ opacity: 0.4 }} />
    </Link>
  );
}
