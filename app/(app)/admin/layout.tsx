"use client";

import { type ReactNode } from "react";
import { useMe } from "@/lib/hooks";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: me, resolved } = useMe();
  // resolved statt loading: loading ist auch während stiller Hintergrund-
  // Revalidierung true — das liess bei jedem Besuch kurz "Lade..." aufblitzen.
  if (!resolved) return <div style={{ padding: 40, color: "var(--ink-3)" }}>Lade...</div>;
  if (!me) return null;
  if (!me.isAdmin) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="upper-label">Admin</div>
            <h1>Keine Berechtigung</h1>
            <div className="subtitle">Dieser Bereich ist Admins vorbehalten.</div>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
