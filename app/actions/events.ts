"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EventInput = {
  title: string;
  subtitle?: string;
  date: string; // yyyy-mm-dd
  time?: string;
  city?: string;
  venue?: string;
  address?: string;
  guests?: number;
  featured?: boolean;
  description?: string;
  long_description?: string;
  image_url?: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function requireAdmin(): Promise<{ error?: string; memberId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };
  const { data: me } = await supabase
    .from("members")
    .select("id, is_admin")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!me?.is_admin) return { error: "Keine Berechtigung." };
  return { memberId: me.id };
}

function statusForDate(iso: string): "upcoming" | "past" {
  const d = new Date(iso + "T23:59:59");
  return d.getTime() < Date.now() ? "past" : "upcoming";
}

export async function createEventAction(input: EventInput): Promise<{ error?: string; id?: string }> {
  const admin = await requireAdmin();
  if (admin.error) return { error: admin.error };

  const title = input.title.trim();
  if (!title) return { error: "Titel fehlt." };
  if (!input.date) return { error: "Datum fehlt." };

  const supabase = await createClient();

  // Build a unique id from the title + date
  const baseSlug = slugify(`${title}-${input.date}`) || `event-${Date.now().toString(36)}`;
  let id = baseSlug;
  let n = 1;
  // ensure unique
  while (true) {
    const { data: existing } = await supabase.from("events").select("id").eq("id", id).maybeSingle();
    if (!existing) break;
    n += 1;
    id = `${baseSlug}-${n}`;
    if (n > 50) break;
  }

  const { error } = await supabase.from("events").insert({
    id,
    title,
    subtitle: input.subtitle ?? "",
    date: input.date,
    time: input.time ?? "",
    city: input.city ?? "",
    venue: input.venue ?? "",
    address: input.address ?? "",
    guests: input.guests ?? 0,
    status: statusForDate(input.date),
    featured: input.featured ?? false,
    description: input.description ?? "",
    image_url: input.image_url ?? "",
    long_description: input.long_description ?? "",
  });
  if (error) return { error: error.message };

  revalidatePath("/events");
  return { id };
}

export async function updateEventAction(
  id: string,
  input: Partial<EventInput>,
): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  if (admin.error) return { error: admin.error };

  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.subtitle !== undefined) patch.subtitle = input.subtitle;
  if (input.date !== undefined) { patch.date = input.date; patch.status = statusForDate(input.date); }
  if (input.time !== undefined) patch.time = input.time;
  if (input.city !== undefined) patch.city = input.city;
  if (input.venue !== undefined) patch.venue = input.venue;
  if (input.address !== undefined) patch.address = input.address;
  if (input.guests !== undefined) patch.guests = input.guests;
  if (input.featured !== undefined) patch.featured = input.featured;
  if (input.description !== undefined) patch.description = input.description;
  if (input.long_description !== undefined) patch.long_description = input.long_description;
  if (input.image_url !== undefined) patch.image_url = input.image_url;

  const { error } = await supabase.from("events").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  return {};
}

export async function deleteEventAction(id: string): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  if (admin.error) return { error: admin.error };

  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/events");
  return {};
}

export async function registerEventAction(eventId: string): Promise<{ error?: string; registered?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: me } = await supabase.from("members").select("id").eq("auth_id", user.id).maybeSingle();
  if (!me) return { error: "Kein Member-Profil gefunden." };

  // Check existing
  const { data: existing } = await supabase
    .from("event_registrations")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("member_id", me.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("event_registrations").delete().eq("event_id", eventId).eq("member_id", me.id);
    revalidatePath(`/events/${eventId}`);
    return { registered: false };
  }

  const { error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    member_id: me.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/events/${eventId}`);
  return { registered: true };
}
