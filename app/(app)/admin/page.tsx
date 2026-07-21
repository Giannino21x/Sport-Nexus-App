"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { getAdminOverviewAction, type AdminOverview } from "@/app/actions/admin";

// Tischwünsche + Profil-Änderungen sind aus dem Admin-Bereich rausgeputzt
// (Pascal, Feedback 8). Die DB-Tabellen und der Änderungs-Trigger bleiben —
// nur die Verwaltungs-UI ist weg.
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
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="upper-label" style={{ marginBottom: 14 }}>Schnellzugriff</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
