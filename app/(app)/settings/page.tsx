"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { useSettings, type Settings } from "@/components/settings-context";

const ACCENTS: { k: Settings["accent"]; c: string; l: string }[] = [
  { k: "default", c: "#E15A2B", l: "Matchday Orange" },
  { k: "navy", c: "#153D6E", l: "Deep Navy" },
  { k: "green", c: "#1F6A4E", l: "Court Green" },
  { k: "ochre", c: "#B86A1A", l: "Ochre" },
  { k: "burgundy", c: "#8C2A36", l: "Burgundy" },
];

export default function SettingsPage() {
  const {
    theme, accent, cardStyle, dataSource,
    setTheme, setAccent, setCardStyle, setDataSource,
  } = useSettings();

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="upper-label">Konto</div>
          <h1>Einstellungen</h1>
          <div className="subtitle">Erscheinungsbild und Kontooptionen.</div>
        </div>
        <Link href="/dashboard" className="btn btn-ghost">← Zurück</Link>
      </div>

      <div style={{ display: "grid", gap: 18, maxWidth: 720 }}>
        <div className="card" style={{ padding: 24 }}>
          <div className="upper-label" style={{ marginBottom: 14 }}>Erscheinungsbild</div>

          <Row label="Theme" hint="Hell oder dunkel. Folgt deinem letzten Gerätewechsel nicht automatisch.">
            <SegmentGroup
              options={[
                { k: "light", l: "Hell", icon: "sun" },
                { k: "dark", l: "Dunkel", icon: "moon" },
              ]}
              value={theme}
              onChange={(v) => setTheme(v as Settings["theme"])}
            />
          </Row>

          <Row label="Akzentfarbe" hint="Diese Farbe wird für Hervorhebungen, Buttons und Badges verwendet.">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ACCENTS.map((s) => (
                <button
                  key={s.k}
                  type="button"
                  onClick={() => setAccent(s.k)}
                  aria-pressed={accent === s.k}
                  title={s.l}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: accent === s.k ? "2px solid var(--ink)" : "2px solid transparent",
                    outline: "1px solid var(--line)",
                    background: s.c,
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </Row>

          <Row label="Directory Card-Stil" hint="Nur sichtbar, wenn das Directory als Grid angezeigt wird.">
            <SegmentGroup
              options={[
                { k: "default", l: "Standard" },
                { k: "photo", l: "Foto" },
                { k: "compact", l: "Kompakt" },
              ]}
              value={cardStyle}
              onChange={(v) => setCardStyle(v as Settings["cardStyle"])}
            />
          </Row>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="upper-label" style={{ marginBottom: 14 }}>Daten</div>

          <Row
            label="Datenquelle"
            hint={
              dataSource === "live"
                ? "Live-Modus: deine Daten werden in Supabase gespeichert."
                : "Demo-Modus: fiktive Daten, Änderungen bleiben lokal im Browser."
            }
          >
            <SegmentGroup
              options={[
                { k: "live", l: "Live" },
                { k: "demo", l: "Demo" },
              ]}
              value={dataSource}
              onChange={(v) => setDataSource(v as Settings["dataSource"])}
            />
          </Row>
        </div>

      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 220px) 1fr",
        gap: 18,
        padding: "14px 0",
        borderTop: "1px solid var(--line)",
        alignItems: "center",
      }}
      className="settings-row"
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-start" }}>{children}</div>
    </div>
  );
}

function SegmentGroup<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { k: V; l: string; icon?: Parameters<typeof Icon>[0]["name"] }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: 2,
        background: "var(--bg-elevated)",
      }}
    >
      {options.map((o) => {
        const active = value === o.k;
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onChange(o.k)}
            aria-pressed={active}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: 12.5,
              border: "none",
              background: active ? "var(--bg-sunken)" : "transparent",
              color: "var(--ink)",
              borderRadius: 7,
              cursor: "pointer",
            }}
          >
            {o.icon && <Icon name={o.icon} size={13} />}
            <span>{o.l}</span>
          </button>
        );
      })}
    </div>
  );
}
