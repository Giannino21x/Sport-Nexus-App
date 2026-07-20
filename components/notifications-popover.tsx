"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./icon";
import { reload, type Notif } from "@/lib/hooks";
import { markNotificationsReadAction } from "@/app/actions/notifications";

type Props = { notifs: Notif[]; onClose: () => void };

const KNOWN: IconName[] = ["users", "message", "calendar", "sparkle", "trophy", "bell", "user"];

function iconFor(kind: string): IconName {
  return (KNOWN.includes(kind as IconName) ? kind : "bell") as IconName;
}

export function NotificationsPopover({ notifs, onClose }: Props) {
  // Beim Öffnen serverseitig als gelesen markieren; beim Schliessen die Liste
  // neu laden, damit der Unread-Punkt an der Glocke verschwindet. (Im Popover
  // selbst bleibt die Hervorhebung sichtbar, solange es offen ist.)
  useEffect(() => {
    markNotificationsReadAction().catch(() => {});
    return () => { reload("notifications"); };
  }, []);

  const panel = (
    <>
      {/* Mobile-Backdrop — auf kleinen Screens schliesst ein Tap ausserhalb das Panel.
          Auf Desktop weiter Click-Outside via parent. */}
      <div
        className="notif-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="notif-popover"
        role="dialog"
        aria-label="Benachrichtigungen"
      >
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div className="serif" style={{ fontSize: 18 }}>Benachrichtigungen</div>
          <button className="btn-text" style={{ fontSize: 11.5, color: "var(--ink-3)", padding: "4px 8px" }} onClick={onClose}>
            Schließen
          </button>
        </div>
        <div className="notif-list">
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
    </>
  );

  // Mobile: Bottom-Sheet + Backdrop als Portal auf <body>. Innerhalb der
  // Topbar wäre position:fixed kaputt — deren backdrop-filter (Liquid Glass)
  // macht sie zum Containing Block für fixed-Nachfahren, Sheet und Backdrop
  // ankerten dann an der Leiste statt am Bildschirm. Desktop bleibt in-place,
  // weil das Popover dort absolut am Bell-Button dockt.
  // (Rendert nur nach Klick, also garantiert client-seitig.)
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 780px)").matches) {
    return createPortal(panel, document.body);
  }
  return panel;
}
