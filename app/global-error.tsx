"use client";

// Last-resort error boundary: catches throws in the root layout itself. It
// replaces the ENTIRE document, so it must ship its own <html>/<body> and can
// rely on nothing — globals.css, fonts and CSS vars may not be loaded. All
// styles are therefore inline with hard-coded neutral values.

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  console.error(error);

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          padding: 20,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#F4F4F4",
          color: "#000000",
          fontFamily: '"Manrope", "Helvetica Neue", Helvetica, Arial, sans-serif',
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            padding: 28,
            textAlign: "center",
            background: "#FFFFFF",
            border: "1px solid #ECECEC",
            borderRadius: 12,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#868686",
              marginBottom: 10,
            }}
          >
            Ups
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: 26, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.015em" }}>
            Da ist etwas schiefgelaufen
          </h1>
          <p style={{ margin: "0 0 22px", fontSize: 13.5, color: "#868686", lineHeight: 1.6 }}>
            Ein unerwarteter Fehler hat die App unterbrochen. Lade sie einfach neu —
            meistens ist danach alles wieder gut.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 500,
                fontFamily: "inherit",
                border: "1px solid transparent",
                background: "#000000",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              Neu laden
            </button>
            <a
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 500,
                border: "1px solid #ECECEC",
                background: "#FFFFFF",
                color: "#000000",
                textDecoration: "none",
              }}
            >
              Zur Startseite
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
