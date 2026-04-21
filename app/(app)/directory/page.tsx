"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Dropdown } from "@/components/dropdown";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { BRANCHES, type Member } from "@/lib/data";
import { useMembers } from "@/lib/hooks";

export default function DirectoryPage() {
  const { layout, cardStyle } = useSettings();
  const { data: members, loading, isDemo } = useMembers();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ branch: "", sub: "", work: "", home: "", role: "" });
  const [sort, setSort] = useState<"last" | "first" | "company">("last");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const subOptions = useMemo(() => {
    if (!filters.branch) return Object.values(BRANCHES).flat();
    return BRANCHES[filters.branch] || [];
  }, [filters.branch]);

  const allWorkCities = useMemo(() => [...new Set(members.map((m) => m.work))].sort(), [members]);
  const allHomeCities = useMemo(() => [...new Set(members.map((m) => m.home))].sort(), [members]);
  const allRoles = useMemo(() => [...new Set(members.map((m) => m.role))].sort(), [members]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const r = (members ?? []).filter((m) => {
      if (filters.branch && m.branch !== filters.branch) return false;
      if (filters.sub && m.sub !== filters.sub) return false;
      if (filters.work && m.work !== filters.work) return false;
      if (filters.home && m.home !== filters.home) return false;
      if (filters.role && m.role !== filters.role) return false;
      if (qq) {
        const hay = `${m.first} ${m.last} ${m.company} ${m.offer} ${m.search}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
    r.sort((a, b) => {
      if (sort === "first") return a.first.localeCompare(b.first);
      if (sort === "company") return a.company.localeCompare(b.company);
      return a.last.localeCompare(b.last);
    });
    return r;
  }, [q, filters, sort, members]);

  useEffect(() => setPage(1), [q, filters, sort]);
  const visible = filtered.slice(0, page * pageSize);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const clearAll = () => {
    setQ("");
    setFilters({ branch: "", sub: "", work: "", home: "", role: "" });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Member Directory</div>
          <h1>
            {filtered.length} <em style={{ color: "var(--accent)", fontStyle: "italic", fontSize: "0.9em" }}>Mitglieder</em>
          </h1>
          <div className="subtitle">Die SportNexus Community — Unternehmer, Führungskräfte und Gründer aus der Schweiz.</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 320px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            background: "var(--bg-elevated)",
          }}
        >
          <Icon name="search" size={16} className="text-ink-3" />
          <input
            style={{ flex: 1, border: "none", background: "transparent", padding: "10px 0", outline: "none", fontSize: 13.5 }}
            placeholder="Suche nach Name, Firma, Angebot oder Suche..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button className="btn-text" style={{ padding: 4 }} onClick={() => setQ("")}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 2, background: "var(--bg-elevated)" }}>
            {([{ k: "last", l: "A–Z Nachname" }, { k: "first", l: "Vorname" }, { k: "company", l: "Firma" }] as const).map((s) => (
              <button
                key={s.k}
                onClick={() => setSort(s.k)}
                style={{
                  padding: "6px 10px",
                  fontSize: 12,
                  border: "none",
                  background: sort === s.k ? "var(--bg-sunken)" : "transparent",
                  color: "var(--ink)",
                  borderRadius: 7,
                  cursor: "pointer",
                }}
              >
                {s.l}
              </button>
            ))}
          </div>
          <LayoutToggle layout={layout} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 18 }}>
        <Dropdown
          label="Branche"
          value={filters.branch}
          options={Object.keys(BRANCHES)}
          onChange={(v) => setFilters((f) => ({ ...f, branch: v, sub: "" }))}
        />
        <Dropdown label="Subbranche" value={filters.sub} options={subOptions} onChange={(v) => setFilters((f) => ({ ...f, sub: v }))} />
        <Dropdown label="Arbeitsort" value={filters.work} options={allWorkCities} onChange={(v) => setFilters((f) => ({ ...f, work: v }))} searchable />
        <Dropdown label="Wohnort" value={filters.home} options={allHomeCities} onChange={(v) => setFilters((f) => ({ ...f, home: v }))} searchable />
        <Dropdown label="Rolle" value={filters.role} options={allRoles} onChange={(v) => setFilters((f) => ({ ...f, role: v }))} searchable />
      </div>

      {activeFilterCount > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          <span className="upper-label">Aktive Filter:</span>
          {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
            <span key={k} className="chip">
              {v}{" "}
              <span className="x" onClick={() => setFilters((f) => ({ ...f, [k]: "" }))}>
                <Icon name="x" size={10} />
              </span>
            </span>
          ))}
          <button className="btn-text" style={{ fontSize: 12, color: "var(--ink-3)", padding: "4px 8px" }} onClick={clearAll}>
            Alle löschen
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="Keine Treffer"
          desc="Kein Mitglied passt auf deine Filter. Versuche andere Begriffe oder setze die Filter zurück."
          action={<button className="btn btn-ghost" onClick={clearAll}>Filter zurücksetzen</button>}
        />
      ) : layout === "grid" ? (
        <MemberGrid members={visible} cardStyle={cardStyle} />
      ) : layout === "list" ? (
        <MemberList members={visible} />
      ) : (
        <MemberTable members={visible} />
      )}

      {visible.length < filtered.length && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button className="btn btn-ghost" onClick={() => setPage((p) => p + 1)}>
            Weitere {Math.min(pageSize, filtered.length - visible.length)} laden
          </button>
          <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 8 }} className="mono">
            {visible.length} / {filtered.length}
          </div>
        </div>
      )}
    </div>
  );
}

function LayoutToggle({ layout }: { layout: "grid" | "list" | "table" }) {
  const icons = { grid: "grid", list: "list", table: "rows" } as const;
  const labels = { grid: "Grid", list: "Liste", table: "Dicht" };
  return (
    <div className="chip" style={{ padding: "5px 10px" }}>
      <Icon name={icons[layout]} size={12} /> {labels[layout]}
    </div>
  );
}

function MemberGrid({ members, cardStyle }: { members: Member[]; cardStyle: "default" | "photo" | "compact" }) {
  const minW = cardStyle === "compact" ? 200 : cardStyle === "photo" ? 240 : 260;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${minW}px, 1fr))`, gap: 14 }}>
      {members.map((m) => (
        <MemberCard key={m.id} m={m} cardStyle={cardStyle} />
      ))}
    </div>
  );
}

