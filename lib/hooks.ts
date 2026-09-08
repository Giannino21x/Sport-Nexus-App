"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSettings } from "@/components/settings-context";
import { createClient } from "@/lib/supabase/client";
import { EVENTS, ME_ID, MEMBERS, getMe, type Member, type SnEvent } from "@/lib/data";

/*
 * Daten-Schicht der App (Live-Modus).
 *
 * Vorher hielt jeder Hook seinen Zustand pro Mount: jeder Tab-Wechsel feuerte
 * die kompletten Supabase-Queries neu (members select * = 100 KB, events =
 * 220 KB), mappte alles neu und schrieb nach JEDER Antwort den ganzen Cache
 * synchron nach localStorage. Auf dem Handy waren das mehrere hundert
 * Millisekunden Main-Thread-Arbeit genau in dem Moment, in dem die neue Seite
 * erscheinen sollte — der Tab-Wechsel "hing".
 *
 * Jetzt gibt es EINEN modulweiten Store (SWR-Muster):
 *   - Jeder Datensatz lebt genau einmal, alle Hook-Instanzen lesen ihn über
 *     useSyncExternalStore (keine doppelten Fetches, keine doppelten Renders).
 *   - Ein Mount rendert sofort den bekannten Stand und revalidiert nur, wenn
 *     der Stand älter als seine TTL ist. reload(key) erzwingt den Refetch.
 *   - Der Store wird gebündelt und im Leerlauf (requestIdleCallback) nach
 *     localStorage gespiegelt — nie im kritischen Pfad einer Navigation.
 *   - Beim Kaltstart kommt der letzte Stand aus localStorage, die App steht
 *     sofort und holt sich Frisches leise im Hintergrund.
 */

// ---------- refetch bus ----------
// Server-Actions und UI rufen reload(key), um die zugehörigen Store-Einträge
// neu zu holen (gemountet) bzw. als veraltet zu markieren (nicht gemountet).
type ReloadKey = "posts" | "messages" | "notifications" | "members" | "events";
const listeners: Record<ReloadKey, Set<() => void>> = {
  posts: new Set(),
  messages: new Set(),
  notifications: new Set(),
  members: new Set(),
  events: new Set(),
};
const boundKeys: Record<ReloadKey, Set<string>> = {
  posts: new Set(),
  messages: new Set(),
  notifications: new Set(),
  members: new Set(),
  events: new Set(),
};

