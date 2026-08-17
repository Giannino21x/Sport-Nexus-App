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

interface NativeChromeHandler {
  postMessage: (msg: { hidden?: boolean; active?: string; theme?: string; accent?: string }) => void;
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
          handler.postMessage(next);
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
      } catch {}
    };
  }, []);

  return null;
}
