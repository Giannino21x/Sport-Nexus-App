"use client";

// Promise-based replacement for window.confirm(): the native dialog shows the
// vercel.app hostname inside the Capacitor/Electron shells — an instant
// "this is a website" giveaway. Usage from any event handler:
//
//   if (await confirmDialog({ title: "…", message: "…", destructive: true })) { … }
//
// <ConfirmDialogHost /> is mounted once in app/layout.tsx and renders the
// pending request via createPortal on document.body — same reasoning as
// notifications-popover: inside the glass chrome, position:fixed would anchor
// to the backdrop-filtered ancestor instead of the screen.

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { error as hapticError, success as hapticSuccess } from "@/lib/haptics";

export type ConfirmDialogOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get a red confirm button and an error haptic. */
  destructive?: boolean;
};

type PendingRequest = ConfirmDialogOptions & { resolve: (confirmed: boolean) => void };

// Module-level bridge so plain event handlers can call confirmDialog() without
// needing a hook or context. The host registers itself here on mount.
let enqueueRequest: ((req: PendingRequest) => void) | null = null;

export function confirmDialog(opts: ConfirmDialogOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (enqueueRequest) {
      enqueueRequest({ ...opts, resolve });
      return;
    }
    // Host not mounted (should not happen — it lives in the root layout).
    // Fall back to the native dialog rather than silently dropping the action.
    resolve(typeof window !== "undefined" ? window.confirm(opts.message) : false);
  });
}

export function ConfirmDialogHost() {
  const [queue, setQueue] = useState<PendingRequest[]>([]);
  const current = queue[0] ?? null;

  useEffect(() => {
    enqueueRequest = (req) => setQueue((q) => [...q, req]);
    return () => { enqueueRequest = null; };
  }, []);

  const settle = useCallback(
    (confirmed: boolean) => {
      if (!current) return;
      if (confirmed) {
        // Haptic feedback on confirm, mirroring the settings page pattern.
        if (current.destructive) hapticError();
        else hapticSuccess();
      }
      current.resolve(confirmed);
      setQueue((q) => q.slice(1));
    },
    [current],
  );

  // Escape cancels, matching the backdrop tap.
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") settle(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, settle]);

  if (!current) return null;

  return createPortal(
    <div className="confirm-backdrop" onClick={() => settle(false)}>
      <div
        className="card confirm-card"
        role="alertdialog"
        aria-modal="true"
        aria-label={current.title ?? current.message}
        onClick={(e) => e.stopPropagation()}
      >
        {current.title && (
          <div className="serif" style={{ fontSize: 19, lineHeight: 1.25, marginBottom: 8 }}>
            {current.title}
          </div>
        )}
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
          {current.message}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={() => settle(false)}>
            {current.cancelLabel ?? "Abbrechen"}
          </button>
          <button
            className="btn btn-primary"
            style={current.destructive ? { background: "var(--danger)", color: "#FFFFFF" } : undefined}
            onClick={() => settle(true)}
            autoFocus
          >
            {current.confirmLabel ?? "Bestätigen"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
