"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { clearLiveCache, reload, useMe } from "@/lib/hooks";
import { signOutAction } from "@/app/actions/auth";
import { uploadAvatarAction } from "@/app/actions/members";
import { normalizeAvatarFile } from "@/lib/image";

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Pflichtschritt beim ersten Login (Pascal Feedback 6, 2026-06-16): Solange ein
// Mitglied kein Profilbild hat, blockiert dieses Overlay den Memberbereich.
// Zwei Wege: Foto hochladen ODER Selfie aufnehmen. Einziger Ausweg: Abmelden.
// Demo-Modus ist ausgenommen.
export function PhotoGate() {
  const { data: me, isDemo } = useMe();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"choose" | "camera">("choose");

  // Nur live + eingeloggt + ohne Bild gaten.
  if (isDemo || !me || (me.avatarUrl && me.avatarUrl.trim())) return null;

  const uploadFile = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      setError("Nur JPG, PNG oder WebP erlaubt.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("Datei zu gross (max. 25 MB).");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      // Riesige Originale vor dem Upload auf max. 1600px verkleinern.
      fd.append("file", await normalizeAvatarFile(file));
      const r = await uploadAvatarAction(fd);
      if (r.error) {
        setError(r.error);
        return;
      }
      // me neu laden → avatarUrl gesetzt → Gate verschwindet.
      reload("members");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadFile(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Profilbild hinzufügen"
      data-hide-chrome=""
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.62)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: 460, padding: 28, textAlign: "center", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ display: "inline-block", marginBottom: 16 }}>
          <Avatar first={me.first} last={me.last} color={me.color} size={96} square />
        </div>

        {mode === "choose" ? (
          <>
            <h2 className="serif" style={{ fontSize: 24, lineHeight: 1.2, marginBottom: 8 }}>
              Füge dein Profilbild hinzu
            </h2>
            <div style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.55, marginBottom: 22 }}>
              Ein Bild macht dich für die anderen Members erkennbar — das ist der erste Schritt im SportNexus-Netzwerk.
              Lade ein Foto hoch oder nimm direkt ein Selfie auf.
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChosen}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => { setError(null); fileRef.current?.click(); }}
                disabled={busy}
                style={{ justifyContent: "center" }}
              >
                <Icon name="image" size={15} /> {busy ? "Wird hochgeladen..." : "Foto hochladen"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setError(null); setMode("camera"); }}
                disabled={busy}
                style={{ justifyContent: "center" }}
              >
                <Icon name="camera" size={15} /> Selfie aufnehmen
              </button>
            </div>
          </>
        ) : (
          <CameraCapture
            busy={busy}
            onCapture={(file) => uploadFile(file)}
            onCancel={() => { setError(null); setMode("choose"); }}
          />
        )}

        {error && (
          <div style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 14 }}>{error}</div>
        )}

        <button
          className="btn-text"
          onClick={() => {
            // Cache VOR dem Logout leeren (gleiches Muster wie app-shell) —
            // sonst sieht der nächste User auf diesem Gerät kurz fremde Daten.
            clearLiveCache();
            signOutAction();
          }}
          style={{ marginTop: 22, fontSize: 12, color: "var(--ink-4)", cursor: "pointer" }}
        >
          Abmelden
        </button>
      </div>
    </div>
  );
}

function CameraCapture({
  onCapture,
  onCancel,
  busy,
}: {
  onCapture: (file: File) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliger Fallback, wenn keine Kamera-API existiert
      setCamError("Kamera wird von diesem Gerät/Browser nicht unterstützt. Bitte lade stattdessen ein Foto hoch.");
      return;
    }
    md.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setCamError("Kamerazugriff nicht möglich (verweigert oder belegt). Bitte lade stattdessen ein Foto hoch.");
        }
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const snap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const side = Math.min(video.videoWidth, video.videoHeight);
    // 1080 statt 720: Selfies wirkten auf Retina-Displays sonst leicht körnig.
    const out = Math.min(1080, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, out, out);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, lineHeight: 1.2, marginBottom: 14 }}>
        Selfie aufnehmen
      </h2>
      {camError ? (
        <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55, marginBottom: 18 }}>
          {camError}
        </div>
      ) : (
        <div
          style={{
            width: 240,
            height: 240,
            margin: "0 auto 16px",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            background: "var(--bg-sunken)",
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
          />
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Zurück
        </button>
        {!camError && (
          <button className="btn btn-primary" onClick={snap} disabled={busy || !ready}>
            <Icon name="camera" size={15} /> {busy ? "Wird hochgeladen..." : "Aufnehmen"}
          </button>
        )}
      </div>
    </>
  );
}
