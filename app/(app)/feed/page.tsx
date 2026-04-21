"use client";

import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useSettings } from "@/components/settings-context";
import { reload, useMe, usePosts, type Post } from "@/lib/hooks";
import { createPostAction, likePostAction } from "@/app/actions/posts";

export default function FeedPage() {
  const { dataSource } = useSettings();
  const { data: me } = useMe();
  const { data: posts } = usePosts();

  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeDelta, setLikeDelta] = useState<Record<string, number>>({});

  const allPosts = [...localPosts, ...posts];

  // Derive trending topics from real post tags + hashtags in post bodies.
  // Only show when at least 3 distinct topics appear across posts.
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

  const onLike = (postId: string) => {
    if (likedIds.has(postId)) return; // one like per session per post
    setLikedIds((s) => new Set(s).add(postId));
    setLikeDelta((d) => ({ ...d, [postId]: (d[postId] ?? 0) + 1 }));
    if (dataSource !== "live" || postId.startsWith("local-") || postId.startsWith("demo-")) return;
    likePostAction(postId).then((r) => {
      if (r.error) {
        // roll back
        setLikedIds((s) => {
          const n = new Set(s);
          n.delete(postId);
          return n;
        });
        setLikeDelta((d) => ({ ...d, [postId]: Math.max(0, (d[postId] ?? 1) - 1) }));
      } else {
        reload("posts");
      }
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
            allPosts.map((p) => (
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
                    color: "var(--ink-3)",
                  }}
                >
                  <button
                    className="btn-text"
                    onClick={() => onLike(p.id)}
                    disabled={likedIds.has(p.id)}
                    style={{
                      padding: 0,
                      fontSize: 12,
                      color: likedIds.has(p.id) ? "var(--accent)" : "var(--ink-3)",
                      cursor: likedIds.has(p.id) ? "default" : "pointer",
                    }}
                  >
                    ↑ Interessant · {p.likes + (likeDelta[p.id] ?? 0)}
                  </button>
                  <span style={{ padding: 0, fontSize: 12, color: "var(--ink-4)" }}>
                    Antworten · {p.replies}
                  </span>
                </div>
              </div>
            ))
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
