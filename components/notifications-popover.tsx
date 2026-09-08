"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./icon";
import { isMobileChrome } from "@/lib/breakpoint";
import { markNotificationsReadLocally, reload, useMe, useMembers, type Notif } from "@/lib/hooks";
import { markNotificationsReadAction } from "@/app/actions/notifications";

type Props = { notifs: Notif[]; onClose: () => void };

const KNOWN: IconName[] = ["users", "message", "calendar", "sparkle", "trophy", "bell", "user"];

function iconFor(kind: string): IconName {
  return (KNOWN.includes(kind as IconName) ? kind : "bell") as IconName;
}

export function NotificationsPopover({ notifs, onClose }: Props) {
  const router = useRouter();
  const { data: members } = useMembers();
  const { dbId: meDbId } = useMe();
  // Was beim Öffnen ungelesen war, bleibt im Popover hervorgehoben, auch
  // wenn der Store die Einträge (optimistisch) schon als gelesen führt.
  const [unreadAtOpen] = useState(() => new Set(notifs.filter((n) => n.unread).map((n) => n.id)));

  // Ziel einer Nachrichten-Benachrichtigung. Der Link steht seit dem
  // notification_links-Trigger in der Zeile — aeltere Zeilen (und jede, die
  // ein Trigger ohne link schreibt) haetten sonst gar kein Ziel und der
  // Eintrag waere tot. Fallback: Absendername aus dem Titel gegen die
  // Member-Liste aufloesen, sonst wenigstens in die Nachrichten-Liste.
  const linkFor = (n: Notif): string => {
    if (n.link) return n.link;
    if (n.kind !== "message") return "";
    const name = n.title.replace(/^Neue Nachricht von\s+/i, "").trim().toLowerCase();
    const m = members.find((x) => `${x.first} ${x.last}`.trim().toLowerCase() === name);
    return m ? `/messages?to=${m.id}` : "/messages";
  };
  // Beim Öffnen: Badge sofort weg (optimistisch im Store), serverseitig als
  // gelesen markieren und ERST DANACH neu laden. Vorher lief der Reload beim
  // Schliessen, oft bevor der Server-Write durch war — der Refetch brachte die
  // alten "ungelesen"-Zeilen zurück, der Badge blieb bis zum nächsten 60-s-
  // Tick stehen oder sprang später von selbst weg.
  useEffect(() => {
    markNotificationsReadLocally(meDbId);
    markNotificationsReadAction()
      .catch(() => {})
      .then(() => reload("notifications"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- einmal pro Öffnen
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
            notifs.map((n) => {
              const target = linkFor(n);
              const unread = n.unread || unreadAtOpen.has(n.id);
              return (
              <div
                key={n.id}
                onClick={target ? () => { onClose(); router.push(target); } : undefined}
                role={target ? "button" : undefined}
                tabIndex={target ? 0 : undefined}
                onKeyDown={target ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); router.push(target); } } : undefined}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--line)",
                  background: unread ? "var(--accent-soft)" : "transparent",
                  opacity: unread ? 1 : 0.7,
                  cursor: target ? "pointer" : "default",
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-sunken)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)", flexShrink: 0 }}>
                  <Icon name={iconFor(n.kind)} size={15} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: unread ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</div>
                  {n.preview && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.preview}</div>}
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 3 }}>{n.time}</div>
                </div>
                {unread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />}
              </div>
              );
            })
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
  if (isMobileChrome()) {
    return createPortal(panel, document.body);
  }
  return panel;
}
