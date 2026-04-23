"use client";

import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { reload, useMe, usePosts, usePostReplies, type Post, type PostReply } from "@/lib/hooks";
import { createPostAction, createReplyAction, deleteReplyAction, togglePostLikeAction } from "@/app/actions/posts";

export default function FeedPage() {
  const { dataSource } = useSettings();
  const { data: me, dbId: meDbId } = useMe();
  const { data: posts } = usePosts(meDbId);

  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Per-post optimistic overrides for the demo path and pre-server optimism.
  const [demoLiked, setDemoLiked] = useState<Record<string, boolean>>({});
  const [demoLikeDelta, setDemoLikeDelta] = useState<Record<string, number>>({});
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [demoReplies, setDemoReplies] = useState<Record<string, PostReply[]>>({});

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

  const likedByMe = (p: Post) => (p.id in demoLiked ? demoLiked[p.id] : p.likedByMe);
  const likeCount = (p: Post) => p.likes + (demoLikeDelta[p.id] ?? 0);

  const onToggleLike = (p: Post) => {
    const currentlyLiked = likedByMe(p);
    // Optimistic update
    setDemoLiked((d) => ({ ...d, [p.id]: !currentlyLiked }));
    setDemoLikeDelta((d) => ({ ...d, [p.id]: (d[p.id] ?? 0) + (currentlyLiked ? -1 : 1) }));

    if (dataSource !== "live" || isDemoPost(p.id)) return;

    togglePostLikeAction(p.id).then((r) => {
      if (r.error) {
        // Roll back
        setDemoLiked((d) => ({ ...d, [p.id]: currentlyLiked }));
        setDemoLikeDelta((d) => ({ ...d, [p.id]: (d[p.id] ?? 0) + (currentlyLiked ? 1 : -1) }));
        return;
      }
      // Server truth arrives via reload — clear our optimistic overrides for this post
      setDemoLiked((d) => {
        const n = { ...d };
        delete n[p.id];
        return n;
      });
      setDemoLikeDelta((d) => {
        const n = { ...d };
        delete n[p.id];
        return n;
      });
      reload("posts");
    });
  };

  const onPost = () => {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    if (dataSource !== "live") {
      if (!me) return;
      setLocalPosts((prev) => [
        {
          id: "local-" + Date.now(),
          author: me,
          body,
          kind: "share",
          tag: "",
          meta: "",
          likes: 0,
          replies: 0,
          likedByMe: false,
          time: "gerade eben",
        },
        ...prev,
      ]);
      setDraft("");
      setComposerOpen(false);
      return;
    }
    startTransition(async () => {
      const r = await createPostAction(body);
      if (r.error) setError(r.error);
      else {
        setDraft("");
        setComposerOpen(false);
        reload("posts");
      }
    });
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
              {error && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => { setComposerOpen(false); setDraft(""); }}>
                  Abbrechen
                </button>
                <button className="btn btn-primary" onClick={onPost} disabled={pending || !draft.trim()}>
                  {pending ? "Posten..." : "Posten"}
                </button>
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
              const liked = likedByMe(p);
              const count = likeCount(p);
              const replyCount = p.replies + (demoReplies[p.id]?.length ?? 0);
              const expanded = expandedPost === p.id;
              return (
                <div key={p.id} className="card" style={{ padding: 20 }}>
                  <div className="row">
                    <Avatar first={p.author.first} last={p.author.last} color={p.author.color} size={44} url={p.author.avatarUrl} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{p.author.first} {p.author.last}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                        {p.author.role} · {p.author.company} · <span className="mono">{p.time}</span>
                      </div>
                    </div>
                    {p.tag && <span className="chip accent">{p.tag}</span>}
                  </div>
                  <div className="serif" style={{ fontSize: 18, lineHeight: 1.4, marginTop: 14 }}>{p.body}</div>
                  {p.meta && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 10 }} className="mono">↳ {p.meta}</div>}
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
                        color: liked ? "var(--accent)" : "var(--ink-3)",
                        cursor: "pointer",
                        fontWeight: liked ? 500 : 400,
                      }}
                    >
                      {liked ? "↑ Interessant" : "↑ Interessant"} · {count}
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
