"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setHapticsEnabled } from "@/lib/haptics";

export type Settings = {
  theme: "light" | "dark";
  accent: "default" | "navy" | "mono";
  layout: "grid" | "list" | "table";
  cardStyle: "default" | "photo" | "compact";
  dataSource: "demo" | "live";
  haptics: "on" | "off";
};

const DEFAULTS: Settings = {
  theme: "light",
  accent: "default",
  layout: "grid",
  cardStyle: "default",
  dataSource: "live",
  haptics: "on",
};

const LS_KEY = "sn_state_v2";
const MODE_COOKIE = "sn-mode";

function readModeCookie(): Settings["dataSource"] | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )sn-mode=([^;]+)/);
  if (!m) return null;
  return m[1] === "demo" ? "demo" : m[1] === "live" ? "live" : null;
}

function writeModeCookie(v: Settings["dataSource"]) {
  if (typeof document === "undefined") return;
  // 1 year, site-wide. No Secure flag on localhost; browsers allow it on https by default.
  document.cookie = `${MODE_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
}

type Ctx = Settings & {
  setTheme: (v: Settings["theme"]) => void;
  setAccent: (v: Settings["accent"]) => void;
  setLayout: (v: Settings["layout"]) => void;
  setCardStyle: (v: Settings["cardStyle"]) => void;
  setDataSource: (v: Settings["dataSource"]) => void;
  setHaptics: (v: Settings["haptics"]) => void;
  hydrated: boolean;
};

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let next: Settings = DEFAULTS;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        next = { ...DEFAULTS, ...parsed };
        // Migrate retired accent values to brand-aligned default
        const validAccents: Settings["accent"][] = ["default", "navy", "mono"];
        if (!validAccents.includes(next.accent)) next.accent = DEFAULTS.accent;
      }
    } catch {}
    // Cookie wins over localStorage for dataSource — the server (middleware) reads the cookie.
    // Fehlt der Cookie (abgelaufen/gelöscht), gilt IMMER "live": ein alter
    // localStorage-Stand mit dataSource:"demo" würde einem eingeloggten Member
    // sonst kommentarlos wieder Demo-Daten zeigen. In den Demo-Modus kommt man
    // nur bewusst über die Login-Seite (setzt den Cookie).
    const cookieMode = readModeCookie();
    next = { ...next, dataSource: cookieMode ?? "live" };
    setS(next);
    // Make sure cookie reflects the effective mode (e.g. from localStorage) so middleware agrees.
    writeModeCookie(next.dataSource);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-theme", s.theme);
    document.documentElement.setAttribute("data-accent", s.accent);
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    writeModeCookie(s.dataSource);
    // Der globale Tap-Listener sitzt ausserhalb dieses Providers (Root-Layout,
    // auch für die Auth-Seiten) und liest den Wert deshalb nicht per Hook.
    setHapticsEnabled(s.haptics === "on");
  }, [s, hydrated]);

  const update = <K extends keyof Settings>(k: K) => (v: Settings[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  // Setter with side-effect: writes cookie synchronously and hard-reloads so middleware
  // re-evaluates auth protection based on the new mode.
  const setDataSource = (v: Settings["dataSource"]) => {
    writeModeCookie(v);
    setS((prev) => ({ ...prev, dataSource: v }));
    if (typeof window !== "undefined") {
      window.location.assign(window.location.pathname);
    }
  };

  return (
    <SettingsCtx.Provider
      value={{
        ...s,
        setTheme: update("theme"),
        setAccent: update("accent"),
        setLayout: update("layout"),
        setCardStyle: update("cardStyle"),
        setDataSource,
        setHaptics: update("haptics"),
        hydrated,
      }}
    >
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