function MemberCard({ m, cardStyle }: { m: Member; cardStyle: "default" | "photo" | "compact" }) {
  if (cardStyle === "photo") {
    return (
      <Link href={`/directory/${m.id}`} className="card" style={{ cursor: "pointer", padding: 0, overflow: "hidden", display: "block" }}>
        <div style={{ aspectRatio: "1/1", position: "relative", background: m.color }}>
          <div aria-hidden="true" className="avatar-stripes" />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 72,
            }}
          >
            {m.first[0]}{m.last[0]}
          </div>
          {m.extra && (
            <span style={{ position: "absolute", top: 10, left: 10, fontSize: 10, padding: "3px 8px", background: "rgba(0,0,0,0.4)", color: "white", borderRadius: 999, backdropFilter: "blur(6px)" }}>
              {m.extra}
            </span>
          )}
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{m.first} {m.last}</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{m.role} · {m.company}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 10 }}>{m.branch} · {m.work}</div>
        </div>
      </Link>
    );
  }
  if (cardStyle === "compact") {
    return (
      <Link href={`/directory/${m.id}`} className="card" style={{ cursor: "pointer", padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <Avatar first={m.first} last={m.last} color={m.color} size={42} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.first} {m.last}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.role}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.company}
          </div>
        </div>
      </Link>
    );
  }
  return (
    <Link
      href={`/directory/${m.id}`}
      className="card"
      style={{ cursor: "pointer", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div className="row">
        <Avatar first={m.first} last={m.last} color={m.color} size={52} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.2 }}>{m.first} {m.last}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{m.role}</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13.5 }}>{m.company}</div>
        {m.extra && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, fontStyle: "italic" }}>{m.extra}</div>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
        <span className="chip branch">{m.branch}</span>
        <span className="chip">{m.work}</span>
      </div>
    </Link>
  );
}

function MemberList({ members }: { members: Member[] }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {members.map((m, i) => (
        <Link
          key={m.id}
          href={`/directory/${m.id}`}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 18,
            padding: "16px 20px",
            cursor: "pointer",
            borderTop: i === 0 ? "none" : "1px solid var(--line)",
            alignItems: "center",
          }}
        >
          <Avatar first={m.first} last={m.last} color={m.color} size={52} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 15.5, fontWeight: 500 }}>{m.first} {m.last}</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{m.role} · {m.company}</div>
            </div>
            {m.extra && (
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, fontStyle: "italic" }}>{m.extra}</div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
              <span className="chip branch">{m.branch}</span>
              {m.sub && <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>· {m.sub}</span>}
              <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>· {m.work}</span>
              {m.sports.slice(0, 2).map((s) => (
                <span
                  key={s}
                  className="chip"
                  style={{ background: "transparent", border: "none", padding: "0 0 0 4px", color: "var(--ink-4)" }}
                >
                  · {s}
                </span>
              ))}
            </div>
          </div>
          <span className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 12.5 }}>
            Profildetails →
          </span>
        </Link>
      ))}
    </div>
  );
}

function MemberTable({ members }: { members: Member[] }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-sunken)", textAlign: "left" }}>
              {["Name", "Firma", "Rolle", "Branche", "Arbeitsort", "Sport", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 14px",
                    fontSize: 10.5,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink-3)",
                    fontWeight: 500,
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                onClick={() => { window.location.href = `/directory/${m.id}`; }}
                style={{ cursor: "pointer", borderBottom: "1px solid var(--line)" }}
              >
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar first={m.first} last={m.last} color={m.color} size={30} />
                    <span style={{ fontWeight: 500 }}>{m.first} {m.last}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 14px" }}>{m.company}</td>
                <td style={{ padding: "10px 14px", color: "var(--ink-3)" }}>{m.role}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span className="chip branch">{m.branch}</span>
                </td>
                <td style={{ padding: "10px 14px", color: "var(--ink-3)" }}>{m.work}</td>
                <td style={{ padding: "10px 14px", color: "var(--ink-4)", fontSize: 12 }}>
                  {m.sports.slice(0, 2).join(", ")}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                  <Icon name="chevron" size={14} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
