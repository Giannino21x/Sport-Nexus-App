"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getEventAttendeeCountsAction } from "@/app/actions/guestoo";

/*
 * Anmeldezahlen aus Guestoo ("12 angemeldet") für Dashboard und Events-Liste.
 *
 * Vorher fragte jeder Mount die Server-Action neu — ein Roundtrip zu Vercel,
 * dort einer pro Event zu Guestoo — und die Zahl sprang nach 1–2 s von
 * "40 Plätze" auf "12 angemeldet". Jetzt: modulweiter Cache + localStorage,
 * sofort gerendert, höchstens alle 5 Minuten aufgefrischt, geteilt zwischen
 * allen Seiten.
 */

type Counts = Record<string, number | null>;
type Snapshot = { counts: Counts; fetchedAt: number };

const LS_KEY = "sn_guestoo_counts_v1";
const TTL = 5 * 60_000;

let snap: Snapshot = { counts: {}, fetchedAt: 0 };
const subs = new Set<() => void>();
let inflight: Promise<void> | null = null;

(function hydrate() {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.parse(window.localStorage.getItem(LS_KEY) || "null") as Snapshot | null;
    if (raw && raw.counts && typeof raw.counts === "object") snap = { counts: raw.counts, fetchedAt: Number(raw.fetchedAt) || 0 };
  } catch {}
})();

function publish(next: Snapshot) {
  snap = next;
  subs.forEach((cb) => cb());
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {}
}

function refresh(ids: string[]): Promise<void> | null {
  // Läuft schon eine Anfrage (evtl. mit anderen IDs), danach nochmals prüfen,
  // ob für DIESE IDs noch etwas fehlt.
  if (inflight) return inflight.then(() => refresh(ids) ?? undefined);
  const missing = ids.some((id) => !(id in snap.counts));
  if (!missing && Date.now() - snap.fetchedAt < TTL) return null;
  inflight = getEventAttendeeCountsAction(ids)
    .then((r) => {
      // Fehlversuche (null) überschreiben keinen bekannten Wert.
      const merged: Counts = { ...snap.counts };
      for (const [id, n] of Object.entries(r.counts)) if (n !== null || !(id in merged)) merged[id] = n;
      publish({ counts: merged, fetchedAt: Date.now() });
    })
    .catch(() => {})
    .finally(() => { inflight = null; });
  return inflight;
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => { subs.delete(cb); };
};
const getSnap = () => snap;
const SERVER_SNAP: Snapshot = { counts: {}, fetchedAt: 0 };
const getServerSnap = () => SERVER_SNAP;

/** ids = Guestoo-IDs der Events, deren Zahlen die Seite zeigt. */
export function useGuestooCounts(ids: string[]): Counts {
  const s = useSyncExternalStore(subscribe, getSnap, getServerSnap);
  const key = ids.join(",");
  useEffect(() => {
    if (!key) return;
    void refresh(key.split(","));
  }, [key]);
  return s.counts;
}
