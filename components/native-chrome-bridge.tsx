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
  /** Ab welchem Abstand (pt) Leiste und Lozenge ineinanderfliessen. Grösser = stärkeres Verschmelzen. */
  spacing: number;
  /** Deckkraft des Akzents im Auswahl-Lozenge. 0 = neutrales Glas (WhatsApp-Muster:
   *  die Pille ist farblos, nur Icon + Label tragen den Akzent). Hohe Werte legen
   *  einen farbigen Klecks auf die Leiste — genau der Look, der 1.5 raus musste. */
  tintAlpha: number;
  /** Abstand des Lozenge zum Tab-Rand (pt). */
  lozengeInsetX: number;
  lozengeInsetY: number;
  /** Feder des Tab-Wechsels. Dämpfung < 1 schwingt nach; 1 = ohne Überschwingen.
   *  switchDuration <= 0.02 heisst "gar nicht wandern": die Pille blendet am
   *  alten Tab aus und am neuen wieder ein, statt über die Leiste zu gleiten
   *  (so schaltet die System-Leiste, und damit WhatsApp). */
  switchDuration: number;
  switchDamping: number;
  /** SF-Symbol-Grösse (pt) und ob der aktive Tab die gefüllte Variante nimmt. */
  iconSize: number;
  iconFilledWhenActive: boolean;
}

const NATIVE_GLASS: NativeGlassConfig = {
  clearStyle: false,
  interactive: true,
  spacing: 24,
  tintAlpha: 0.1,
  lozengeInsetX: 3,
  lozengeInsetY: 5,
  switchDuration: 0.001,
  switchDamping: 1,
  iconSize: 16,
  iconFilledWhenActive: true,
};

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
  const glassSent = useRef(false);

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
          // Die Glas-Konfiguration hängt an der ersten Meldung mit: sie ist pro
          // Seitenladung konstant, und die erste Meldung geht immer raus (prev
          // ist leer). Die Hülle vergleicht selbst und wendet nur an, was sich
          // wirklich geändert hat.
          handler.postMessage(glassSent.current ? next : { ...next, glass: NATIVE_GLASS });
          glassSent.current = true;
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
        glassSent.current = false;
      } catch {}
    };
  }, []);

  return null;
}
