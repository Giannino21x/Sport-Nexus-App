import type { ReactNode } from "react";

type Props = { title: string; desc: string; action?: ReactNode };

export function EmptyState({ title, desc, action }: Props) {
  return (
    <div
      style={{
        padding: "64px 24px",
        textAlign: "center",
        color: "var(--ink-3)",
        border: "1px dashed var(--line-strong)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="serif" style={{ fontSize: 24, color: "var(--ink)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5, maxWidth: 360, margin: "0 auto 16px" }}>{desc}</div>
      {action}
    </div>
  );
}
