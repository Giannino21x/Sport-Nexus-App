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

// Admin-Action: gleicht alle SportNexus-Events in Supabase mit Guestoo-Events ab,
// matched über Datum + Titel-Heuristik, und schreibt die Guestoo-UUID in die
// `events.guestoo_id`-Spalte. Ein Einmal-Bootstrap für die schon vorhandenen
// Seed-Events; danach würden neu erstellte Events gleich mit Guestoo-ID
// angelegt werden.
export async function syncGuestooIdsAction(): Promise<{
  matched?: number;
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
    .select("id, title, subtitle, date, city, guestoo_id");
  if (!dbEvents) return { matched: 0, unmatched: [] };

  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9äöüß ]/g, " ").replace(/\s+/g, " ").trim();

  const unmatched: { id: string; title: string; date: string }[] = [];
  let matched = 0;

  for (const ev of dbEvents) {
    if (ev.guestoo_id) continue;

    const isoDate = String(ev.date);
    const evTitle = norm(`${ev.title ?? ""} ${ev.subtitle ?? ""}`);
    const evCity = norm(ev.city ?? "");

    const candidate = guestooEvents.find((g) => {
      const gDate = new Date(g.startDate).toISOString().slice(0, 10);
      if (gDate !== isoDate) return false;
      const gTitle = norm(g.displayName);
      // Wenn unsere Stadt gesetzt ist, muss sie im Guestoo-Titel oder
      // in der Guestoo-Adresse vorkommen — sonst ist es das falsche Event.
      if (evCity) {
        const inTitle = gTitle.includes(evCity);
        const inCity = norm(g.address?.city ?? "").includes(evCity);
        if (!inTitle && !inCity) return false;
      }
      const aWords = evTitle.split(" ").filter((w) => w.length > 3);
      const bWords = new Set(gTitle.split(" "));
      const overlap = aWords.filter((w) => bWords.has(w)).length;
      return overlap >= 2;
    });

    if (candidate) {
      const { error } = await supabase
        .from("events")
        .update({ guestoo_id: candidate.id })
        .eq("id", ev.id);
      if (!error) matched++;
    } else {
      unmatched.push({ id: String(ev.id), title: String(ev.title ?? ""), date: isoDate });
    }
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { matched, unmatched };
}
