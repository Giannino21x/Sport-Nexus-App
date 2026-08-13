import type { MetadataRoute } from "next";

// Web-App-Manifest: macht die App am Homescreen installierbar (Android/Chrome
// brauchen es für display-mode: standalone — die Edge-Erkennung im Root-Layout
// prüft genau darauf) und liefert Icons/Name für den Installations-Dialog.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SportNexus",
    short_name: "SportNexus",
    description: "Der exklusive Memberbereich von SportNexus — Directory, Events, Verbindungen.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
