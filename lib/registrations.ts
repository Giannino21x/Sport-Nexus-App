"use client";

// Anmeldestatus pro Event — serverseitig pro Member gespeichert, damit er
// geräteübergreifend stimmt. localStorage dient nur noch als (a) Sofort-Cache
// für schnelles Rendern und (b) Fallback im Demo-Modus (nicht eingeloggt).
//
// Hintergrund: Guestoo ist System of Record für Anmeldungen, aber die Basic-API
// liefert keine Teilnehmernamen → keine automatische Zuordnung Member↔Guestoo.
// Darum hält der Member seinen Anmeldestatus selbst (Button "Jetzt anmelden"
// bzw. "Ich bin bereits angemeldet"); persistiert in public.event_registrations.

import { useCallback, useEffect, useState } from "react";
import {
  getMyEventRegistrationsAction,
  setEventRegistrationAction,
} from "@/app/actions/events";

const KEY = "sn_event_registrations";

const listeners = new Set<() => void>();

function readRaw(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function writeRaw(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // Quota o.ä. — der In-Memory-State bleibt für diese Session trotzdem aktuell.
  }
  listeners.forEach((l) => l());
}

export function useMyRegistrations() {
  const [ids, setIds] = useState<string[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // 1. Sofort aus dem lokalen Cache rendern.
    setIds(readRaw());
    const sync = () => setIds(readRaw());
    listeners.add(sync);
    window.addEventListener("storage", sync);

    // 2. Server ist Source of Truth, sobald eingeloggt — überschreibt den Cache.
    getMyEventRegistrationsAction()
      .then((r) => {
        if (cancelled || !r.auth) return; // Demo/nicht eingeloggt → lokal bleiben
        setAuthed(true);
        writeRaw(r.ids); // Cache + andere Hook-Instanzen syncen
        setIds(r.ids);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isRegistered = useCallback((eventId: string) => ids.includes(eventId), [ids]);

  const setRegistered = useCallback((eventId: string, value: boolean) => {
    // Optimistisch lokal (sofortiges UI-Feedback + Cache).
    const curr = readRaw();
    const next = value ? [...curr, eventId] : curr.filter((x) => x !== eventId);
    writeRaw(next);
    // Serverseitig persistieren (no-op im Demo-Modus, dort zählt nur lokal).
    setEventRegistrationAction(eventId, value).catch(() => {});
  }, []);

  const toggle = useCallback(
    (eventId: string) => {
      setRegistered(eventId, !readRaw().includes(eventId));
    },
    [setRegistered],
  );

  return { ids, isRegistered, setRegistered, toggle, authed };
}
