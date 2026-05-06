import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const STORAGE = JSON.parse(readFileSync(".playwright-storage.json", "utf8"));
const OUT = join(process.cwd(), "scripts", "guestoo-out");
mkdirSync(OUT, { recursive: true });

const cookies = STORAGE.cookies
  .filter((c) => c.domain === "app.guestoo.de" && (c.path === "/" || c.path === ""))
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");
const xsrf = STORAGE.cookies.find((c) => c.name === "XSRF-TOKEN" && c.path === "/")?.value;

console.log("Cookies:", cookies.length, "Bytes");
console.log("XSRF:", xsrf?.slice(0, 12), "…");

const baseHeaders = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": "Mozilla/5.0",
  Cookie: cookies,
  ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
};

async function probe(path, method = "GET", body) {
  const url = `https://app.guestoo.de${path}`;
  const res = await fetch(url, {
    method,
    headers: { ...baseHeaders, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  const ct = res.headers.get("content-type") || "";
  return {
    path,
    status: res.status,
    contentType: ct,
    location: res.headers.get("location") ?? null,
    isHtml: /text\/html/.test(ct),
    isJson: /json/.test(ct),
    bodyPreview: text.slice(0, 600),
    bodyLength: text.length,
  };
}

// Endpoints aus dem JS-Bundle gegrept
const paths = [
  "/api/app/init",
  "/api/agency/eventDesign/templateVariables/search",
  "/api/events/autoCompleteList",
  "/api/user/",
  "/api/user/accounts",
  "/api/introduction",
  "/api/static/status",
  "/api/tags",
  "/api/campaigns",
  // Wahrscheinliche Event/Visitor-Endpoints
  "/api/event",
  "/api/event/list",
  "/api/event/search",
  "/api/agency/event",
  "/api/agency/event/list",
  "/api/agency/event/search",
  "/api/agency/events",
  "/api/agency/me",
  "/api/agency",
  "/api/visitor",
  "/api/visitors",
  "/api/guest",
  "/api/guests",
  "/api/event/visitors",
];

const results = [];
for (const p of paths) {
  try {
    const r = await probe(p);
    console.log(`${String(r.status).padStart(3)} ${r.contentType.padEnd(35).slice(0,35)} ${p}`);
    results.push(r);
  } catch (e) {
    results.push({ path: p, error: String(e).slice(0, 200) });
    console.log(`ERR ${p} ${String(e).slice(0,100)}`);
  }
}

writeFileSync(join(OUT, "api-probes-curl.json"), JSON.stringify(results, null, 2));
console.log(`→ ${OUT}/api-probes-curl.json`);
