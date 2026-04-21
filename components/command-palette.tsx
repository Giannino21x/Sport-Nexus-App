"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icon";
import type { Member, SnEvent } from "@/lib/data";

type Item =
  | {
      kind: "member";
      id: string;
      slug: string;
      label: string;
      sub: string;
      href: string;
      member: Member;
    }
  | {
      kind: "event";
      id: string;
      label: string;
      sub: string;
      href: string;
    }
  | {
      kind: "nav";
      id: string;
      label: string;
      sub: string;
      href: string;
      icon: IconName;
    };

const NAV_ITEMS: { id: string; label: string; sub: string; href: string; icon: IconName }[] = [
  { id: "nav-dashboard", label: "Dashboard", sub: "Startseite", href: "/dashboard", icon: "dashboard" },
  { id: "nav-directory", label: "Member Directory", sub: "Alle Mitglieder durchsuchen", href: "/directory", icon: "users" },
  { id: "nav-events", label: "Events", sub: "Kommende & vergangene Treffen", href: "/events", icon: "calendar" },
  { id: "nav-messages", label: "Messages", sub: "Nachrichten", href: "/messages", icon: "message" },
  { id: "nav-feed", label: "Community Feed", sub: "Beta", href: "/feed", icon: "feed" },
  { id: "nav-profile", label: "Profil bearbeiten", sub: "Deine Stammdaten", href: "/profile", icon: "edit" },
];

export function CommandPalette({
  open,
  onClose,
  members,
  events,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  events: SnEvent[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state each time the palette opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlighted(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Empty query → show navigation shortcuts
      return NAV_ITEMS.map((n) => ({ kind: "nav" as const, ...n }));
    }
    const memberHits: Item[] = members
      .filter((m) => {
        const hay = `${m.first} ${m.last} ${m.company} ${m.role} ${m.branch} ${m.sub} ${m.work} ${m.home}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8)
      .map((m) => ({
        kind: "member" as const,
        id: `member-${m.id}`,
        slug: m.id,
        label: `${m.first} ${m.last}`,
        sub: [m.role, m.company].filter(Boolean).join(" · "),
        href: `/directory/${m.id}`,
        member: m,
      }));
    const eventHits: Item[] = events
      .filter((e) => {
        const hay = `${e.title} ${e.subtitle} ${e.city} ${e.venue}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 6)
      .map((e) => ({
        kind: "event" as const,
        id: `event-${e.id}`,
        label: `${e.title} — ${e.city}`,
        sub: `${e.subtitle} · ${new Date(e.date).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" })}`,
        href: `/events/${e.id}`,
      }));
    const navHits: Item[] = NAV_ITEMS
      .filter((n) => n.label.toLowerCase().includes(q) || n.sub.toLowerCase().includes(q))
      .map((n) => ({ kind: "nav" as const, ...n }));
    return [...memberHits, ...eventHits, ...navHits];
  }, [query, members, events]);

  // Clamp highlighted index when the list changes
  useEffect(() => {
    setHighlighted((h) => Math.min(Math.max(0, h), Math.max(0, items.length - 1)));
  }, [items.length]);

  const go = (item: Item) => {
    onClose();
    router.push(item.href);
  };

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => {
        // Outside click closes (palette is the inner div; backdrop closes)
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(2px)",
        zIndex: 200,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "10vh",
        padding: "10vh 16px 16px",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Suche"
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          background: "var(--bg-elevated)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "min(560px, 80vh)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <Icon name="search" size={16} style={{ color: "var(--ink-3)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlighted((h) => Math.min(items.length - 1, h + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlighted((h) => Math.max(0, h - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const selected = items[highlighted];
                if (selected) go(selected);
              }
            }}
            placeholder="Mitglieder, Events, Seiten suchen..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--ink)",
              fontSize: 15,
              fontFamily: "inherit",
            }}
            autoComplete="off"
          />
          <kbd
            style={{
              fontSize: 11,
              padding: "2px 6px",
              border: "1px solid var(--line)",
              borderRadius: 4,
              color: "var(--ink-3)",
              background: "var(--bg-sunken)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Esc
          </kbd>
        </div>

        <div ref={listRef} style={{ overflowY: "auto", padding: 6 }}>
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              Keine Treffer für „{query}".
            </div>
          ) : (
            items.map((item, i) => {
              const active = i === highlighted;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHighlighted(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(item);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: active ? "var(--bg-sunken)" : "transparent",
                  }}
                >
                  {item.kind === "member" ? (
                    <Avatar
                      first={item.member.first}
                      last={item.member.last}
                      color={item.member.color}
                      size={32}
                      url={item.member.avatarUrl}
                    />
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "var(--bg-sunken)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--ink-2)",
                      }}
                    >
                      <Icon
                        name={item.kind === "event" ? "calendar" : item.icon}
                        size={15}
                      />
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--ink-3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginTop: 2,
                      }}
                    >
                      {item.sub}
                    </div>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: "var(--ink-4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {item.kind === "member" ? "Mitglied" : item.kind === "event" ? "Event" : "Seite"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 14,
            fontSize: 11,
            color: "var(--ink-4)",
          }}
        >
          <span>
            <kbd style={kbdStyle}>↑↓</kbd> Navigieren
          </span>
          <span>
            <kbd style={kbdStyle}>↵</kbd> Öffnen
          </span>
          <span>
            <kbd style={kbdStyle}>Esc</kbd> Schliessen
          </span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  fontSize: 10,
  padding: "1px 5px",
  border: "1px solid var(--line)",
  borderRadius: 3,
  background: "var(--bg-sunken)",
  color: "var(--ink-3)",
  marginRight: 4,
  fontFamily: "var(--font-mono)",
};