export function reload(key: ReloadKey) {
  listeners[key].forEach((l) => l());
  boundKeys[key].forEach((storeKey) => {
    if ((mountCounts.get(storeKey) ?? 0) > 0) void revalidate(storeKey, true);
    else setEntry(storeKey, { fetchedAt: 0 });
  });
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

// ---------- Store ----------
type Entry<T> = {
  data: T | null;
  fetchedAt: number; // 0 = nie geholt bzw. als veraltet markiert
  loading: boolean;
  error: boolean;
};
const EMPTY: Entry<never> = { data: null, fetchedAt: 0, loading: false, error: false };

const store = new Map<string, Entry<unknown>>();
const subscribers = new Map<string, Set<() => void>>();
const fetchers = new Map<string, () => Promise<unknown>>();
const ttls = new Map<string, number>();
const mountCounts = new Map<string, number>();
const inflight = new Map<string, Promise<void>>();
const persistedKeys = new Set<string>();

function getEntry<T>(key: string): Entry<T> {
  return (store.get(key) as Entry<T> | undefined) ?? (EMPTY as Entry<T>);
}

function setEntry<T>(key: string, patch: Partial<Entry<T>>) {
  const next = { ...getEntry<T>(key), ...patch };
  store.set(key, next);
  subscribers.get(key)?.forEach((cb) => cb());
  if ("data" in patch && persistedKeys.has(key)) schedulePersist();
}

function subscribe(key: string, cb: () => void) {
  let set = subscribers.get(key);
  if (!set) {
    set = new Set();
    subscribers.set(key, set);
  }
  set.add(cb);
  const s = set;
  return () => { s.delete(cb); };
}

function useEntry<T>(key: string): Entry<T> {
  const sub = useCallback((cb: () => void) => subscribe(key, cb), [key]);
  const get = useCallback(() => getEntry<T>(key), [key]);
  const getServer = useCallback(() => EMPTY as Entry<T>, []);
  return useSyncExternalStore(sub, get, getServer);
}

// Holt neu, wenn erzwungen oder älter als die TTL. Läuft pro Key höchstens
// einmal gleichzeitig; Fetcher liefern `undefined` für "Fehler, alten Stand
// behalten" (Netzwerkfehler ist kein leeres Verzeichnis).
function revalidate(key: string, force: boolean): Promise<void> {
  const fetcher = fetchers.get(key);
  if (!fetcher) return Promise.resolve();
  const running = inflight.get(key);
  if (running) return running;
  const entry = getEntry(key);
  const ttl = ttls.get(key) ?? 0;
  if (!force && entry.data !== null && Date.now() - entry.fetchedAt < ttl) return Promise.resolve();
  setEntry(key, { loading: true });
  const p = (async () => {
    try {
      const data = await fetcher();
      if (data === undefined) setEntry(key, { loading: false, error: true });
      else setEntry(key, { data, fetchedAt: Date.now(), loading: false, error: false });
    } catch {
      setEntry(key, { loading: false, error: true });
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

// Beim Zurückkehren in die App: alles Gemountete, das seine TTL überschritten
// hat, leise auffrischen.
function revalidateStale() {
  for (const [key, count] of mountCounts) {
    if (count > 0) void revalidate(key, false);
  }
}

function useResource<T>(
  key: string,
  enabled: boolean,
  ttl: number,
  reloadKey: ReloadKey | null,
  persist: boolean,
  fetcher: () => Promise<T | undefined>,
): Entry<T> {
  const entry = useEntry<T>(key);
  useEffect(() => {
    if (!enabled) return;
    fetchers.set(key, fetcher);
    ttls.set(key, ttl);
    if (persist) persistedKeys.add(key);
    if (reloadKey) boundKeys[reloadKey].add(key);
    mountCounts.set(key, (mountCounts.get(key) ?? 0) + 1);
    void revalidate(key, false);
    return () => {
      mountCounts.set(key, Math.max(0, (mountCounts.get(key) ?? 1) - 1));
    };
  }, [key, enabled, ttl, reloadKey, persist, fetcher]);
  return entry;
}

// TTLs: wie lange ein Mount den bekannten Stand ohne Refetch akzeptiert.
// Benachrichtigungen/Chats werden von useLiveRefresh ohnehin alle 60 s und bei
// jedem App-Resume erzwungen; Stammdaten ändern sich selten.
const TTL_STATIC = 5 * 60_000;
const TTL_LIVE = 60_000;
const TTL_THREAD = 30_000;

// ---------- Persistenz (localStorage, gebündelt, im Leerlauf) ----------
const CACHE_KEY = "sn_live_cache_v2";
type Persisted = Record<string, { data: unknown; fetchedAt: number }>;

(function hydrateFromStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("sn_live_cache_v1");
    const raw = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "{}") as Persisted;
    for (const [k, v] of Object.entries(raw)) {
      if (!v || typeof v !== "object" || !("data" in v) || v.data === null) continue;
      store.set(k, { data: v.data, fetchedAt: Number(v.fetchedAt) || 0, loading: false, error: false });
      persistedKeys.add(k);
    }
  } catch {
    // Kaputter Cache ist nur Beschleunigung, nie Wahrheit.
  }
})();

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (typeof window === "undefined" || persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const run = () => {
      const out: Persisted = {};
      for (const k of persistedKeys) {
        const e = store.get(k);
        if (!e || e.data === null) continue;
        // Ausgeloggt-Marker nie persistieren — sonst hielte der nächste Start
        // die Session fälschlich für geklärt (und bounct zum Login).
        if (k === "me" && !(e.data as MeData).loggedIn) continue;
        out[k] = { data: e.data, fetchedAt: e.fetchedAt };
      }
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(out));
      } catch {
        // Quota voll o.ä.
      }
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(run, { timeout: 2000 });
    else run();
  }, 400);
}

