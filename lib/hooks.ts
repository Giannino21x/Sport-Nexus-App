"use client";

import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/settings-context";
import { createClient } from "@/lib/supabase/client";
import { EVENTS, MEMBERS, getMe, type Member, type SnEvent } from "@/lib/data";

// ---------- refetch bus ----------
// Lightweight pub/sub so server actions can trigger client-side re-fetches.
type ReloadKey = "posts" | "messages" | "notifications" | "members" | "events";
const listeners: Record<ReloadKey, Set<() => void>> = {
  posts: new Set(),
  messages: new Set(),
  notifications: new Set(),
  members: new Set(),
  events: new Set(),
};

export function reload(key: ReloadKey) {
  listeners[key].forEach((l) => l());
}

function useReloadTick(key: ReloadKey): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const l = () => setN((x) => x + 1);
    listeners[key].add(l);
    return () => { listeners[key].delete(l); };
  }, [key]);
  return n;
}

type Row = Record<string, unknown>;

// Repair UTF-8 bytes that were decoded as Latin-1 and then re-encoded as UTF-8
// (e.g. "Zürich" stored in the DB as "ZÃ¼rich"). Only rewrites strings that
// actually contain the mojibake markers Ã or Â, so this is safe as a no-op on
// already-correct data. Mirror of the migration's repair function on the
// server, so the app looks right even if the SQL repair hasn't run yet.
function repairMojibake(s: string): string {
  if (!s || !/[ÃÂ]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return s;
  }
}

const rm = (v: unknown): string => repairMojibake(String(v ?? ""));

function rowToMember(r: Row): Member {
  return {
    id: String(r.slug ?? r.id ?? ""),
    first: rm(r.first),
    last: rm(r.last),
    company: rm(r.company),
    role: rm(r.role),
    extra: rm(r.extra),
    branch: rm(r.branch),
    sub: rm(r.sub),
    work: rm(r.work),
    home: rm(r.home),
    offer: rm(r.offer),
    sports: Array.isArray(r.sports) ? (r.sports as string[]).map(repairMojibake) : [],
    search: rm(r.search),
    since: typeof r.since === "string" ? formatDate(r.since) : "",
    email: String(r.email ?? ""),
    mobile: String(r.mobile ?? ""),
    web: String(r.web ?? ""),
    bio: rm(r.bio),
    color: String(r.color ?? "#C7916A"),
    avatarUrl: r.avatar_url ? String(r.avatar_url) : undefined,
    linkedin: r.linkedin ? String(r.linkedin) : undefined,
  };
}

function formatDate(iso: string): string {
  // yyyy-mm-dd → dd.mm.yyyy (to match demo format)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

function rowToEvent(r: Row): SnEvent {
  return {
    id: String(r.id ?? ""),
    title: rm(r.title),
    subtitle: rm(r.subtitle),
    date: String(r.date ?? ""),
    time: rm(r.time),
    city: rm(r.city),
    venue: rm(r.venue),
    address: rm(r.address),
    guests: Number(r.guests ?? 0),
    status: r.status === "past" ? "past" : "upcoming",
    featured: Boolean(r.featured),
    desc: rm(r.description),
    img: String(r.image_url ?? ""),
    speakers: (r.speakers as SnEvent["speakers"]) ?? [],
    agenda: (r.agenda as SnEvent["agenda"]) ?? [],
    long: rm(r.long_description),
  };
}

export function useMembers() {
  const { dataSource, hydrated } = useSettings();
  const tick = useReloadTick("members");
  const [live, setLive] = useState<Member[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || dataSource !== "live") return;
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase.from("members").select("*").order("last", { ascending: true }).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) setLive([]);
      else setLive(data.map(rowToMember));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dataSource, hydrated, tick]);

  if (!hydrated || dataSource === "demo") return { data: MEMBERS, loading: false, isDemo: true };
  return { data: live ?? [], loading, isDemo: false };
}

export function useEvents() {
  const { dataSource, hydrated } = useSettings();
  const tick = useReloadTick("events");
  const [live, setLive] = useState<SnEvent[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || dataSource !== "live") return;
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setLive([]);
        else setLive(data.map(rowToEvent));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dataSource, hydrated, tick]);

  if (!hydrated || dataSource === "demo") return { data: EVENTS, loading: false, isDemo: true };
  return { data: live ?? [], loading, isDemo: false };
}

export function useMember(id: string) {
  const { data, loading, isDemo } = useMembers();
  const m = useMemo(() => data.find((x) => x.id === id) ?? null, [data, id]);
  return { data: m, loading, isDemo };
}

