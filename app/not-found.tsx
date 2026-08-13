// 404 page — rendered inside the root layout, so globals.css and CSS vars
// are available. Without this file, an unknown route shows Next's unstyled
// default page (an obvious "this is a website" giveaway in the app shells).

import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20, background: "var(--bg)" }}>
      <div className="card" style={{ maxWidth: 440, width: "100%", padding: 28, textAlign: "center" }}>
        <div className="upper-label" style={{ marginBottom: 10 }}>404</div>
        <h1 className="serif" style={{ fontSize: 26, lineHeight: 1.2, marginBottom: 10 }}>
          Seite nicht gefunden
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 22 }}>
          Diese Seite existiert nicht oder wurde verschoben.
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