export function clearLiveCache() {
  const keys = Array.from(store.keys());
  store.clear();
  persistedKeys.clear();
  keys.forEach((k) => subscribers.get(k)?.forEach((cb) => cb()));
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CACHE_KEY);
      window.localStorage.removeItem("sn_live_cache_v1");
      // Auch die übrigen user-gebundenen Keys leeren — die Anmeldemarker
      // (lib/registrations.ts) und der Demo-Avatar würden sonst dem nächsten
      // User auf diesem Gerät angezeigt.
      window.localStorage.removeItem("sn_event_registrations");
      window.localStorage.removeItem("sn_demo_avatar");
      window.localStorage.removeItem("sn_guestoo_counts_v1");
    } catch {}
  }
}

// ---------- Live-Refresh ----------
// Es gibt (noch) keine Push-/Realtime-Verbindung: Badge und Chats waren nach
// dem App-Start eingefroren, bis man navigierte. Einmal in der AppShell
// gemountet, revalidiert dieser Hook Benachrichtigungen + Nachrichten beim
// Zurückkehren in die App (visibilitychange/focus — deckt auch das Resume der
// nativen Hülle ab) und alle 60 s, solange die App sichtbar ist. Beim Resume
// werden zusätzlich alle abgelaufenen Stammdaten (Members, Events, ich) still
// aufgefrischt.
export function useLiveRefresh(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const tickAll = () => {
      reload("notifications");
      reload("messages");
    };
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") tickAll();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      tickAll();
      revalidateStale();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled]);
}

// Demo-mode avatar persistence: hardcoded MEMBERS have no avatar, so we mirror
// the user's choice into localStorage and merge it back when reading.
export const DEMO_AVATAR_KEY = "sn_demo_avatar";

function readDemoAvatar(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DEMO_AVATAR_KEY);
  } catch {
    return null;
  }
}

export function writeDemoAvatar(dataUrl: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (dataUrl) window.localStorage.setItem(DEMO_AVATAR_KEY, dataUrl);
    else window.localStorage.removeItem(DEMO_AVATAR_KEY);
  } catch {
    // Quota — silently ignore; the in-memory state still shows the avatar
    // for the current session.
  }
}

function useDemoAvatar(): string | null {
  const tick = useReloadTick("members");
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(readDemoAvatar());
  }, [tick]);
  return url;
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
    dbId: r.id ? String(r.id) : undefined,
    isAdmin: Boolean(r.is_admin),
    first: rm(r.first),
    last: rm(r.last),
    company: rm(r.company),
    role: rm(r.role),
    extra: rm(r.extra),
    additional: rm(r.additional_roles),
    branch: rm(r.branch),
    sub: rm(r.sub),
    branch2: rm(r.branch2),
    work: rm(r.work),
    home: rm(r.home),
    offer: rm(r.offer),
    sports: Array.isArray(r.sports) ? (r.sports as string[]).map(repairMojibake) : [],
    search: rm(r.search),
    since: typeof r.since === "string" ? formatDate(r.since) : "",
    dateOfBirth: typeof r.date_of_birth === "string" ? formatDate(r.date_of_birth) : "",
    email: String(r.email ?? ""),
    mobile: String(r.mobile ?? ""),
    web: String(r.web ?? ""),
    bio: rm(r.bio),
    color: String(r.color ?? "#C7916A"),
    avatarUrl: r.avatar_url ? String(r.avatar_url) : undefined,
    linkedin: r.linkedin ? String(r.linkedin) : undefined,
    showMobile: r.show_mobile == null ? true : Boolean(r.show_mobile),
    showEmail: r.show_email == null ? true : Boolean(r.show_email),
    matchmaking: r.matchmaking == null ? true : Boolean(r.matchmaking),
  };
}

