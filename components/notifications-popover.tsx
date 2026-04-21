"use client";

import { Icon, type IconName } from "./icon";
import type { Notif } from "@/lib/hooks";

type Props = { notifs: Notif[]; onClose: () => void };

const KNOWN: IconName[] = ["users", "message", "calendar", "sparkle", "trophy", "bell", "user"];

function iconFor(kind: string): IconName {
  return (KNOWN.includes(kind as IconName) ? kind : "bell") as IconName;
}

export function NotificationsPopover({ notifs, onClose }: Props) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: 360,
        maxWidth: "calc(100vw - 24px)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--line-strong)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 200,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="serif" style={{ fontSize: 18 }}>Benachrichtigungen</div>
        <button className="btn-text" style={{ fontSize: 11.5, color: "var(--ink-3)", padding: "4px 8px" }} onClick={onClose}>
          Schließen
        </button>
      </div>
      <div style={{ maxHeight: 380, overflowY: "auto" }}>
        {notifs.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
            Keine Benachrichtigungen.
          </div>
        ) : (
          notifs.map((n) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 16px",
                borderBottom: "1px solid var(--line)",
                cursor: "pointer",
                background: n.unread ? "var(--accent-soft)" : "transparent",
                opacity: n.unread ? 1 : 0.7,
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-sunken)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)", flexShrink: 0 }}>
                <Icon name={iconFor(n.kind)} size={15} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: n.unread ? 500 : 400 }}>{n.title}</div>
                {n.preview && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{n.preview}</div>}
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 3 }}>{n.time}</div>
              </div>
              {n.unread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
