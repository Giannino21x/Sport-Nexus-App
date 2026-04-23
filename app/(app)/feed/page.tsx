"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { reload, useMe, usePosts, usePostReplies, type Post, type PostReply } from "@/lib/hooks";
import {
  createPostAction,
  createPostWithImageAction,
  createReplyAction,
  deletePostAction,
  deleteReplyAction,
  togglePostLikeAction,
  updatePostAction,
} from "@/app/actions/posts";

type LikeOverride = { liked: boolean; likes: number };

export default function FeedPage() {
  const { dataSource } = useSettings();
  const { data: me, dbId: meDbId } = useMe();
  const { data: posts } = usePosts(meDbId);

  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [composerImage, setComposerImage] = useState<File | null>(null);
  const [composerImagePreview, setComposerImagePreview] = useState<string | null>(null);
  const composerFileRef = useRef<HTMLInputElement>(null);

  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Like overrides: keyed by post id. Source of truth for display until server catches up.
  const [likeOverride, setLikeOverride] = useState<Record<string, LikeOverride>>({});

  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [demoReplies, setDemoReplies] = useState<Record<string, PostReply[]>>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  // Clear like overrides once the posts refetch makes them redundant.
  useEffect(() => {
    setLikeOverride((prev) => {
      let changed = false;
      const next: Record<string, LikeOverride> = {};
      for (const [id, ov] of Object.entries(prev)) {
        const post = posts.find((p) => p.id === id);
        if (post && post.likedByMe === ov.liked && post.likes === ov.likes) {
          changed = true;
          continue;
        }
        next[id] = ov;
      }
      return changed ? next : prev;
    });
  }, [posts]);

  // Close the menu when clicking outside
  useEffect(() => {
    if (!menuOpenFor) return;
    const close = () => setMenuOpenFor(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpenFor]);

  const allPosts = [...localPosts, ...posts];

  const trending = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPosts) {
      if (p.tag && p.tag.trim()) {
        const k = p.tag.trim();
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const hashtags = p.body.match(/#[\p{L}\d_-]{2,}/gu) ?? [];
      for (const h of hashtags) {
        const k = h.slice(1);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));
  }, [allPosts]);

  const isDemoPost = (id: string) => id.startsWith("demo-") || id.startsWith("local-");
  const isMyPost = (p: Post) => Boolean(me && p.author.id === me.id);

  const liked = (p: Post) => likeOverride[p.id]?.liked ?? p.likedByMe;
  const likesNum = (p: Post) => likeOverride[p.id]?.likes ?? p.likes;

  const onToggleLike = (p: Post) => {
    const currLiked = liked(p);
    const currLikes = likesNum(p);
    const newLiked = !currLiked;
    const newLikes = Math.max(0, currLikes + (newLiked ? 1 : -1));

    setLikeOverride((prev) => ({ ...prev, [p.id]: { liked: newLiked, likes: newLikes } }));

    if (dataSource !== "live" || isDemoPost(p.id)) return;

    togglePostLikeAction(p.id).then((r) => {
      if (r.error) {
        setLikeOverride((prev) => {
          const n = { ...prev };
          delete n[p.id];
          return n;
        });
        return;
      }
      // Keep override until refetch confirms the server state, then the effect above clears it.
      reload("posts");
    });
  };

  const onPickComposerImage = () => composerFileRef.current?.click();

  const onComposerImageChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(f.type)) {
      setError("Nur JPG, PNG, WebP oder GIF erlaubt.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError("Datei zu gross (max. 25 MB).");
      return;
    }
    setError(null);
    setComposerImage(f);
    setComposerImagePreview(URL.createObjectURL(f));
  };

  const resetComposer = () => {
    setComposerOpen(false);
    setDraft("");
    setComposerImage(null);
    if (composerImagePreview) URL.revokeObjectURL(composerImagePreview);
    setComposerImagePreview(null);
    setError(null);
  };

  const onPost = () => {
    const body = draft.trim();
    if (!body && !composerImage) return;
    setError(null);
    if (dataSource !== "live") {
      if (!me) return;
      setLocalPosts((prev) => [
        {
          id: "local-" + Date.now(),
          author: me,
          authorDbId: me.id,
          body,
          kind: "share",
          tag: "",
          meta: "",
          likes: 0,
          replies: 0,
          likedByMe: false,
          imageUrl: composerImagePreview ?? undefined,
          time: "gerade eben",
        },
        ...prev,
      ]);
      resetComposer();
      return;
    }
    startTransition(async () => {
      if (composerImage) {
        const fd = new FormData();
        fd.append("file", composerImage);
        fd.append("body", body);
        const r = await createPostWithImageAction(fd);
        if (r.error) { setError(r.error); return; }
      } else {
        const r = await createPostAction(body);
        if (r.error) { setError(r.error); return; }
      }
      resetComposer();
      reload("posts");
    });
  };

  const onDeletePost = async (p: Post) => {
    if (!confirm("Post wirklich löschen?")) return;
    if (dataSource !== "live" || isDemoPost(p.id)) {
      setLocalPosts((prev) => prev.filter((x) => x.id !== p.id));
      return;
    }
    const r = await deletePostAction(p.id);
    if (r.error) { alert(r.error); return; }
    reload("posts");
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="chip accent" style={{ marginBottom: 10 }}>Future feature · Beta</span>
          <h1 style={{ marginTop: 8 }}>Community Feed</h1>
          <div className="subtitle">
            Kurze Updates aus der Community — Deals, Events, Fragen.
          </div>
        </div>
        <button className="btn btn-accent" onClick={() => setComposerOpen(!composerOpen)}>
          <Icon name="plus" size={14} /> Post schreiben
        </button>
      </div>

      {composerOpen && me && (
        <div className="card" style={{ padding: 18, marginBottom: 18 }}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <Avatar first={me.first} last={me.last} color={me.color} size={40} url={me.avatarUrl} />
            <div style={{ flex: 1 }}>
              <textarea
                className="textarea"
                placeholder="Was gibts Neues?"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                style={{ minHeight: 80 }}
                autoFocus
              />
              {composerImagePreview && (
                <div style={{ position: "relative", marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={composerImagePreview}
                    alt="Vorschau"
                    style={{ display: "block", width: "100%", maxHeight: 360, objectFit: "cover" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setComposerImage(null);
                      if (composerImagePreview) URL.revokeObjectURL(composerImagePreview);
                      setComposerImagePreview(null);
                    }}
                    aria-label="Bild entfernen"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.65)",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              <input
                ref={composerFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onComposerImageChosen}
                style={{ display: "none" }}
              />
              {error && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onPickComposerImage}
                  disabled={pending}
                  style={{ padding: "6px 10px", fontSize: 12.5 }}
                >
                  <ImageIcon /> Bild
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" onClick={resetComposer}>
                    Abbrechen
                  </button>
                  <button className="btn btn-primary" onClick={onPost} disabled={pending || (!draft.trim() && !composerImage)}>
                    {pending ? "Posten..." : "Posten"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            trending.length >= 3 ? "minmax(0, 2fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
          gap: 18,
        }}
        className="dash-grid"
      >
        <div className="col" style={{ gap: 14 }}>
          {allPosts.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--ink-3)" }}>
              Noch keine Posts. Sei der Erste!
            </div>
          ) : (
            allPosts.map((p) => {
              const isLiked = liked(p);
              const count = likesNum(p);
              const replyCount = p.replies + (demoReplies[p.id]?.length ?? 0);
              const expanded = expandedPost === p.id;
              const editing = editingPost === p.id;
              const mine = isMyPost(p);
              return (
                <div key={p.id} className="card" style={{ padding: 20 }}>
                  <div className="row">
                    <Avatar first={p.author.first} last={p.author.last} color={p.author.color} size={44} url={p.author.avatarUrl} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{p.author.first} {p.author.last}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                        {p.author.role} · {p.author.company} · <span className="mono">{p.time}</span>
                        {p.editedAt && <span style={{ color: "var(--ink-4)" }}> · bearbeitet</span>}
                      </div>
                    </div>
                    {p.tag && <span className="chip accent">{p.tag}</span>}
                    {mine && !editing && (
                      <PostMenu
                        open={menuOpenFor === p.id}
                        onToggle={(e) => {
                          e.stopPropagation();
                          setMenuOpenFor(menuOpenFor === p.id ? null : p.id);
                        }}
                        onEdit={() => { setEditingPost(p.id); setMenuOpenFor(null); }}
                        onDelete={() => { setMenuOpenFor(null); onDeletePost(p); }}
                      />
                    )}
                  </div>

                  {editing ? (
                    <EditPostForm
                      post={p}
                      dataSource={dataSource}
                      onCancel={() => setEditingPost(null)}
                      onSavedLocal={(newBody) => {
                        setLocalPosts((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, body: newBody, editedAt: new Date().toISOString() } : x)),
                        );
                        setEditingPost(null);
                      }}
                      onSavedLive={() => {
                        setEditingPost(null);
                        reload("posts");
                      }}
                    />
                  ) : (
                    <>
                      <div className="serif" style={{ fontSize: 18, lineHeight: 1.4, marginTop: 14, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                        {p.body}
                      </div>
                      {p.imageUrl && (
                        <a
                          href={p.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: "block", marginTop: 14, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.imageUrl}
                            alt="Post"
                            style={{ display: "block", width: "100%", maxHeight: 520, objectFit: "cover" }}
                          />
                        </a>
                      )}
                      {p.meta && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 10 }} className="mono">↳ {p.meta}</div>}
                    </>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid var(--line)",
                      fontSize: 12,
                    }}
                  >
                    <button
                      className="btn-text"
                      onClick={() => onToggleLike(p)}
                      style={{
                        padding: 0,
                        fontSize: 12,
                        color: isLiked ? "var(--accent)" : "var(--ink-3)",
                        cursor: "pointer",
                        fontWeight: isLiked ? 500 : 400,
                        transition: "color 140ms ease",
                      }}
                    >
                      ↑ Interessant · {count}
                    </button>
                    <button
                      className="btn-text"
                      onClick={() => setExpandedPost(expanded ? null : p.id)}
                      style={{
                        padding: 0,
                        fontSize: 12,
                        color: expanded ? "var(--accent)" : "var(--ink-3)",
                        cursor: "pointer",
                      }}
                    >
                      Antworten · {replyCount}
                    </button>
                  </div>
                  {expanded && (
                    <RepliesSection
                      post={p}
                      me={me}
                      meDbId={meDbId}
                      dataSource={dataSource}
                      demoReplies={demoReplies[p.id] ?? []}
                      onDemoAdd={(r) =>
                        setDemoReplies((prev) => ({ ...prev, [p.id]: [...(prev[p.id] ?? []), r] }))
                      }
                      onDemoRemove={(id) =>
                        setDemoReplies((prev) => ({
                          ...prev,
                          [p.id]: (prev[p.id] ?? []).filter((r) => r.id !== id),
                        }))
                      }
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
        {trending.length >= 3 && (
          <div className="col" style={{ gap: 18 }}>
            <div className="card" style={{ padding: 20 }}>
              <div className="upper-label" style={{ marginBottom: 10 }}>Trending Themen</div>
              {trending.map((t, i) => (
                <div
                  key={t.label}
                  style={{
                    padding: "8px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}
                >
                  <span>#{t.label.toLowerCase().replace(/\s/g, "")}</span>
                  <span className="mono" style={{ color: "var(--ink-4)", fontSize: 11 }}>
                    {t.count} {t.count === 1 ? "post" : "posts"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PostMenu({
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Post-Menü"
        style={{
          width: 30,
          height: 30,
          border: "none",
          background: open ? "var(--bg-sunken)" : "transparent",
          borderRadius: 6,
          cursor: "pointer",
          color: "var(--ink-3)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ⋯
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 20,
            minWidth: 140,
            background: "var(--bg-elevated)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-lg)",
            padding: 4,
          }}
        >
          <button
            type="button"
            onClick={onEdit}
            role="menuitem"
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              borderRadius: 6,
              color: "var(--ink)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={onDelete}
            role="menuitem"
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              borderRadius: 6,
              color: "var(--danger)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Löschen
          </button>
        </div>
      )}
    </div>
  );
}

function EditPostForm({
  post,
  dataSource,
  onCancel,
  onSavedLocal,
  onSavedLive,
}: {
  post: Post;
  dataSource: "live" | "demo";
  onCancel: () => void;
  onSavedLocal: (body: string) => void;
  onSavedLive: () => void;
}) {
  const [body, setBody] = useState(post.body);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isLocal = post.id.startsWith("demo-") || post.id.startsWith("local-");

  const onSave = async () => {
    const trimmed = body.trim();
    if (!trimmed) { setErr("Post darf nicht leer sein."); return; }
    setErr(null);

    if (dataSource !== "live" || isLocal) {
      onSavedLocal(trimmed);
      return;
    }

    setSaving(true);
    try {
      const r = await updatePostAction(post.id, trimmed);
      if (r.error) { setErr(r.error); return; }
      onSavedLive();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      <textarea
        className="textarea"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{ minHeight: 80 }}
        autoFocus
      />
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>Abbrechen</button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving || !body.trim()}>
          {saving ? "Speichern..." : "Speichern"}
        </button>
      </div>
    </div>
  );
}

function RepliesSection({
  post,
  me,
  meDbId,
  dataSource,
  demoReplies,
  onDemoAdd,
  onDemoRemove,
}: {
  post: Post;
  me: ReturnType<typeof useMe>["data"];
  meDbId: string | null;
  dataSource: "live" | "demo";
  demoReplies: PostReply[];
  onDemoAdd: (r: PostReply) => void;
  onDemoRemove: (id: string) => void;
}) {
  const isDemoPost = post.id.startsWith("demo-") || post.id.startsWith("local-");
  const { data: liveReplies } = usePostReplies(dataSource === "live" && !isDemoPost ? post.id : null);
  const replies = dataSource === "live" && !isDemoPost ? liveReplies : demoReplies;

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || !me) return;
    setErr(null);

    if (dataSource !== "live" || isDemoPost) {
      onDemoAdd({
        id: "local-" + Date.now(),
        postId: post.id,
        author: me,
        authorDbId: meDbId ?? "me",
        body,
        createdAt: new Date().toISOString(),
      });
      setDraft("");
      return;
    }

    setSending(true);
    try {
      const r = await createReplyAction(post.id, body);
      if (r.error) { setErr(r.error); return; }
      setDraft("");
      reload("posts");
    } finally {
      setSending(false);
    }
  };

  const onDelete = async (r: PostReply) => {
    if (dataSource !== "live" || isDemoPost) {
      onDemoRemove(r.id);
      return;
    }
    const res = await deleteReplyAction(r.id);
    if (!res.error) reload("posts");
  };

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
      {replies.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 10 }}>
          Noch keine Antworten. Schreib die erste.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {replies.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Avatar first={r.author.first} last={r.author.last} color={r.author.color} size={30} url={r.author.avatarUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r.author.first} {r.author.last}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{formatReplyTime(r.createdAt)}</div>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {r.body}
                </div>
                {r.authorDbId === (meDbId ?? "me") && (
                  <button
                    className="btn-text"
                    onClick={() => onDelete(r)}
                    style={{ padding: 0, fontSize: 11, color: "var(--ink-4)", marginTop: 2, cursor: "pointer" }}
                  >
                    Löschen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {me && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Avatar first={me.first} last={me.last} color={me.color} size={30} url={me.avatarUrl} />
          <div style={{ flex: 1 }}>
            <input
              className="input"
              placeholder="Antworten..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { e.preventDefault(); onSend(); } }}
              disabled={sending}
            />
            {err && <div style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4 }}>{err}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                className="btn btn-primary"
                onClick={onSend}
                disabled={sending || !draft.trim()}
                style={{ padding: "6px 14px", fontSize: 12.5 }}
              >
                {sending ? "Senden..." : "Antworten"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatReplyTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "vor 1 Tag" : `vor ${days} Tagen`;
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