function formatDate(iso: string): string {
  // yyyy-mm-dd → dd.mm.yyyy (to match demo format)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

// Demo-Daten haben hardcoded status — wir leiten ihn dynamisch aus dem Datum
// ab, damit Events nach Ablauf nicht weiter als "upcoming" gezeigt werden.
// Einmal pro Modul-Lifecycle berechnet (statt jedes Render), das hält die
// Hook-Returns stabil & render-pure.
const _demoNow = Date.now();
const DEMO_EVENTS: SnEvent[] = EVENTS.map((e) => {
  const end = e.date ? new Date(e.date + "T23:59:59").getTime() : 0;
  const status: SnEvent["status"] = end && end < _demoNow ? "past" : "upcoming";
  return status === e.status ? e : { ...e, status };
});

function rowToEvent(r: Row): SnEvent {
  const dateStr = String(r.date ?? "");
  // Status dynamisch aus Datum ableiten — der DB-Wert wird nur einmal bei
  // Event-Anlage gesetzt und altert nicht mit. Pascal sah deshalb vergangene
  // Events im Native-Tab unter "Upcoming". Wir nehmen Tagesende 23:59:59 lokal
  // damit ein Event nicht mittags am Event-Tag schon "past" wird.
  const eventEnd = dateStr ? new Date(dateStr + "T23:59:59").getTime() : 0;
  const status: SnEvent["status"] = eventEnd && eventEnd < Date.now() ? "past" : "upcoming";
  return {
    id: String(r.id ?? ""),
    title: rm(r.title),
    subtitle: rm(r.subtitle),
    date: dateStr,
    time: rm(r.time),
    city: rm(r.city),
    venue: rm(r.venue),
    address: rm(r.address),
    guests: Number(r.guests ?? 0),
    attendeeCount: Array.isArray(r.attendees) ? (r.attendees as unknown[]).length : undefined,
    status,
    featured: Boolean(r.featured),
    desc: rm(r.description),
    img: String(r.image_url ?? ""),
    speakers: (r.speakers as SnEvent["speakers"]) ?? [],
    agenda: (r.agenda as SnEvent["agenda"]) ?? [],
    long: rm(r.long_description),
    guestooId: r.guestoo_id ? String(r.guestoo_id) : undefined,
    galleryUrl: r.gallery_url ? String(r.gallery_url) : undefined,
    galleryPassword: r.gallery_password ? String(r.gallery_password) : undefined,
  };
}

// ---------- Fetcher (modulweit, stabil) ----------
async function fetchMembers(): Promise<Member[] | undefined> {
  const { data, error } = await createClient().from("members").select("*").order("last", { ascending: true });
  if (error || !data) return undefined;
  return data.map(rowToMember);
}

async function fetchEvents(): Promise<SnEvent[] | undefined> {
  const { data, error } = await createClient().from("events").select("*").order("date", { ascending: true });
  if (error || !data) return undefined;
  return data.map(rowToEvent);
}

type MeData = { loggedIn: boolean; member: Member | null; dbId: string | null };

async function fetchMe(): Promise<MeData> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Ausgeloggt: kompletten Cache leeren, damit beim nächsten Login (evtl.
    // anderer User) keine fremden Daten aufblitzen.
    clearLiveCache();
    return { loggedIn: false, member: null, dbId: null };
  }
  const { data } = await supabase.from("members").select("*").eq("auth_id", user.id).maybeSingle();
  const row = (data as Row | null) ?? null;
  if (!row) return { loggedIn: true, member: null, dbId: null };
  return { loggedIn: true, member: rowToMember(row), dbId: String(row.id) };
}

const EMPTY_MEMBERS: Member[] = [];
const EMPTY_EVENTS: SnEvent[] = [];

