// Server-only Guestoo API client. Cookie-basierte Auth — Guestoo bietet zwar
// einen offiziellen OAuth-/Token-Auth (Tarif-abhängig), aber für unseren BASIC-
// Tarif arbeiten wir vorerst mit den Session-Cookies einer eingeloggten Browser-
// Session. Cookies + XSRF-Token leben in .env.local und müssen rotiert werden,
// wenn die JSESSIONID abläuft (typisch ~7 Tage Idle).
//
// Endpoints (gegen https://app.guestoo.de):
//   POST /proxy/api/events/search                  → Events der Agency mit Stats
//   GET  /proxy/api/events/{id}                    → Event-Detail
//   POST /proxy/api/events/{id}/visitors/search    → Anmeldungen pro Event
//   GET  /proxy/api/dashboard                      → Aggregate für die Übersicht

const BASE = "https://app.guestoo.de";

export type GuestooEvent = {
  id: string;
  displayName: string;
  startDate: number;
  endDate: number | null;
  maxVisitor: number | null;
  visibility: string;
  eventType: string;
  status: string;
  archived: boolean | null;
  address: {
    locationName: string | null;
    street: string | null;
    streetNumber: string | null;
    postCode: string | null;
    city: string | null;
    country: string | null;
  } | null;
  image: { defaultImagePath: string | null } | null;
  statistic: {
    maxVisitor: number;
    freeSlots: number;
    sumConfirmedVisitor: number;
    sumPendingVisitor: number;
    sumDeclinedUserVisitor: number;
    sumOpenVisitor: number;
  } | null;
};

export type GuestooVisitor = {
  id: string;
  status: string; // CONFIRMED | OPEN | DECLINED | …
  visitorCount: number;
  confirmDate: number | null;
  registerDate: number | null;
  userAccount: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    email: string | null;
  };
};

function readAuth() {
  const cookieHeader = process.env.GUESTOO_COOKIE_HEADER;
  const xsrfToken = process.env.GUESTOO_XSRF_TOKEN;
  if (!cookieHeader || !xsrfToken) {
    throw new Error(
      "Guestoo-Credentials fehlen — GUESTOO_COOKIE_HEADER und GUESTOO_XSRF_TOKEN in .env.local setzen.",
    );
  }
  return { cookieHeader, xsrfToken };
}

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const auth = readAuth();
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "SportNexus/1.0 (server)",
      Cookie: auth.cookieHeader,
      Origin: BASE,
      Referer: `${BASE}/dashboard`,
      "X-XSRF-TOKEN": auth.xsrfToken,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    redirect: "manual",
    cache: "no-store",
  });
  // Wenn Guestoo uns nicht mehr eingeloggt sieht, kommt 302 → /auth/. fetch
  // mit redirect: manual liefert dann opaque-redirect / 0 — fangen wir ab.
  if (res.status === 0 || res.status === 302 || res.status === 401) {
    throw new Error("Guestoo-Session ungültig — Cookies erneuern.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Guestoo API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export async function searchGuestooEvents(opts?: { archived?: "HIDE_ARCHIVED" | "SHOW_ALL" }) {
  type Resp = { items: GuestooEvent[]; totalItems?: number };
  const body = {
    paging: { currentPage: 0, pages: [], perPage: 200, sort: "date" },
    tags: [],
    campaigns: [],
    visibilities: [],
    archivedFilter: opts?.archived ?? "HIDE_ARCHIVED",
  };
  const data = await call<Resp>("/proxy/api/events/search", { method: "POST", body });
  return data.items ?? [];
}

export async function getGuestooEvent(id: string) {
  return call<GuestooEvent>(`/proxy/api/events/${id}`);
}

export async function searchGuestooVisitors(
  eventId: string,
  opts?: { statuses?: string[]; perPage?: number },
) {
  type Resp = { items: GuestooVisitor[]; totalItems?: number };
  const body = {
    paging: { currentPage: 0, pages: [], perPage: opts?.perPage ?? 200, sort: "state" },
    status: opts?.statuses ?? ["CONFIRMED", "APPEARED", "OPEN", "ADDED", "INVITED"],
    trackingStatus: [],
    tags: [],
    campaigns: [],
    agreements: [],
    agreementMode: "INCLUDE",
    showPending: true,
    showVip: false,
    vipFilter: "WHATEVER",
    lotteryFilter: "WHATEVER",
    ticketCheckInFilter: "WHATEVER",
    waitinglistFilter: "BOTH",
    requireApprovalFilter: "BOTH",
    publicProfileFilter: "BOTH",
    showMailError: false,
    checkboxFieldValues: [],
    checkboxFilters: [],
    checkboxAccountFieldValues: [],
    checkboxAccountFilters: [],
    listFieldValues: [],
    smartFieldValues: [],
    smartFieldGroups: [],
    dynamicFieldValue: {},
    accountDynamicFieldValue: {},
    listAccountDynamicFieldValue: {},
    timeslotIds: [],
    timeslotGroups: [],
    ticketIds: [],
    searchWithoutOrder: false,
    checkinType: "WHATEVER",
    emailType: "WHATEVER",
    testFilter: "WHATEVER",
    searchTestDoiRequired: false,
    seatingAreaId: null,
    seatingRowId: null,
    seatingChairId: null,
    languages: [],
    groupByRegisterId: false,
  };
  const data = await call<Resp>(`/proxy/api/events/${eventId}/visitors/search`, { method: "POST", body });
  return data.items ?? [];
}
