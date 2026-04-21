"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { reload, useConversations, useMe, useMembers, useThreadMessages, type ChatMessage, type Conversation } from "@/lib/hooks";
import { markThreadReadAction, sendMessageAction } from "@/app/actions/messages";
import { MEMBERS, type Member } from "@/lib/data";

export default function MessagesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "var(--ink-3)" }}>Lade Nachrichten...</div>}>
      <MessagesInner />
    </Suspense>
  );
}

function MessagesInner() {
  const searchParams = useSearchParams();
  const toParam = searchParams.get("to");

  const { dataSource } = useSettings();
  const { data: me, dbId: meDbId } = useMe();
  const { data: members } = useMembers();
  const { data: liveConvos } = useConversations(meDbId);

  // Demo conversations (static, client-side memory)
  const demoConvosRef = useMemo<Conversation[]>(
    () => [
      demoConvoFor(1, "Perfekt, dann sehen wir uns beim Lunch in Zürich!", "vor 2 Std.", 2),
      demoConvoFor(2, "Hast du Zeit nächste Woche für einen kurzen Call?", "vor 1 Tag", 1),
      demoConvoFor(4, "Danke für die Vorstellung — Termin ist gebucht.", "vor 3 Tagen", 0),
      demoConvoFor(7, "Spannend! Ich schicke dir das Deck.", "vor 5 Tagen", 0),
      demoConvoFor(11, "Gerne, ich melde mich Anfang nächster Woche.", "vor 1 Woche", 0),
    ],
    [],
  );

  const convos = dataSource === "live" ? liveConvos : demoConvosRef;

  // If ?to=slug is set, auto-select or create thread
  const initialDbId = useMemo(() => {
    if (!toParam) return convos[0]?.otherDbId ?? null;
    const memberBySlug = members.find((m) => m.id === toParam);
    if (!memberBySlug) return convos[0]?.otherDbId ?? null;
    const existing = convos.find((c) => c.other.id === toParam);
    if (existing) return existing.otherDbId;
    // New conversation — otherDbId is the live DB id or the slug in demo
    return dataSource === "live" ? null : toParam;
  }, [convos, toParam, members, dataSource]);

  const [activeDbId, setActiveDbId] = useState<string | null>(initialDbId);
  useEffect(() => {
    // Respond to URL ?to= changes, but don't reset if user already opened/closed a thread.
    setActiveDbId(initialDbId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toParam]);

  const activeConvo = convos.find((c) => c.otherDbId === activeDbId) ?? null;
  const activeMember: Member | null = activeConvo?.other ?? (toParam ? members.find((m) => m.id === toParam) ?? null : convos[0]?.other ?? null);

  const { data: liveMsgs } = useThreadMessages(meDbId, dataSource === "live" ? activeDbId : null);

  const [demoMsgs, setDemoMsgs] = useState<ChatMessage[]>([]);
  useEffect(() => {
    if (dataSource !== "demo" || !activeConvo) { setDemoMsgs([]); return; }
    const otherId = activeConvo.otherDbId;
    setDemoMsgs([
      demoMsg(otherId, "me", "Hi! Danke für den Kontakt letzte Woche beim Lunch — war ein spannender Talk.", -1.5 * 3600_000),
      demoMsg("me", otherId, "Absolut, Andy Schmid hat was ausgelöst. Ich dachte an deine Suche nach Co-Investoren — wir sollten uns austauschen.", -1.3 * 3600_000),
      demoMsg(otherId, "me", "Sehr gerne. Hast du Zeit nächste Woche für einen kurzen Call?", -2 * 60_000),
      demoMsg("me", otherId, "Dienstag 10:00 oder Mittwoch 16:00?", -1 * 60_000),
      demoMsg(otherId, "me", activeConvo.last, -30 * 1000),
    ]);
  }, [dataSource, activeConvo]);

  const msgs = dataSource === "live" ? liveMsgs : demoMsgs;

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (dataSource === "live" && activeDbId) {
      markThreadReadAction(activeDbId).catch(() => {});
    }
  }, [dataSource, activeDbId]);

  const onSend = () => {
    const body = draft.trim();
    if (!body) return;
    setSendError(null);
    if (dataSource !== "live") {
      setDemoMsgs((prev) => [
        ...prev,
        { id: "local-" + Date.now(), senderDbId: "me", recipientDbId: activeDbId ?? "", body, createdAt: new Date().toISOString() },
      ]);
      setDraft("");
      return;
    }
    if (!activeDbId) {
      setSendError("Kein Empfänger ausgewählt.");
      return;
    }
    startTransition(async () => {
      const r = await sendMessageAction(activeDbId, body);
      if (r.error) setSendError(r.error);
      else {
        setDraft("");
        reload("messages");
      }
    });
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 780);
    h();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  if (!me) return null;

  const showList = !isMobile || !activeDbId;
  const showThread = !isMobile || !!activeDbId;

  return (
    <div className="messages-wrap">
      <div className="messages-inner">
        <div className="page-header" style={{ marginBottom: 14 }}>
          <div>
            <div className="upper-label">Messages</div>
            <h1>Nachrichten</h1>
          </div>
          <Link href="/directory" className="btn btn-accent">
            <Icon name="plus" size={14} /> Neue Nachricht
          </Link>
        </div>
        <div className="messages-grid card">
          {showList && (
            <div className="messages-list">
              {convos.length === 0 ? (
                <div style={{ padding: 24, fontSize: 13, color: "var(--ink-3)", textAlign: "center" }}>
                  Keine Konversationen.<br />
                  <Link href="/directory" className="btn btn-text" style={{ marginTop: 10, display: "inline-flex" }}>
                    Mitglied ansprechen →
                  </Link>
                </div>
              ) : (
                convos.map((conv) => (
                  <div
                    key={conv.otherDbId}
                    onClick={() => setActiveDbId(conv.otherDbId)}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "14px 16px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--line)",
                      background: conv.otherDbId === activeDbId ? "var(--bg-sunken)" : "transparent",
                    }}
                  >
                    <Avatar first={conv.other.first} last={conv.other.last} color={conv.other.color} size={40} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{conv.other.first} {conv.other.last}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{conv.time}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                        {conv.last}
                      </div>
                    </div>
                    {conv.unread > 0 && (
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 10,
                          background: "var(--accent)",
                          color: "var(--accent-ink)",
                          fontSize: 10.5,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 4,
                        }}
                      >
                        {conv.unread}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          {showThread && (
            <div className="messages-thread">
              {activeMember ? (
                <>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
                    {isMobile && (
                      <button
                        className="icon-btn"
                        onClick={() => setActiveDbId(null)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "var(--radius)",
                          border: "1px solid var(--line)",
                          background: "var(--bg-elevated)",
                          color: "var(--ink-2)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                        aria-label="Zurück"
                      >
                        <Icon name="chevron" size={16} style={{ transform: "rotate(180deg)" }} />
                      </button>
                    )}
                    <Avatar first={activeMember.first} last={activeMember.last} color={activeMember.color} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {activeMember.first} {activeMember.last}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {activeMember.role} · {activeMember.company}
                      </div>
                    </div>
                    <Link
                      href={`/directory/${activeMember.id}`}
                      className="btn btn-ghost"
                      style={{ padding: "6px 10px", fontSize: 12.5, flexShrink: 0 }}
                    >
                      {isMobile ? "Profil" : "Profil ansehen"}
                    </Link>
                  </div>
                  <div style={{ flex: 1, padding: isMobile ? 14 : 24, background: "var(--bg-sunken)", overflowY: "auto" }}>
                    {msgs.length === 0 ? (
                      <div style={{ textAlign: "center", color: "var(--ink-3)", fontSize: 13, marginTop: 40 }}>
                        Noch keine Nachrichten. Schreib den ersten Gruß!
                      </div>
                    ) : (
                      msgs.map((m) => (
                        <Msg
                          key={m.id}
                          align={m.senderDbId === (dataSource === "live" ? meDbId : "me") ? "right" : "left"}
                          avatar={m.senderDbId === (dataSource === "live" ? meDbId : "me") ? undefined : activeMember}
                          text={m.body}
                          time={formatMessageTime(m.createdAt)}
                        />
                      ))
                    )}
                  </div>
                  <div style={{ padding: 12, borderTop: "1px solid var(--line)", display: "flex", gap: 10, flexDirection: "column" }}>
                    {sendError && <div style={{ fontSize: 12, color: "var(--danger)" }}>{sendError}</div>}
                    <form
                      onSubmit={(e) => { e.preventDefault(); onSend(); }}
                      style={{ display: "flex", gap: 8 }}
                    >
                      <input
                        className="input"
                        placeholder="Nachricht schreiben..."
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="btn btn-primary" disabled={pending || !draft.trim()}>
                        <Icon name="send" size={14} />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: 13, padding: 40, textAlign: "center" }}>
                  {convos.length === 0 ? "Noch keine Konversationen." : "Wähle eine Konversation aus."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function demoConvoFor(idx: number, last: string, time: string, unread: number): Conversation {
  const m = MEMBERS[idx];
  return { other: m, otherDbId: m.id, last, time, unread };
}

function demoMsg(senderDbId: string, recipientDbId: string, body: string, msOffset: number): ChatMessage {
  return {
    id: `${senderDbId}-${msOffset}`,
    senderDbId,
    recipientDbId,
    body,
    createdAt: new Date(Date.now() + msOffset).toISOString(),
  };
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return sameDay ? `Heute · ${hh}:${mm}` : `${d.toLocaleDateString("de-CH", { day: "numeric", month: "short" })} · ${hh}:${mm}`;
}

function Msg({ align, text, time, avatar }: { align: "left" | "right"; text: string; time: string; avatar?: Member }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: align === "right" ? "flex-end" : "flex-start", marginBottom: 14 }}>
      {align === "left" && avatar && <Avatar first={avatar.first} last={avatar.last} color={avatar.color} size={28} />}
      <div style={{ maxWidth: 440 }}>
        <div
          style={{
            padding: "10px 14px",
            background: align === "right" ? "var(--ink)" : "var(--bg-elevated)",
            color: align === "right" ? "var(--bg)" : "var(--ink)",
            borderRadius: 14,
            borderTopLeftRadius: align === "left" ? 4 : 14,
            borderTopRightRadius: align === "right" ? 4 : 14,
            fontSize: 13.5,
            lineHeight: 1.45,
            border: align === "left" ? "1px solid var(--line)" : "none",
          }}
        >
          {text}
        </div>
        <div
          className="mono"
          style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 4, textAlign: align === "right" ? "right" : "left" }}
        >
          {time}
        </div>
      </div>
    </div>
  );
}
