"use client";

// Route-level error boundary: without it, any render throw leaves a permanent
// white screen inside the Capacitor/Electron shells (no address bar, no way
// for the user to recover). Renders inside the root layout, so globals.css,
// fonts and CSS vars are available.

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the console for debugging — the UI stays friendly.
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20, background: "var(--bg)" }}>
      <div className="card" style={{ maxWidth: 440, width: "100%", padding: 28, textAlign: "center" }}>
        <div className="upper-label" style={{ marginBottom: 10 }}>Ups</div>
        <h1 className="serif" style={{ fontSize: 26, lineHeight: 1.2, marginBottom: 10 }}>
          Da ist etwas schiefgelaufen
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 22 }}>
          Ein unerwarteter Fehler hat diese Seite unterbrochen. Lade sie einfach neu —
          meistens ist danach alles wieder gut.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={reset}>
            Neu laden
          </button>
          <Link href="/dashboard" className="btn btn-ghost">
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
