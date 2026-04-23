"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { reload, useConversations, useMe, useMembers, useThreadMessages, type ChatMessage, type Conversation } from "@/lib/hooks";
import { markThreadReadAction, sendMessageAction, sendMessageWithAttachmentAction } from "@/app/actions/messages";
import { MEMBERS, type Member } from "@/lib/data";

const EMOJIS = [
  "😀", "😄", "😁", "😊", "😉", "😍", "😎", "🤔",
  "😅", "😂", "🙃", "😇", "🤗", "🤩", "🫶", "👋",
  "👍", "👏", "🙌", "🙏", "💪", "🤝", "🫡", "👌",
  "🎉", "🥂", "🍻", "🏆", "🔥", "✨", "⭐", "💯",
  "❤️", "🧡", "💙", "💚", "💜", "🤍", "🖤", "💖",
  "✅", "❌", "⚠️", "💡", "📌", "📎", "📅", "⏰",
  "🚀", "💼", "🏢", "📈", "📊", "💰", "🌍", "🎯",
  "⚽", "🏀", "🏈", "🎾", "⛳", "🏓", "🚴", "🏃",
];

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
    // Members still loading — wait instead of falling back to a different convo
    if (!memberBySlug) return null;
    const existing = convos.find((c) => c.other.id === toParam);
    if (existing) return existing.otherDbId;
    // New conversation — resolve to DB uuid in live, or slug in demo
    return dataSource === "live" ? memberBySlug.dbId ?? null : toParam;
  }, [convos, toParam, members, dataSource]);

  const [activeDbId, setActiveDbId] = useState<string | null>(initialDbId);
  const userPickedRef = useRef(false);
  useEffect(() => {
    // URL changed — reset user override and re-sync to the new target.
    userPickedRef.current = false;
    setActiveDbId(initialDbId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toParam]);
  useEffect(() => {
    // Async data just resolved the recipient — sync unless the user already picked something manually.
    if (!userPickedRef.current) setActiveDbId(initialDbId);
  }, [initialDbId]);

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
  const [plusOpen, setPlusOpen] = useState(false);
  const [plusPos, setPlusPos] = useState<{ left: number; top: number } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiPos, setEmojiPos] = useState<{ left: number; top: number } | null>(null);
  const [attachmentPending, setAttachmentPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const emojiPopRef = useRef<HTMLDivElement>(null);

  const POPOVER_W = 364;
  const POPOVER_H = 340;
  const MENU_W = 160;
  const MENU_H = 96;

  const anchorAbove = (height: number, width: number): { left: number; top: number } | null => {
    const btn = plusBtnRef.current;
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    let left = r.left;
    if (left + width > vw - 12) left = Math.max(12, vw - width - 12);
    if (left < 12) left = 12;
    const top = Math.max(12, r.top - height - 8);
    return { left, top };
  };

  useEffect(() => {
    if (!plusOpen) return;
    setPlusPos(anchorAbove(MENU_H, MENU_W));
    const onReflow = () => setPlusPos(anchorAbove(MENU_H, MENU_W));
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (plusMenuRef.current?.contains(t)) return;
      if (plusBtnRef.current?.contains(t)) return;
      setPlusOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlusOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plusOpen]);

  useEffect(() => {
    if (!emojiOpen) return;
    setEmojiPos(anchorAbove(POPOVER_H, POPOVER_W));
    const onReflow = () => setEmojiPos(anchorAbove(POPOVER_H, POPOVER_W));
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (emojiPopRef.current?.contains(t)) return;
      if (plusBtnRef.current?.contains(t)) return;
      setEmojiOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emojiOpen]);

  const insertEmoji = (emoji: string) => {
    setDraft((d) => d + emoji);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const onPickAttachment = () => {
    setSendError(null);
    fileInputRef.current?.click();
  };

  const onAttachmentChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setSendError("Nur JPG, PNG, WebP oder GIF erlaubt.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSendError("Datei zu gross (max. 25 MB).");
      return;
    }

    if (dataSource !== "live") {
      // In demo mode, just inline the image via object URL
      if (!activeDbId) return;
      const url = URL.createObjectURL(file);
      setDemoMsgs((prev) => [
        ...prev,
        {
          id: "local-" + Date.now(),
          senderDbId: "me",
          recipientDbId: activeDbId,
          body: draft.trim(),
          createdAt: new Date().toISOString(),
          attachmentUrl: url,
        },
      ]);
      setDraft("");
      return;
    }

    const recipient = activeDbId ?? (dataSource === "live" ? activeMember?.dbId ?? null : null);
    if (!recipient) {
      setSendError("Kein Empfänger ausgewählt.");
      return;
    }

    setAttachmentPending(true);
    setSendError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("recipientDbId", recipient);
      fd.append("body", draft.trim());
      const r = await sendMessageWithAttachmentAction(fd);
      if (r.error) {
        setSendError(r.error);
        return;
      }
      setDraft("");
      if (!activeDbId) { userPickedRef.current = true; setActiveDbId(recipient); }
      reload("messages");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setAttachmentPending(false);
    }
  };

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
    const recipient = activeDbId ?? (dataSource === "live" ? activeMember?.dbId ?? null : null);
    if (!recipient) {
      setSendError("Kein Empfänger ausgewählt.");
      return;
    }
    startTransition(async () => {
      const r = await sendMessageAction(recipient, body);
      if (r.error) setSendError(r.error);
      else {
        setDraft("");
        if (!activeDbId) { userPickedRef.current = true; setActiveDbId(recipient); }
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
                    onClick={() => { userPickedRef.current = true; setActiveDbId(conv.otherDbId); }}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "14px 16px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--line)",
                      background: conv.otherDbId === activeDbId ? "var(--bg-sunken)" : "transparent",
                    }}
                  >
                    <Avatar first={conv.other.first} last={conv.other.last} color={conv.other.color} size={40} url={conv.other.avatarUrl} />
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
                        onClick={() => { userPickedRef.current = true; setActiveDbId(null); }}
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
                    <Avatar first={activeMember.first} last={activeMember.last} color={activeMember.color} size={38} url={activeMember.avatarUrl} />
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
                          attachmentUrl={m.attachmentUrl}
                        />
                      ))
                    )}
                  </div>
                  <div style={{ padding: 12, borderTop: "1px solid var(--line)", display: "flex", gap: 10, flexDirection: "column", position: "relative" }}>
                    {sendError && <div style={{ fontSize: 12, color: "var(--danger)" }}>{sendError}</div>}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={onAttachmentChosen}
                      style={{ display: "none" }}
                    />
                    <form
                      onSubmit={(e) => { e.preventDefault(); onSend(); }}
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <button
                        ref={plusBtnRef}
                        type="button"
                        onClick={() => {
                          if (plusOpen) setPlusOpen(false);
                          else { setEmojiOpen(false); setPlusOpen(true); }
                        }}
                        disabled={attachmentPending}
                        className="icon-btn"
                        title="Anhängen"
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "var(--radius)",
                          border: "1px solid var(--line)",
                          background: plusOpen || emojiOpen ? "var(--bg-sunken)" : "var(--bg-elevated)",
                          color: "var(--ink-2)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          cursor: attachmentPending ? "wait" : "pointer",
                          transition: "transform 120ms",
                        }}
                        aria-label="Anhängen"
                        aria-expanded={plusOpen}
                      >
                        <Icon
                          name="plus"
                          size={18}
                          style={{ transform: plusOpen || emojiOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 160ms" }}
                        />
                      </button>
                      <input
                        ref={inputRef}
                        className="input"
                        placeholder={attachmentPending ? "Anhang wird hochgeladen..." : "Nachricht schreiben..."}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        disabled={attachmentPending}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={pending || attachmentPending || !draft.trim()}
                      >
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

      {plusOpen && plusPos && (
        <div
          ref={plusMenuRef}
          role="menu"
          aria-label="Anhängen"
          style={{
            position: "fixed",
            left: plusPos.left,
            top: plusPos.top,
            width: MENU_W,
            zIndex: 200,
            background: "var(--bg-elevated)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            padding: 6,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setPlusOpen(false); setEmojiOpen(true); }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              borderRadius: 6,
              fontSize: 13.5,
              color: "var(--ink)",
              textAlign: "left",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, width: 20, textAlign: "center" }}>😊</span>
            <span>Emoji</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setPlusOpen(false); onPickAttachment(); }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              borderRadius: 6,
              fontSize: 13.5,
              color: "var(--ink)",
              textAlign: "left",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ width: 20, display: "inline-flex", justifyContent: "center", color: "var(--ink-2)" }}>
              <AttachIcon />
            </span>
            <span>Bild</span>
          </button>
        </div>
      )}

      {emojiOpen && emojiPos && (
        <div
          ref={emojiPopRef}
          role="dialog"
          aria-label="Emoji-Picker"
          style={{
            position: "fixed",
            left: emojiPos.left,
            top: emojiPos.top,
            width: POPOVER_W,
            zIndex: 200,
            background: "var(--bg-elevated)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            padding: 10,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 40px)",
              gap: 2,
              justifyContent: "space-between",
            }}
          >
            {EMOJIS.map((em, i) => (
              <button
                key={`${em}-${i}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertEmoji(em)}
                style={{
                  width: 40,
                  height: 40,
                  padding: 0,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 6,
                  fontSize: 22,
                  lineHeight: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  fontFamily:
                    '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", system-ui, sans-serif',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}
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

function Msg({
  align,
  text,
  time,
  avatar,
  attachmentUrl,
}: {
  align: "left" | "right";
  text: string;
  time: string;
  avatar?: Member;
  attachmentUrl?: string;
}) {
  const hasText = Boolean(text && text.trim());
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: align === "right" ? "flex-end" : "flex-start", marginBottom: 14 }}>
      {align === "left" && avatar && <Avatar first={avatar.first} last={avatar.last} color={avatar.color} size={28} url={avatar.avatarUrl} />}
      <div style={{ maxWidth: 440 }}>
        {attachmentUrl && (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block",
              borderRadius: 14,
              borderTopLeftRadius: align === "left" ? 4 : 14,
              borderTopRightRadius: align === "right" ? 4 : 14,
              overflow: "hidden",
              marginBottom: hasText ? 4 : 0,
              border: "1px solid var(--line)",
              background: "var(--bg-sunken)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachmentUrl}
              alt="Anhang"
              style={{ display: "block", width: "100%", maxHeight: 360, objectFit: "cover" }}
            />
          </a>
        )}
        {hasText && (
          <div
            style={{
              padding: "10px 14px",
              background: align === "right" ? "var(--ink)" : "var(--bg-elevated)",
              color: align === "right" ? "var(--bg)" : "var(--ink)",
              borderRadius: 14,
              borderTopLeftRadius: align === "left" && !attachmentUrl ? 4 : 14,
              borderTopRightRadius: align === "right" && !attachmentUrl ? 4 : 14,
              fontSize: 13.5,
              lineHeight: 1.45,
              border: align === "left" ? "1px solid var(--line)" : "none",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {text}
          </div>
        )}
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

function AttachIcon() {
  // Simple paperclip inline SVG so we don't have to extend the icon set.
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11l-8.5 8.5a5 5 0 1 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 1 1-3-3L15 7" />
    </svg>
  );
}
