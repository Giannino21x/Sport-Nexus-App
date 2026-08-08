"use client";

import { useEffect } from "react";
import { select, tap } from "@/lib/haptics";

/**
 * Globales Tap-Feedback. Statt in jeden Button einen Aufruf zu streuen,
 * hängt hier EIN delegierter Listener am Dokument — so bekommt jedes
 * Bedienelement dasselbe Gefühl, auch neu gerenderte, und die Guideline
 * "gleiche Geste = gleiches Feedback" hält sich von selbst durch.
 *
 * Ausgelöst wird auf pointerdown, nicht auf click: Feedback soll im Moment
 * der Berührung kommen, nicht erst wenn der Finger wieder hochgeht.
 *
 * Opt-out für einzelne Elemente (oder ganze Bereiche): data-no-haptic.
 */

// Bewusst eng gehalten — alles, was hier drin steht, vibriert bei JEDER
// Berührung. Container, Karten und Listenzeilen gehören nicht dazu; wo eine
// Zeile trotzdem wie ein Button wirkt (Chat-Konversation, Event-Zeile),
// markiert sie sich per data-haptic selbst.
const INTERACTIVE = [
  "button",
  "a[href]",
  "[data-haptic]",
  '[role="button"]',
  '[role="tab"]',
  '[role="switch"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  "summary",
].join(",");

// Auswahl-Charakter statt Tap-Charakter: Navigation und Segment-Schalter.
const SELECTION = '.tabbar-item,.nav-item,[role="tab"],[aria-pressed],.swatch';

export function HapticsBridge() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      // Maus hat keine Taptic Engine — spart den ganzen Rattenschwanz.
      if (e.pointerType === "mouse") return;
      const target = e.target;
      if (!(target instanceof Element)) return;

      const el = target.closest<HTMLElement>(INTERACTIVE);
      if (!el) return;
      if (el.closest("[data-no-haptic]")) return;
      if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;

      if (el.closest(SELECTION)) {
        select();
        return;
      }
      // Primäraktionen dürfen sich etwas satter anfühlen als ein Ghost-Button.
      tap(el.classList.contains("btn-primary") ? "medium" : "light");
    };

    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", onDown, { capture: true });
  }, []);

  return null;
}
