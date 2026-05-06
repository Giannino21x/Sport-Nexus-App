"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type Props = {
  src: string;
  alt?: string;
  thumbnail?: ReactNode;
  thumbnailStyle?: CSSProperties;
  rounded?: boolean;
};

// Click a thumbnail → image expands into a fullscreen overlay. ESC or
// backdrop-click closes. Replaces target="_blank" "open in new tab" pattern.
export function ImagePreview({ src, alt = "", thumbnail, thumbnailStyle, rounded = true }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={alt ? `${alt} — Vorschau öffnen` : "Bild Vorschau öffnen"}
        style={{
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "zoom-in",
          display: "block",
          width: "100%",
        }}
      >
        {thumbnail ?? (
          <img
            src={src}
            alt={alt}
            style={{
              display: "block",
              width: "100%",
              maxHeight: 360,
              objectFit: "cover",
              borderRadius: rounded ? 10 : 0,
              ...thumbnailStyle,
            }}
          />
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bildvorschau"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            cursor: "zoom-out",
            backdropFilter: "blur(4px)",
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            aria-label="Schließen"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(0,0,0,0.4)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              borderRadius: 4,
              cursor: "default",
            }}
          />
        </div>
      )}
    </>
  );
}
