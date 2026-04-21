"use client";

import { Icon } from "./icon";
import { useSettings, type Settings } from "./settings-context";

const ACCENTS: { k: Settings["accent"]; c: string; l: string }[] = [
  { k: "default", c: "#E15A2B", l: "Matchday Orange" },
  { k: "navy", c: "#153D6E", l: "Deep Navy" },
  { k: "green", c: "#1F6A4E", l: "Court Green" },
  { k: "ochre", c: "#B86A1A", l: "Ochre" },
  { k: "burgundy", c: "#8C2A36", l: "Burgundy" },
];

const SCREENS: { href: string; l: string }[] = [
  { href: "/login", l: "Login" },
  { href: "/dashboard", l: "Dashboard" },
  { href: "/directory", l: "Directory" },
  { href: "/profile", l: "Profil" },
  { href: "/events", l: "Events" },
  { href: "/messages", l: "Messages" },
  { href: "/feed", l: "Feed" },
];

type Props = { onClose: () => void; isMobile: boolean; navigate: (href: string) => void };

export function TweaksPanel({ onClose, isMobile, navigate }: Props) {
  const { theme, accent, layout, cardStyle, dataSource, setTheme, setAccent, setLayout, setCardStyle, setDataSource } = useSettings();
  return (
    <>
      {isMobile && <div className="tweaks-backdrop" onClick={onClose} />}
      <div
        className="tweaks"
        style={{ bottom: isMobile ? `calc(72px + env(safe-area-inset-bottom))` : 20 }}
      >
        <div className="tweaks-header">
          <span>Tweaks</span>
          <button className="btn-text" style={{ padding: 4 }} onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <label>Datenquelle</label>
          <div className="tweak-options">
            {([{ k: "demo", l: "Demo (Fake Users)" }, { k: "live", l: "Live (Supabase)" }] as const).map((o) => (
              <button
                key={o.k}
                className={"tweak-opt" + (dataSource === o.k ? " active" : "")}
                onClick={() => setDataSource(o.k)}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Theme</label>
          <div className="tweak-options">
            {(["light", "dark"] as const).map((t) => (
              <button key={t} className={"tweak-opt" + (theme === t ? " active" : "")} onClick={() => setTheme(t)}>
                {t === "light" ? "Hell" : "Dunkel"}
              </button>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Akzentfarbe</label>
          <div className="swatch-row">
            {ACCENTS.map((s) => (
              <div
                key={s.k}
                className={"swatch" + (accent === s.k ? " active" : "")}
                title={s.l}
                style={{ background: s.c }}
                onClick={() => setAccent(s.k)}
              />
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Directory Layout</label>
          <div className="tweak-options">
            {([{ k: "grid", l: "Grid" }, { k: "list", l: "Liste" }, { k: "table", l: "Dicht" }] as const).map((o) => (
              <button
                key={o.k}
                className={"tweak-opt" + (layout === o.k ? " active" : "")}
                onClick={() => { setLayout(o.k); navigate("/directory"); }}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        {layout === "grid" && (
          <div className="tweak-row">
            <label>Grid-Card Stil</label>
            <div className="tweak-options">
              {([{ k: "default", l: "Standard" }, { k: "photo", l: "Photo" }, { k: "compact", l: "Kompakt" }] as const).map((o) => (
                <button
                  key={o.k}
                  className={"tweak-opt" + (cardStyle === o.k ? " active" : "")}
                  onClick={() => setCardStyle(o.k)}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="tweak-row">
          <label>Screen springen</label>
          <div className="tweak-options" style={{ flexWrap: "wrap" }}>
            {SCREENS.map((o) => (
              <button
                key={o.href}
                className="tweak-opt"
                style={{ flex: "0 0 auto" }}
                onClick={() => navigate(o.href)}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-4)", lineHeight: 1.5, paddingTop: 6, borderTop: "1px solid var(--line)" }}>
            Alle Änderungen werden im Browser gespeichert.
          </div>
        </div>
      </div>
    </>
  );
}