export function useMembers() {
  const { dataSource, hydrated } = useSettings();
  const live = hydrated && dataSource === "live";
  const entry = useResource<Member[]>("members", live, TTL_STATIC, "members", true, fetchMembers);

  const demoAvatar = useDemoAvatar();
  if (!live) {
    const merged = demoAvatar
      ? MEMBERS.map((m) => (m.id === ME_ID ? { ...m, avatarUrl: demoAvatar } : m))
      : MEMBERS;
    return { data: merged, loading: false, isDemo: true, resolved: true, error: false };
  }
  // resolved = mindestens einmal Daten da (frisch oder aus dem Cache) —
  // UI kann damit "–" statt einer falschen 0 zeigen, ohne bei stiller
  // Hintergrund-Revalidierung (loading) erneut zu flackern.
  return {
    data: entry.data ?? EMPTY_MEMBERS,
    loading: entry.loading,
    isDemo: false,
    resolved: entry.data !== null,
    error: entry.error && entry.data === null,
  };
}

export function useEvents() {
  const { dataSource, hydrated } = useSettings();
  const live = hydrated && dataSource === "live";
  const entry = useResource<SnEvent[]>("events", live, TTL_STATIC, "events", true, fetchEvents);

  if (!live) return { data: DEMO_EVENTS, loading: false, isDemo: true, resolved: true, error: false };
  return {
    data: entry.data ?? EMPTY_EVENTS,
    loading: entry.loading,
    isDemo: false,
    resolved: entry.data !== null,
    error: entry.error && entry.data === null,
  };
}

export function useMember(id: string) {
  const { data, loading, isDemo, resolved } = useMembers();
  const m = useMemo(() => data.find((x) => x.id === id) ?? null, [data, id]);
  // resolved: erst wenn mindestens einmal Daten da sind, darf die UI
  // "nicht gefunden" zeigen — vorher Skeleton (kein Flash).
  return { data: m, loading, isDemo, resolved };
}

export function useEvent(id: string) {
  const { data, loading, isDemo, resolved } = useEvents();
  const ev = useMemo(() => data.find((x) => x.id === id) ?? null, [data, id]);
  return { data: ev, loading, isDemo, resolved };
}

export function useMe(): { data: Member | null; loading: boolean; isDemo: boolean; dbId: string | null; resolved: boolean } {
  const { dataSource, hydrated } = useSettings();
  const live = hydrated && dataSource === "live";
  // Profil-Änderungen laufen über reload("members") — deshalb hängt "ich" am
  // members-Bus.
  const entry = useResource<MeData>("me", live, TTL_STATIC, "members", true, fetchMe);
  // Ein Ausgeloggt-Ergebnis zählt nur für Hook-Instanzen, die VOR der Antwort
  // gemountet waren. Nach dem Login (Server-Action + Soft-Redirect) mounten
  // neue Instanzen — die dürfen den alten Marker nicht als "geklärt" lesen,
  // sonst bounct die Shell sofort wieder zum Login.
  const [mountedAt] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const e = getEntry<MeData>("me");
    if (e.data && !e.data.loggedIn) void revalidate("me", true);
  }, [live]);

  const demoAvatar = useDemoAvatar();
  if (!live) {
    const me = getMe();
    return {
      data: demoAvatar ? { ...me, avatarUrl: demoAvatar } : me,
      loading: false,
      isDemo: true,
      dbId: null,
      // Vor der Hydration ist die Session ungeklärt — Shell zeigt Splash.
      resolved: hydrated,
    };
  }
  const d = entry.data;
  const resolved = d !== null && (d.loggedIn || entry.fetchedAt >= mountedAt);
  return {
    data: resolved && d ? d.member : null,
    loading: entry.loading,
    isDemo: false,
    dbId: resolved && d ? d.dbId : null,
    resolved,
  };
}

export type Conversation = {
  other: Member;
  otherDbId: string;
  last: string;
  time: string;
  unread: number;
};

