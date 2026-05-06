import { readFileSync, writeFileSync } from "node:fs";

const STORAGE = JSON.parse(readFileSync(".playwright-storage.json", "utf8"));
const cookies = STORAGE.cookies
  .filter((c) => c.domain === "app.guestoo.de" && c.path === "/")
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");
const xsrf = STORAGE.cookies.find((c) => c.name === "XSRF-TOKEN" && c.path === "/")?.value;

const baseHeaders = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": "Mozilla/5.0",
  Cookie: cookies,
  Origin: "https://app.guestoo.de",
  Referer: "https://app.guestoo.de/dashboard",
  "X-XSRF-TOKEN": xsrf,
};

async function call(path, opts = {}) {
  const res = await fetch(`https://app.guestoo.de${path}`, {
    method: opts.method ?? "GET",
    headers: {
      ...baseHeaders,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  return { path, method: opts.method ?? "GET", status: res.status, contentType: ct, full: text };
}

const eventId = "1f7fc1ce-c319-4320-9435-3fe070f574a7";

// 1) Event-Detail komplett dumpen — vielleicht stehen Sub-URLs drin
const ev = await call(`/proxy/api/events/${eventId}`);
writeFileSync("scripts/guestoo-out/sample-event-detail.json", ev.full);
console.log(`event detail: ${ev.status} (${ev.full.length}c) → sample-event-detail.json`);

// 2) Visitors suchen — verschiedene Query-Variationen
const variants = [
  // GET mit Query
  { p: `/proxy/api/visitors/search?eventId=${eventId}`, m: "GET" },
  { p: `/proxy/api/visitors/search?eventIds=${eventId}`, m: "GET" },
  { p: `/proxy/api/visitors/search?event=${eventId}`, m: "GET" },
  { p: `/proxy/api/visitors/search?events=${eventId}`, m: "GET" },
  // POST mit Body — exakt wie events/search-Schema
  { p: "/proxy/api/visitors/search", m: "POST", b: { paging: { currentPage: 0, perPage: 50, sort: "lastName" }, eventIds: [eventId] } },
  { p: "/proxy/api/visitors/search", m: "POST", b: { paging: { currentPage: 0, perPage: 50, sort: "lastName" } } },
  { p: "/proxy/api/visitors/search", m: "POST", b: { events: [eventId], paging: { currentPage: 0, perPage: 50 } } },
  { p: "/proxy/api/visitors/search", m: "POST", b: { eventId, paging: { currentPage: 0, perPage: 50 } } },
  // Filter-Variante
  { p: "/proxy/api/visitors/search", m: "POST", b: { filter: { events: [eventId] }, paging: { currentPage: 0, perPage: 50 } } },
  // Visitor pro Event als Sub-Resource
  { p: `/proxy/api/events/${eventId}/visitor`, m: "GET" },
  { p: `/proxy/api/events/${eventId}/visitors`, m: "GET" },
  { p: `/proxy/api/events/${eventId}/registrations`, m: "GET" },
  { p: `/proxy/api/events/${eventId}/registration`, m: "GET" },
  // Plurale visitors als Sub-Resource per Event
  { p: `/proxy/api/event/${eventId}/visitors`, m: "GET" },
  // Nur eventId und visitorStatus
  { p: "/proxy/api/visitors/search", m: "POST", b: { eventIds: [eventId], visitorStatusFilter: ["CONFIRMED"] } },
];

for (const v of variants) {
  const r = await call(v.p, { method: v.m, body: v.b });
  const isJson = /json/.test(r.contentType);
  const isErr = !isJson || r.status >= 400;
  const pre = (r.full ?? "").slice(0, 200).replace(/\s+/g, " ");
  console.log(`${String(r.status).padStart(3)} ${v.m.padEnd(4)} ${v.p}`);
  if (!isErr) {
    console.log(`     ✓ JSON: ${pre.slice(0, 200)}`);
    writeFileSync(`scripts/guestoo-out/visitors-hit-${v.m}.json`, r.full);
  } else {
    console.log(`     err: ${pre.slice(0, 150)}`);
  }
}
