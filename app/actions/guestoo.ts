"use server";

import { createClient } from "@/lib/supabase/server";
import { searchGuestooEvents, searchGuestooVisitors, type GuestooVisitor } from "@/lib/guestoo";
import { revalidatePath } from "next/cache";

export type EventAttendee = {
  guestooId: string;
  status: string;
  firstName: string;
  lastName: string;
  company: string | null;
  registeredAt: number | null;
};

function asAttendee(v: GuestooVisitor): EventAttendee {
  return {
    guestooId: v.id,
    status: v.status,
    firstName: v.userAccount.firstName ?? "",
    lastName: v.userAccount.lastName ?? "",
    company: v.userAccount.company,
    registeredAt: v.confirmDate ?? v.registerDate ?? null,
  };
}

export async function getEventAttendeesAction(
  guestooEventId: string,
): Promise<{ items?: EventAttendee[]; total?: number; error?: string }> {
  if (!guestooEventId) return { error: "Keine Guestoo-ID übergeben." };
  try {
    const visitors = await searchGuestooVisitors(guestooEventId, {
      statuses: ["CONFIRMED", "APPEARED"],
      perPage: 200,
    });
    const items = visitors.map(asAttendee);
    return { items, total: items.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// Holt für mehrere Events parallel die bestätigten Anmeldungen — wird im
// Dashboard verwendet, um neben dem Platz-Maximum die tatsächlichen
// Anmeldungszahlen aus Guestoo anzuzeigen. Fehler pro Event blockieren nicht
// den gesamten Aufruf, sondern werden zu null im Counts-Map.
export async function getEventAttendeeCountsAction(
  guestooEventIds: string[],
): Promise<{ counts: Record<string, number | null>; error?: string }> {
  const counts: Record<string, number | null> = {};
  if (guestooEventIds.length === 0) return { counts };
  const unique = Array.from(new Set(guestooEventIds.filter(Boolean)));
  await Promise.all(
    unique.map(async (id) => {
      try {
        const visitors = await searchGuestooVisitors(id, {
          statuses: ["CONFIRMED", "APPEARED"],
          perPage: 200,
        });
        counts[id] = visitors.length;
      } catch {
        counts[id] = null;
      }
    }),
  );
  return { counts };
}

// Adresse aus Guestoo-Struktur: "Street Nr, PLZ City".
type GuestooAddress = NonNullable<import("@/lib/guestoo").GuestooEvent["address"]>;
function formatGuestooAddress(a: GuestooAddress): string {
  const street = [a.street, a.streetNumber].filter(Boolean).join(" ").trim();
  const cityLine = [a.postCode, a.city].filter(Boolean).join(" ").trim();
  return [street, cityLine].filter(Boolean).join(", ").trim();
}

// Admin-Action: gleicht alle SportNexus-Events in Supabase mit Guestoo-Events ab.
// Match über Datum + Stadt + Titel-Heuristik. Wenn ein Match existiert:
//   - schreibt guestoo_id (sofern leer)
//   - überschreibt guests, address, venue mit den Guestoo-Werten (Source of Truth)
// Verhindert manuelle Drift zwischen unserer Anzeige und Guestoo.
export async function syncGuestooIdsAction(): Promise<{
  matched?: number;
  updated?: number;
  unmatched?: { id: string; title: string; date: string }[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };
  const { data: me } = await supabase.from("members").select("is_admin").eq("auth_id", user.id).maybeSingle();
  if (!me?.is_admin) return { error: "Keine Berechtigung." };

  let guestooEvents;
  try {
    guestooEvents = await searchGuestooEvents();
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }

  const { data: dbEvents } = await supabase
    .from("events")
    .select("id, title, subtitle, date, city, venue, address, guests, guestoo_id");
  if (!dbEvents) return { matched: 0, updated: 0, unmatched: [] };

  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9äöüß ]/g, " ").replace(/\s+/g, " ").trim();

  const unmatched: { id: string; title: string; date: string }[] = [];
  let matched = 0;
  let updated = 0;

  for (const ev of dbEvents) {
    const isoDate = String(ev.date);
    const evTitle = norm(`${ev.title ?? ""} ${ev.subtitle ?? ""}`);
    const evCity = norm(ev.city ?? "");

    // Wenn schon gemappt: das vorhandene Guestoo-Event holen, sonst matchen.
    const candidate = ev.guestoo_id
      ? guestooEvents.find((g) => g.id === ev.guestoo_id)
      : guestooEvents.find((g) => {
          const gDate = new Date(g.startDate).toISOString().slice(0, 10);
          if (gDate !== isoDate) return false;
          const gTitle = norm(g.displayName);
          if (evCity) {
            const inTitle = gTitle.includes(evCity);
            const inCity = norm(g.address?.city ?? "").includes(evCity);
            if (!inTitle && !inCity) return false;
          }
          const aWords = evTitle.split(" ").filter((w) => w.length > 3);
          const bWords = new Set(gTitle.split(" "));
          return aWords.filter((w) => bWords.has(w)).length >= 2;
        });

    if (!candidate) {
      if (!ev.guestoo_id) unmatched.push({ id: String(ev.id), title: String(ev.title ?? ""), date: isoDate });
      continue;
    }

    matched++;

    const updates: Record<string, unknown> = {};
    if (!ev.guestoo_id) updates.guestoo_id = candidate.id;
    if (typeof candidate.maxVisitor === "number" && candidate.maxVisitor !== ev.guests) {
      updates.guests = candidate.maxVisitor;
    }
    if (candidate.address) {
      const fullAddr = formatGuestooAddress(candidate.address);
      if (fullAddr && fullAddr !== ev.address) updates.address = fullAddr;
      const venue = candidate.address.locationName ?? null;
      if (venue && venue !== ev.venue) updates.venue = venue;
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("events").update(updates).eq("id", ev.id);
      if (!error) updated++;
    }
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { matched, updated, unmatched };
}