async function fetchConversations(meDbId: string): Promise<Conversation[] | undefined> {
  const supabase = createClient();
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, body, read_at, created_at")
    .or(`sender_id.eq.${meDbId},recipient_id.eq.${meDbId}`)
    .order("created_at", { ascending: false });
  if (error || !messages) return undefined;

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
  if (otherIds.length === 0) return [];

  // Gesprächspartner aus dem Members-Store — der ist praktisch immer schon da.
  // Nur wirklich Unbekannte werden nachgeladen (spart den zweiten Roundtrip).
  const known = new Map<string, Member>();
  for (const m of getEntry<Member[]>("members").data ?? []) if (m.dbId) known.set(m.dbId, m);
  const missing = otherIds.filter((id) => !known.has(id));
  if (missing.length > 0) {
    const { data: others } = await supabase.from("members").select("*").in("id", missing);
    for (const r of others ?? []) known.set(String(r.id), rowToMember(r));
  }
  return otherIds
    .map((dbId) => {
      const agg = byOther.get(dbId)!;
      const other = known.get(dbId);
      if (!other) return null;
      return { other, otherDbId: dbId, last: agg.last, time: agg.time, unread: agg.unread };
    })
    .filter((x): x is Conversation => x !== null);
}

const EMPTY_CONVOS: Conversation[] = [];

export function useConversations(meDbId: string | null) {
  const { dataSource, hydrated } = useSettings();
  const live = hydrated && dataSource === "live" && Boolean(meDbId);
  const fetcher = useCallback(() => fetchConversations(meDbId ?? ""), [meDbId]);
  const entry = useResource<Conversation[]>(`conversations:${meDbId}`, live, TTL_LIVE, "messages", true, fetcher);
  // resolved = mindestens einmal Daten für DIESEN User da (frisch oder Cache).
  // Solange false, zeigt die UI Skeletons statt "Keine Konversationen".
  if (!live) return { data: EMPTY_CONVOS, loading: false, resolved: false };
  return { data: entry.data ?? EMPTY_CONVOS, loading: entry.loading, resolved: entry.data !== null };
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
  if (weeks <= 4) return weeks === 1 ? "vor 1 Woche" : `vor ${weeks} Wochen`;
  // Ab ~1 Monat absolutes Datum — "vor 78 Wochen" hilft niemandem.
  return new Date(iso).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });
}

export type ChatMessage = {
  id: string;
  senderDbId: string;
  recipientDbId: string;
  body: string;
  createdAt: string;
  attachmentUrl?: string;
  readAt?: string | null;
};

async function fetchThread(meDbId: string, otherDbId: string): Promise<ChatMessage[] | undefined> {
  const { data, error } = await createClient()
    .from("messages")
    .select("id, sender_id, recipient_id, body, created_at, attachment_url, read_at")
    .or(`and(sender_id.eq.${meDbId},recipient_id.eq.${otherDbId}),and(sender_id.eq.${otherDbId},recipient_id.eq.${meDbId})`)
    .order("created_at", { ascending: true });
  if (error) return undefined;
  return (data ?? []).map((r) => ({
    id: String(r.id),
    senderDbId: String(r.sender_id),
    recipientDbId: String(r.recipient_id),
    body: String(r.body),
    createdAt: String(r.created_at),
    attachmentUrl: r.attachment_url ? String(r.attachment_url) : undefined,
    readAt: r.read_at ? String(r.read_at) : null,
  }));
}

const EMPTY_MSGS: ChatMessage[] = [];

// Threads bleiben im Store: ein schon geöffneter Chat steht beim nächsten
// Antippen sofort und holt Neues leise nach.
export function useThreadMessages(meDbId: string | null, otherDbId: string | null) {
  const { dataSource, hydrated } = useSettings();
  const live = hydrated && dataSource === "live" && Boolean(meDbId) && Boolean(otherDbId);
  const fetcher = useCallback(() => fetchThread(meDbId ?? "", otherDbId ?? ""), [meDbId, otherDbId]);
  const entry = useResource<ChatMessage[]>(`thread:${meDbId}:${otherDbId}`, live, TTL_THREAD, "messages", false, fetcher);
  // resolved = erste Antwort für den AKTUELLEN Thread da — die UI zeigt bis
  // dahin Skeleton-Bubbles statt "Noch keine Nachrichten".
  if (!live) return { data: EMPTY_MSGS, loading: false, resolved: false };
  return { data: entry.data ?? EMPTY_MSGS, loading: entry.loading, resolved: entry.data !== null };
}

export type Notif = {
  id: string;
  kind: string;
  title: string;
  preview: string;
  unread: boolean;
  time: string;
  link: string;
};

