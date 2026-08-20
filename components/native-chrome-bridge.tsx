"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSettings } from "./settings-context";

/*
 * Brücke zur nativen Liquid-Glass-Tab-Bar der iOS-Hülle (Binary 1.3+).
 *
 * Die Hülle rendert die Tab-Bar als NATIVE UIVisualEffectView in echtem
 * UIGlassEffect (iOS 26) über dem WebView und setzt html[data-native-chrome]
 * (CSS blendet dann die .tabbar-Kapsel aus). Kanäle:
 *   Nativ -> Web: window.__nativeNavigate('dashboard'|'directory'|'events'|
 *                 'messages'|'profile')
 *   Web -> Nativ: webkit.messageHandlers.nativeChrome.postMessage(
 *                 {hidden, active, theme, accent})
 * theme steuert das Glas (hell/dunkel), accent ist der aufgelöste
 * --accent-Hexwert (Gold/Navy/Mono, themeabhängig) für den aktiven Tab.
 *
 * Ohne native Hülle (Android, Desktop, Browser, alte Binaries) ist das ein
 * kompletter No-Op; eine alte Web-Version in einer neuen Hülle zeigt weiter
 * ihre CSS-Tab-Bar (die native bleibt bis zur ersten Meldung unsichtbar).
 */

/*
 * ---- Stellschrauben der nativen Glas-Kapsel ----
 *
 * DAS HIER IST DIE DATEI ZUM DREHEN. Nativer Code steckt im Binary und
 * bräuchte für jede Korrektur einen App-Store-Durchlauf — diese Werte gehen
 * dagegen über die Brücke an die Hülle und wirken nach einem Vercel-Deploy
 * sofort auf jedem installierten Gerät.
 *
 * Nur Werte ändern, keine Schlüssel erfinden: die Hülle übernimmt
 * ausschliesslich Felder, die sie kennt, alles andere bleibt auf ihrem
 * eingebauten Default. Strukturell Neues (weitere Glasformen, anderer
 * Effekt-Typ) braucht weiterhin einen Build.
 *
 * Wirksam ab Binary 1.5 — ältere Hüllen ignorieren das Feld.
 */
export interface NativeGlassConfig {
  /** true = UIGlassEffect(.clear): viel durchsichtiger, aber über Eventbildern schlechter lesbar. */
  clearStyle: boolean;
  /** Glas reagiert auf Berührung (Apples "interactive glass"). */
  interactive: boolean;
  /** Ab welchem Abstand (pt) Leiste und Lozenge ineinanderfliessen. Grösser = stärkeres
   *  Verschmelzen. Apples eigene Beispiele stehen auf 40. */
  spacing: number;
  /** Deckkraft des Akzents im Auswahl-Lozenge. 0 = neutrales Glas (WhatsApp-Muster:
   *  die Pille ist farblos, nur Icon + Label tragen den Akzent). Hohe Werte legen
   *  einen farbigen Klecks auf die Leiste — genau der Look, der 1.5 raus musste. */
  tintAlpha: number;
  /** Abstand des Lozenge zum Tab-Rand (pt). */
  lozengeInsetX: number;
  lozengeInsetY: number;
  /** Wie die Auswahl den Tab wechselt.
   *  "flow"  = Liquid-Morph: der Tropfen zieht sich zum Ziel lang, wird dabei
   *            flacher und federt am Ziel auf Endgrösse. Das ist das "Blopp"
   *            der System-Leiste — es entsteht NUR, während sich die Glasform
   *            bewegt, weil der Container erst dann verschmilzt.
   *  "fade"  = am alten Tab aus-, am neuen einblenden (kein Weg, kein Morph)
   *  "slide" = harte Feder ohne Verformung */
  switchStyle: "flow" | "fade" | "slide";
  /** Dauer des Wechsels und, nur bei "slide", die Dämpfung der Feder. */
  switchDuration: number;
  switchDamping: number;
  /** SF-Symbol-Grösse (pt) und ob der aktive Tab die gefüllte Variante nimmt. */
  iconSize: number;
  iconFilledWhenActive: boolean;
  /** Schriftgrösse der Tab-Beschriftung (pt). */
  labelSize: number;
  /** Geometrie der Kapsel. barMaxWidth ist ein Deckel für breite Screens,
   *  im Hochformat gewinnen die Seitenränder. */
  barMaxWidth: number;
  barSideMargin: number;
  barHeight: number;
  /** Farbe des Auswahl-Lozenge bzw. von Icon + Label des aktiven Tabs.
   *  null = Akzentfarbe der Web-App. Die System-Leiste (und WhatsApp) hält
   *  beides neutral, die Marke steckt im Inhalt, nicht in der Leiste. */
  tintHex: string | null;
  activeHex: string | null;
}

