// E2E-Test: für jedes gemappte Event in Supabase die Guestoo-Visitors abfragen
// und einen Sanity-Check fahren.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => {
    const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)];
  }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function gApi(path, body) {
  const res = await fetch(`https://app.guestoo.de${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Accept: "application/json", "Content-Type": "application/json",
      Cookie: env.GUESTOO_COOKIE_HEADER, Origin: "https://app.guestoo.de",
      Referer: "https://app.guestoo.de/dashboard", "X-XSRF-TOKEN": env.GUESTOO_XSRF_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  return { status: res.status, body: await res.text() };
}

// 1. Auth-Sanity
const auth = await gApi("/proxy/api/agency/current");
console.log(`[auth] ${auth.status} agency/current — ${auth.status === 200 ? "OK" : "FAIL"}`);
if (auth.status !== 200) {
  console.log("Cookies abgelaufen oder ungültig. Ende.");
  process.exit(1);
}

const ag = JSON.parse(auth.body);
console.log(`     agency: ${ag.displayName} (${ag.id})`);

// 2. Events listen
const events = await gApi("/proxy/api/events/search", {
  paging: { currentPage: 0, perPage: 200, sort: "date" },
  archivedFilter: "HIDE_ARCHIVED",
});
const guestooEvents = JSON.parse(events.body).items;
console.log(`[search] ${events.status} events/search — ${guestooEvents.length} Events`);

// 3. Für jedes gemappte DB-Event: visitors fetchen
const { data: dbEvents } = await supabase
  .from("events")
  .select("id, title, date, guests, guestoo_id, status")
  .order("date", { ascending: true });

console.log("\n=== Per-Event Visitor-Check ===");
let totalConfirmed = 0, totalErrors = 0, totalMapped = 0;
for (const ev of dbEvents) {
  if (!ev.guestoo_id) {
    console.log(`  ${ev.date}  [no map]  ${ev.title}`);
    continue;
  }
  totalMapped++;
  const r = await gApi(`/proxy/api/events/${ev.guestoo_id}/visitors/search`, {
    paging: { currentPage: 0, perPage: 200, sort: "state" },
    status: ["CONFIRMED", "APPEARED", "OPEN", "ADDED", "INVITED"],
    trackingStatus: [], tags: [], campaigns: [], agreements: [], agreementMode: "INCLUDE",
    showPending: true, showVip: false, vipFilter: "WHATEVER", lotteryFilter: "WHATEVER",
    ticketCheckInFilter: "WHATEVER", waitinglistFilter: "BOTH", requireApprovalFilter: "BOTH",
    publicProfileFilter: "BOTH", showMailError: false,
    checkboxFieldValues: [], checkboxFilters: [], checkboxAccountFieldValues: [],
    checkboxAccountFilters: [], listFieldValues: [], smartFieldValues: [], smartFieldGroups: [],
    dynamicFieldValue: {}, accountDynamicFieldValue: {}, listAccountDynamicFieldValue: {},
    timeslotIds: [], timeslotGroups: [], ticketIds: [], searchWithoutOrder: false,
    checkinType: "WHATEVER", emailType: "WHATEVER", testFilter: "WHATEVER",
    searchTestDoiRequired: false, seatingAreaId: null, seatingRowId: null, seatingChairId: null,
    languages: [], groupByRegisterId: false,
  });
  if (r.status !== 200) {
    totalErrors++;
    console.log(`  ${ev.date}  ✗ HTTP ${r.status}  ${ev.title}`);
    continue;
  }
  const data = JSON.parse(r.body);
  const items = data.items ?? [];
  const confirmed = items.filter((x) => x.status === "CONFIRMED").length;
  totalConfirmed += confirmed;
  // Sanity-Checks
  const hasNames = items.every((x) => x.userAccount && (x.userAccount.firstName || x.userAccount.lastName));
  const hasEmail = items.every((x) => x.userAccount && x.userAccount.email);
  console.log(`  ${ev.date}  ✓ ${String(items.length).padStart(3)} items  (CONFIRMED: ${String(confirmed).padStart(3)})  ${ev.title}`);
  if (!hasNames) console.log(`            ⚠ einige Visitors ohne Namen`);
  if (!hasEmail) console.log(`            ⚠ einige Visitors ohne E-Mail`);
}

console.log(`\nTotal: ${totalMapped} mapped events, ${totalConfirmed} confirmed visitors, ${totalErrors} errors.`);