const DEMO_NOTIFS: Notif[] = [
  { id: "n1", kind: "users", title: "Marco Fischer hat dein Profil angesehen", preview: "", unread: true, time: "vor 12 Min.", link: "" },
  { id: "n2", kind: "message", title: "Neue Nachricht von Sophie Meier", preview: "Hast du Zeit nächste Woche?", unread: true, time: "vor 2 Std.", link: "/messages" },
  { id: "n3", kind: "calendar", title: "Erinnerung: SportNexus Lunch Zürich", preview: "In 3 Tagen · Widder Hotel", unread: true, time: "heute", link: "/events" },
  { id: "n4", kind: "sparkle", title: "3 neue Matchmaking-Vorschläge", preview: "", unread: false, time: "gestern", link: "" },
  { id: "n5", kind: "trophy", title: "Joël Aebi ist der Community beigetreten", preview: "", unread: false, time: "vor 2 Tagen", link: "" },
];

async function fetchNotifications(meDbId: string): Promise<Notif[] | undefined> {
  const { data, error } = await createClient()
    .from("notifications")
    .select("*")
    .eq("member_id", meDbId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data) return undefined;
  return data.map((r) => ({
    id: String(r.id),
    kind: String(r.kind),
    title: String(r.title),
    preview: String(r.preview ?? ""),
    unread: Boolean(r.unread),
    time: formatRelativeTime(String(r.created_at)),
    link: r.link ? String(r.link) : "",
  }));
}

const EMPTY_NOTIFS: Notif[] = [];

// Optimistisch: alle Benachrichtigungen dieses Users sofort als gelesen
// zeigen (Badge weg), bevor der Server geantwortet hat. Der anschliessende
// reload("notifications") holt dann die Server-Wahrheit.
export function markNotificationsReadLocally(meDbId: string | null) {
  if (!meDbId) return;
  const key = `notifications:${meDbId}`;
  const cur = getEntry<Notif[]>(key).data;
  if (!cur || !cur.some((n) => n.unread)) return;
  setEntry(key, { data: cur.map((n) => (n.unread ? { ...n, unread: false } : n)) });
}

export function useNotifications(meDbId: string | null) {
  const { dataSource, hydrated } = useSettings();
  const live = hydrated && dataSource === "live" && Boolean(meDbId);
  const fetcher = useCallback(() => fetchNotifications(meDbId ?? ""), [meDbId]);
  const entry = useResource<Notif[]>(`notifications:${meDbId}`, live, TTL_LIVE, "notifications", true, fetcher);

  if (!hydrated || dataSource === "demo") return { data: DEMO_NOTIFS, loading: false, isDemo: true };
  return { data: entry.data ?? EMPTY_NOTIFS, loading: entry.loading, isDemo: false };
}

export type Post = {
  id: string;
  author: Member;
  authorDbId: string;
  body: string;
  kind: string;
  tag: string;
  meta: string;
  likes: number;
  replies: number;
  likedByMe: boolean;
  imageUrl?: string;
  editedAt?: string;
  time: string;
};

export type PostReply = {
  id: string;
  postId: string;
  author: Member;
  authorDbId: string;
  body: string;
  createdAt: string;
};

const DEMO_POSTS_SEED = [
  { authorSlug: "marco-fischer", body: "Wir haben heute unseren neuen Wachstumsfonds geclosed — 120 Mio. für Schweizer KMU. Freue mich auf die ersten Deals.", kind: "deal", tag: "", meta: "Helvetia Partners · Fonds III", likes: 11, replies: 2, time: "vor 3 Std." },
  { authorSlug: "patricia-wyss", body: "Suche Series-A Lead-Investor für AI-Drug-Discovery. Ticket 5–10 Mio. Happy to connect — insbesondere mit Life-Science-Fokus.", kind: "search", tag: "Suche", meta: "", likes: 18, replies: 3, time: "vor 1 Tag" },
  { authorSlug: "reto-oberli", body: "Neue Podcast-Folge live: Alex Frei im Talk über Führung, Käse und Basel. Hört's euch an.", kind: "share", tag: "Podcast", meta: "", likes: 8, replies: 4, time: "vor 2 Tagen" },
  { authorSlug: "nina-schmid", body: "War ein fantastischer Lunch in Zürich — Danke an alle 70 Gäste! Nächstes Treffen: 12. Mai im Widder Hotel.", kind: "event", tag: "Event", meta: "", likes: 24, replies: 5, time: "vor 3 Tagen" },
];

