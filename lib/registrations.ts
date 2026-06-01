"use client";

// Client-seitiger Anmelde-Marker pro Event.
//
// Hintergrund: Guestoo ist das System of Record für Event-Anmeldungen, aber es
// gibt (noch) keine Verknüpfung zwischen eingeloggtem Member und Guestoo-
// Registrierung. Bis die Guestoo/HubSpot-Integration diese Verknüpfung liefert,
// halten wir den Anmeldestatus lokal im Browser fest (gleiches Muster wie der
// Demo-Avatar in lib/hooks.ts). Das macht die geforderten UI-Zustände
// ("Angemeldete Events", "Bereits angemeldet", Anmelde-Badge) real und
// demonstrierbar. Auf der Event-Detailseite wird der lokale Marker zusätzlich
// mit der echten Guestoo-Anmeldeliste abgeglichen (Name-Match), sobald diese
// geladen ist.

import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    const sync = () => setIds(readRaw());
    sync();
    listeners.add(sync);
    // Cross-Tab-Sync über das native storage-Event.
    window.addEventListener("storage", sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isRegistered = useCallback((eventId: string) => ids.includes(eventId), [ids]);

  const setRegistered = useCallback((eventId: string, value: boolean) => {
    const curr = readRaw();
    const next = value ? [...curr, eventId] : curr.filter((x) => x !== eventId);
    writeRaw(next);
  }, []);

  const toggle = useCallback((eventId: string) => {
    const curr = readRaw();
    writeRaw(curr.includes(eventId) ? curr.filter((x) => x !== eventId) : [...curr, eventId]);
  }, []);

  return { ids, isRegistered, setRegistered, toggle };
}