const NATIVE_GLASS: NativeGlassConfig = {
  clearStyle: false,
  interactive: true,
  spacing: 40,
  tintAlpha: 0.22,
  lozengeInsetX: 3,
  lozengeInsetY: 5,
  switchStyle: "flow",
  switchDuration: 0.42,
  switchDamping: 0.72,
  iconSize: 22,
  iconFilledWhenActive: true,
  labelSize: 10.5,
  barMaxWidth: 420,
  barSideMargin: 14,
  barHeight: 62,
  tintHex: "#FFFFFF",
  activeHex: "#FFFFFF",
};

/* Was sich mit dem Theme dreht: eine helle Kapsel auf hellem Grund wäre
   unsichtbar, darum kippt im Light-Theme sowohl die Farbe als auch die
   Deckkraft. Alles andere ist themeunabhängig und steht oben. */
const GLASS_BY_THEME: Record<"dark" | "light", Partial<NativeGlassConfig>> = {
  dark: { tintHex: "#FFFFFF", activeHex: "#FFFFFF", tintAlpha: 0.22 },
  light: { tintHex: "#111111", activeHex: "#111111", tintAlpha: 0.1 },
};

function glassFor(theme: string): NativeGlassConfig {
  return { ...NATIVE_GLASS, ...GLASS_BY_THEME[theme === "dark" ? "dark" : "light"] };
}

interface NativeChromeMessage {
  hidden?: boolean;
  active?: string;
  theme?: string;
  accent?: string;
  glass?: NativeGlassConfig;
}

interface NativeChromeHandler {
  postMessage: (msg: NativeChromeMessage) => void;
}

function getHandler(): NativeChromeHandler | null {
  if (typeof window === "undefined") return null;
  const wk = (window as unknown as {
    webkit?: { messageHandlers?: { nativeChrome?: NativeChromeHandler } };
  }).webkit;
  return wk?.messageHandlers?.nativeChrome ?? null;
}

/* Zustände, in denen auch die CSS-Tab-Bar verschwindet bzw. ein Overlay
   die Seite deckt — die native Kapsel darf dann nicht darüber schweben.
   (Tastatur regelt die Hülle selbst über UIKeyboard-Notifications.) */
const HIDE_SELECTOR = ".messages-wrap.thread-open, .sidebar-drawer, [data-hide-chrome]";

const TAB_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  directory: "/directory",
  events: "/events",
  messages: "/messages",
  profile: "/profile",
};

function activeTab(pathname: string): string {
  if (pathname === "/dashboard") return "dashboard";
  for (const [id, href] of Object.entries(TAB_ROUTES)) {
    if (id === "dashboard") continue;
    if (pathname === href || pathname.startsWith(href + "/")) return id;
  }
  return "";
}

export function NativeChromeBridge() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { theme, accent } = useSettings();
  const lastSent = useRef<{ hidden?: boolean; active?: string; theme?: string; accent?: string }>({});
  const glassSent = useRef("");

  // Nativ -> Web: Navigations-Hook bereitstellen
  useEffect(() => {
    if (!getHandler()) return;
    const w = window as unknown as { __nativeNavigate?: (tab: string) => void };
    w.__nativeNavigate = (tab: string) => {
      const route = TAB_ROUTES[tab];
      if (route) router.push(route);
    };
    return () => {
      delete w.__nativeNavigate;
    };
  }, [router]);

  // Web -> Nativ: Sichtbarkeit, aktiver Tab, Theme + Akzentfarbe
  useEffect(() => {
    const handler = getHandler();
    if (!handler) return;
    document.documentElement.dataset.nativeChrome = "1";

    const send = () => {
      const hidden = !!document.querySelector(HIDE_SELECTOR);
      const active = activeTab(pathname);
      // data-theme/data-accent setzt der Settings-Context in einem eigenen
      // Effect — zum Sendezeitpunkt (rAF, s. unten) ist --accent aufgelöst.
      const accentHex = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim();
      const next = { hidden, active, theme, accent: accentHex };
      const prev = lastSent.current;
      if (
        prev.hidden !== next.hidden || prev.active !== next.active ||
        prev.theme !== next.theme || prev.accent !== next.accent
      ) {
        lastSent.current = next;
        try {
          // Die Glas-Konfiguration hängt mit, solange sie sich unterscheidet:
          // beim ersten Mal immer, danach nur noch nach einem Theme-Wechsel
          // (die Kapselfarben drehen sich mit). Die Hülle vergleicht selbst
          // und wendet nur an, was sich wirklich geändert hat.
          const glass = glassFor(theme);
          const glassKey = JSON.stringify(glass);
          handler.postMessage(glassKey === glassSent.current ? next : { ...next, glass });
          glassSent.current = glassKey;
        } catch {
          /* best-effort */
        }
      }
    };

    let raf = requestAnimationFrame(send);
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(send);
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "data-hide-chrome"],
    });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [pathname, theme, accent]);

  // Abmelden (AppShell unmountet): Kapsel ausblenden, der Login braucht sie nicht.
  useEffect(() => {
    return () => {
      try {
        getHandler()?.postMessage({ hidden: true });
        lastSent.current = {};
        glassSent.current = "";
      } catch {}
    };
  }, []);

  return null;
}