export function useEvent(id: string) {
  const { data, loading, isDemo } = useEvents();
  const ev = useMemo(() => data.find((x) => x.id === id) ?? null, [data, id]);
  return { data: ev, loading, isDemo };
}

export function useMe(): { data: Member | null; loading: boolean; isDemo: boolean; dbId: string | null } {
  const { dataSource, hydrated } = useSettings();
  const tick = useReloadTick("members");
  const [liveMember, setLiveMember] = useState<Member | null>(null);
  const [liveDbId, setLiveDbId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || dataSource !== "live") return;
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        setLiveMember(null);
        setLiveDbId(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("members").select("*").eq("auth_id", user.id).maybeSingle();
      if (cancelled) return;
      if (data) {
        setLiveMember(rowToMember(data));
        setLiveDbId(String(data.id));
      } else {
        setLiveMember(null);
        setLiveDbId(null);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dataSource, hydrated, tick]);

  if (!hydrated || dataSource === "demo") return { data: getMe(), loading: false, isDemo: true, dbId: null };
  return { data: liveMember, loading, isDemo: false, dbId: liveDbId };
}

export type Conversation = {
  other: Member;
  otherDbId: string;
  last: string;
  time: string;
  unread: number;
};

export function useConversations(meDbId: string | null) {
  const { dataSource, hydrated } = useSettings();
  const tick = useReloadTick("messages");
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || dataSource !== "live" || !meDbId) {
      setConvos([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    (async () => {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .or(`sender_id.eq.${meDbId},recipient_id.eq.${meDbId}`)
        .order("created_at", { ascending: false });
      if (cancelled || error || !messages) {
        if (!cancelled) {
          setConvos([]);
          setLoading(false);
        }
        return;
      }

      // Group by other participant
      type Agg = { otherDbId: string; last: string; time: string; unread: number };
      const byOther = new Map<string, Agg>();
      for (const m of messages) {
        const otherDbId = m.sender_id === meDbId ? m.recipient_id : m.sender_id;
        const existing = byOther.get(otherDbId);
        if (!existing) {
          byOther.set(otherDbId, {
            otherDbId,
            last: m.body,
            time: formatRelativeTime(m.created_at),
            unread: m.recipient_id === meDbId && !m.read_at ? 1 : 0,
          });
        } else if (m.recipient_id === meDbId && !m.read_at) {
          existing.unread += 1;
        }
      }

      const otherIds = Array.from(byOther.keys());
      if (otherIds.length === 0) {
        setConvos([]);
        setLoading(false);
        return;
      }
      const { data: others } = await supabase.from("members").select("*").in("id", otherIds);
      if (cancelled) return;

      const memberById = new Map((others ?? []).map((m) => [String(m.id), rowToMember(m)]));
      const result: Conversation[] = otherIds
        .map((dbId) => {
          const agg = byOther.get(dbId)!;
          const other = memberById.get(dbId);
          if (!other) return null;
          return { other, otherDbId: dbId, last: agg.last, time: agg.time, unread: agg.unread };
        })
        .filter((x): x is Conversation => x !== null);
      setConvos(result);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dataSource, hydrated, meDbId, tick]);

  return { data: convos, loading };
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `vor ${Math.max(mins, 1)} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "vor 1 Tag";
  if (days < 7) return `vor ${days} Tagen`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "vor 1 Woche" : `vor ${weeks} Wochen`;
}

export type ChatMessage = {
  id: string;
  senderDbId: string;
  recipientDbId: string;
  body: string;
  createdAt: string;
  attachmentUrl?: string;
};

export function useThreadMessages(meDbId: string | null, otherDbId: string | null) {
  const { dataSource, hydrated } = useSettings();
  const tick = useReloadTick("messages");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || dataSource !== "live" || !meDbId || !otherDbId) {
      setMsgs([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, created_at, attachment_url")
        .or(`and(sender_id.eq.${meDbId},recipient_id.eq.${otherDbId}),and(sender_id.eq.${otherDbId},recipient_id.eq.${meDbId})`)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMsgs(
        (data ?? []).map((r) => ({
          id: String(r.id),
          senderDbId: String(r.sender_id),
          recipientDbId: String(r.recipient_id),
          body: String(r.body),
          createdAt: String(r.created_at),
          attachmentUrl: r.attachment_url ? String(r.attachment_url) : undefined,
        })),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dataSource, hydrated, meDbId, otherDbId, tick]);

  return { data: msgs, loading };
}

export type Notif = {
  id: string;
  kind: string;
  title: string;
  preview: string;
  unread: boolean;
  time: string;
};

const DEMO_NOTIFS: Notif[] = [
  { id: "n1", kind: "users", title: "Marco Fischer hat dein Profil angesehen", preview: "", unread: true, time: "vor 12 Min." },
  { id: "n2", kind: "message", title: "Neue Nachricht von Sophie Meier", preview: "Hast du Zeit nächste Woche?", unread: true, time: "vor 2 Std." },
  { id: "n3", kind: "calendar", title: "Erinnerung: SportNexus Lunch Zürich", preview: "In 3 Tagen · Widder Hotel", unread: true, time: "heute" },
  { id: "n4", kind: "sparkle", title: "3 neue Matchmaking-Vorschläge", preview: "", unread: false, time: "gestern" },
  { id: "n5", kind: "trophy", title: "Joël Aebi ist der Community beigetreten", preview: "", unread: false, time: "vor 2 Tagen" },
];

export function useNotifications(meDbId: string | null) {
  const { dataSource, hydrated } = useSettings();
  const tick = useReloadTick("notifications");
  const [live, setLive] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || dataSource !== "live" || !meDbId) return;
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("*")
      .eq("member_id", meDbId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (cancelled) return;
        setLive(
          (data ?? []).map((r) => ({
            id: String(r.id),
            kind: String(r.kind),
            title: String(r.title),
            preview: String(r.preview ?? ""),
            unread: Boolean(r.unread),
            time: formatRelativeTime(String(r.created_at)),
          })),
        );
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dataSource, hydrated, meDbId, tick]);

  if (!hydrated || dataSource === "demo") return { data: DEMO_NOTIFS, loading: false, isDemo: true };
  return { data: live, loading, isDemo: false };
}

export type Post = {
  id: string;
  author: Member;
  body: string;
  kind: string;
  tag: string;
  meta: string;
  likes: number;
  replies: number;
  time: string;
};

const DEMO_POSTS_SEED = [
  { authorSlug: "marco-fischer", body: "Wir haben heute unseren neuen Wachstumsfonds geclosed — 120 Mio. für Schweizer KMU. Freue mich auf die ersten Deals.", kind: "deal", tag: "", meta: "Helvetia Partners · Fonds III", likes: 11, replies: 2, time: "vor 3 Std." },
  { authorSlug: "patricia-wyss", body: "Suche Series-A Lead-Investor für AI-Drug-Discovery. Ticket 5–10 Mio. Happy to connect — insbesondere mit Life-Science-Fokus.", kind: "search", tag: "Suche", meta: "", likes: 18, replies: 3, time: "vor 1 Tag" },
  { authorSlug: "reto-oberli", body: "Neue Podcast-Folge live: Alex Frei im Talk über Führung, Käse und Basel. Hört's euch an.", kind: "share", tag: "Podcast", meta: "", likes: 8, replies: 4, time: "vor 2 Tagen" },
  { authorSlug: "nina-schmid", body: "War ein fantastischer Lunch in Zürich — Danke an alle 70 Gäste! Nächstes Treffen: 12. Mai im Widder Hotel.", kind: "event", tag: "Event", meta: "", likes: 24, replies: 5, time: "vor 3 Tagen" },
];

export function usePosts(): { data: Post[]; loading: boolean; isDemo: boolean } {
  const { dataSource, hydrated } = useSettings();
  const tick = useReloadTick("posts");
  const [live, setLive] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || dataSource !== "live") return;
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    (async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("*, member:author_id(*)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      const result: Post[] = (posts ?? []).map((r: Row) => {
        const author = rowToMember((r.member as Row) ?? {});
        return {
          id: String(r.id),
          author,
          body: String(r.body),
          kind: String(r.kind ?? "share"),
          tag: String(r.tag ?? ""),
          meta: String(r.meta ?? ""),
          likes: Number(r.likes ?? 0),
          replies: Number(r.replies ?? 0),
          time: formatRelativeTime(String(r.created_at)),
        };
      });
      setLive(result);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dataSource, hydrated, tick]);

  if (!hydrated || dataSource === "demo") {
    const demo: Post[] = DEMO_POSTS_SEED.map((p, i) => {
      const author = MEMBERS.find((m) => m.id === p.authorSlug) ?? MEMBERS[0];
      return { id: `demo-${i}`, author, body: p.body, kind: p.kind, tag: p.tag, meta: p.meta, likes: p.likes, replies: p.replies, time: p.time };
    });
    return { data: demo, loading: false, isDemo: true };
  }
  return { data: live, loading, isDemo: false };
}
