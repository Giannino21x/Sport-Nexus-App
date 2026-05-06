import { readFileSync } from "node:fs";

const STORAGE = JSON.parse(readFileSync(".playwright-storage.json", "utf8"));
const cookies = STORAGE.cookies
  .filter((c) => c.domain === "app.guestoo.de" && (c.path === "/" || c.path === ""))
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");
const xsrf = STORAGE.cookies.find((c) => c.name === "XSRF-TOKEN" && c.path === "/")?.value;

// Wichtig: Im Browser sendet die SPA `Origin: https://app.guestoo.de` —
// und die Backend-Filter checken Referer/Origin. Lass uns das spiegeln.
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
  return { path, method: opts.method ?? "GET", status: res.status, contentType: ct, preview: text.slice(0, 800), full: text };
}

const eventId = "1f7fc1ce-c319-4320-9435-3fe070f574a7"; // 9. Lunch

// 1) Validierung: events/search funktioniert?
const ev = await call("/proxy/api/events/search", {
  method: "POST",
  body: { paging: { currentPage: 0, pages: [], perPage: 20, sort: "date" }, tags: [], campaigns: [], visibilities: [], archivedFilter: "HIDE_ARCHIVED" },
});
console.log(`events/search: ${ev.status} ${ev.contentType.slice(0, 30)}`);

// 2) Visitor-Endpoints durchprobieren
const visitorAttempts = [
  // Existieren laut 405 — andere Methoden ausprobieren
  { p: "/proxy/api/visitors/search", m: "GET" },
  { p: "/proxy/api/guest/search", m: "GET" },
  { p: "/proxy/api/visitors", m: "GET" },
  { p: "/proxy/api/guests", m: "GET" },
  { p: "/proxy/api/guests/search", m: "GET" },
  { p: "/proxy/api/guests/search", m: "POST", b: { paging: { currentPage: 0, perPage: 50 } } },
  { p: "/proxy/api/visitors/search", m: "PUT", b: { paging: { currentPage: 0, perPage: 50 }, events: [eventId] } },
  // Eventbezogen
  { p: `/proxy/api/event/${eventId}`, m: "GET" },
  { p: `/proxy/api/event/${eventId}/guest`, m: "GET" },
  { p: `/proxy/api/event/${eventId}/guests`, m: "GET" },
  { p: `/proxy/api/event/${eventId}/guest/search`, m: "POST", b: { paging: { currentPage: 0, perPage: 50 } } },
  { p: `/proxy/api/event/${eventId}/guests/search`, m: "POST", b: { paging: { currentPage: 0, perPage: 50 } } },
  { p: `/proxy/api/event/${eventId}/visitor/search`, m: "POST", b: { paging: { currentPage: 0, perPage: 50 } } },
  // Plurale Variante
  { p: `/proxy/api/events/${eventId}`, m: "GET" },
  { p: `/proxy/api/events/${eventId}/visitor/search`, m: "POST", b: { paging: { currentPage: 0, perPage: 50 } } },
  { p: `/proxy/api/events/${eventId}/guest/search`, m: "POST", b: { paging: { currentPage: 0, perPage: 50 } } },
];

for (const a of visitorAttempts) {
  const r = await call(a.p, { method: a.m, body: a.b });
  const ok = r.contentType.includes("json");
  const tag = ok ? "JSON" : "----";
  console.log(`${tag} ${String(r.status).padStart(3)} ${a.m.padEnd(4)} ${a.p}`);
  if (ok && r.full && r.full.length > 50) {
    console.log(`     preview: ${r.preview.slice(0, 200).replace(/\n/g, " ")}`);
  }
}
