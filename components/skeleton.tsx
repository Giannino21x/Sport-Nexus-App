// Skeleton-Bausteine fürs Graceful Loading. Die Placeholder spiegeln die
// Layout-Masse der echten Inhalte, damit beim Umschalten nichts springt.
// Schimmer/Fade kommen aus globals.css (.skel, prefers-reduced-motion beachtet).

import type { CSSProperties } from "react";

export function Skel({ w, h = 12, r = 6, style }: { w?: number | string; h?: number | string; r?: number | string; style?: CSSProperties }) {
  return <span className="skel" aria-hidden="true" style={{ width: w ?? "100%", height: h, borderRadius: r, ...style }} />;
}

export function SkelCircle({ size = 40, style }: { size?: number; style?: CSSProperties }) {
  return <span className="skel" aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, ...style }} />;
}

// Mehrere Textzeilen untereinander (letzte kürzer, wie echter Text).
export function SkelLines({ n = 3, gap = 8, h = 12 }: { n?: number; gap?: number; h?: number }) {
  return (
    <span aria-hidden="true" style={{ display: "grid", gap }}>
      {Array.from({ length: n }).map((_, i) => (
        <Skel key={i} h={h} w={i === n - 1 ? "62%" : "100%"} />
      ))}
    </span>
  );
}

// Standard-Kartenrahmen für Seiten-Skeletons.
export function SkelCard({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div className="card" aria-hidden="true" style={{ padding: 20, ...style }}>
      {children}
    </div>
  );
}
