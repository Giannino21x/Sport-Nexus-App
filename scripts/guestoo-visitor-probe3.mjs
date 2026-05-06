import { readFileSync, writeFileSync } from "node:fs";

const STORAGE = JSON.parse(readFileSync(".playwright-storage.json", "utf8"));
const cookies = STORAGE.cookies
  .filter((c) => c.domain === "app.guestoo.de" && c.path === "/")
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");
const xsrf = STORAGE.cookies.find((c) => c.name === "XSRF-TOKEN" && c.path === "/")?.value;

async function call(path, method = "GET", body) {
  const res = await fetch(`https://app.guestoo.de${path}`, {
    method,
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0",
      Cookie: cookies,
      Origin: "https://app.guestoo.de",
      Referer: "https://app.guestoo.de/dashboard",
      "X-XSRF-TOKEN": xsrf,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  return { status: res.status, ct: res.headers.get("content-type") || "", body: await res.text() };
}

const eventId = "1f7fc1ce-c319-4320-9435-3fe070f574a7";

// Erst: GET /proxy/api/visitors mit Query
const queries = [
  `?eventId=${eventId}`,
  `?eventIds=${eventId}`,
  `?event=${eventId}`,
  `?events=${eventId}`,
  `?eventId=${eventId}&perPage=50`,
  `?eventId=${eventId}&size=50`,
];
for (const q of queries) {
  const r = await call(`/proxy/api/visitors${q}`);
  const isJsonArray = r.body.trim().startsWith("[");
  console.log(`${String(r.status).padStart(3)} GET /proxy/api/visitors${q.padEnd(50)}  ${isJsonArray ? "ARR(" + (r.body.match(/^\[/)? "ok" : "") + ")" : "obj"}  ${r.body.slice(0, 100).replace(/\s+/g, ' ')}`);
}

// Dann: hole alle Visitors und schau, ob eventId-Felder dabei sind
const all = await call("/proxy/api/visitors");
if (all.status === 200 && all.body) {
  writeFileSync("scripts/guestoo-out/visitors-full.json", all.body);
  try {
    const arr = JSON.parse(all.body);
    console.log(`\n/proxy/api/visitors: ${arr.length} Visitors total`);
    if (arr[0]) {
      console.log("Keys:", Object.keys(arr[0]).join(", "));
      // Hat ein Visitor event-relevante Felder?
      const eventy = Object.keys(arr[0]).filter(k => /event/i.test(k));
      console.log("Event-keys:", eventy.join(", ") || "(none)");
      // Schau in die ersten 3 Visitors auf event-bezogenes Detail
      console.log("Sample visitor[0]:", JSON.stringify(arr[0]).slice(0, 600));
    }
  } catch (e) { console.log("parse fail:", e.message); }
}