const DEMO_POSTS: Post[] = DEMO_POSTS_SEED.map((p, i) => {
  const author = MEMBERS.find((m) => m.id === p.authorSlug) ?? MEMBERS[0];
  return { id: `demo-${i}`, author, authorDbId: author.id, body: p.body, kind: p.kind, tag: p.tag, meta: p.meta, likes: p.likes, replies: p.replies, likedByMe: false, time: p.time };
});

async function fetchPosts(meDbId: string | null): Promise<Post[] | undefined> {
  const supabase = createClient();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, member:author_id(*)")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return undefined;
  const postList = posts ?? [];

  // Which of these did the current user like?
  let likedSet = new Set<string>();
  if (meDbId && postList.length > 0) {
    const ids = postList.map((p) => String((p as Row).id));
    const { data: myLikes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("member_id", meDbId)
      .in("post_id", ids);
    likedSet = new Set((myLikes ?? []).map((r) => String((r as Row).post_id)));
  }

  return postList.map((r: Row) => {
    const author = rowToMember((r.member as Row) ?? {});
    const id = String(r.id);
    return {
      id,
      author,
      authorDbId: String(r.author_id ?? ""),
      body: String(r.body),
      kind: String(r.kind ?? "share"),
      tag: String(r.tag ?? ""),
      meta: String(r.meta ?? ""),
      likes: Number(r.likes ?? 0),
      replies: Number(r.replies ?? 0),
      likedByMe: likedSet.has(id),
      imageUrl: r.image_url ? String(r.image_url) : undefined,
      editedAt: r.edited_at ? String(r.edited_at) : undefined,
      time: formatRelativeTime(String(r.created_at)),
    };
  });
}

const EMPTY_POSTS: Post[] = [];

export function usePosts(meDbId: string | null = null): { data: Post[]; loading: boolean; isDemo: boolean } {
  const { dataSource, hydrated } = useSettings();
  const live = hydrated && dataSource === "live";
  const fetcher = useCallback(() => fetchPosts(meDbId), [meDbId]);
  const entry = useResource<Post[]>(`posts:${meDbId}`, live, TTL_LIVE, "posts", false, fetcher);

  if (!live) return { data: DEMO_POSTS, loading: false, isDemo: true };
  return { data: entry.data ?? EMPTY_POSTS, loading: entry.loading, isDemo: false };
}

async function fetchReplies(postId: string): Promise<PostReply[] | undefined> {
  const { data, error } = await createClient()
    .from("post_replies")
    .select("*, member:author_id(*)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) return undefined;
  return (data ?? []).map((r: Row) => ({
    id: String(r.id),
    postId: String(r.post_id),
    author: rowToMember((r.member as Row) ?? {}),
    authorDbId: String(r.author_id),
    body: rm(r.body),
    createdAt: String(r.created_at),
  }));
}

const EMPTY_REPLIES: PostReply[] = [];

export function usePostReplies(postId: string | null): { data: PostReply[]; loading: boolean } {
  const { dataSource, hydrated } = useSettings();
  const live =
    hydrated && dataSource === "live" && Boolean(postId) &&
    !postId!.startsWith("demo-") && !postId!.startsWith("local-");
  const fetcher = useCallback(() => fetchReplies(postId ?? ""), [postId]);
  const entry = useResource<PostReply[]>(`replies:${postId}`, live, TTL_LIVE, "posts", false, fetcher);

  if (!live) return { data: EMPTY_REPLIES, loading: false };
  return { data: entry.data ?? EMPTY_REPLIES, loading: entry.loading };
}
