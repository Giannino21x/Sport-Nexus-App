import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Erlaubt den Zugriff vom Handy über die LAN-IP im Dev-Modus
  // (HMR/Dev-Ressourcen + Server-Action-Origin-Check).
  allowedDevOrigins: ["192.168.1.126"],
  // Apples CDN verlangt application/json für die AASA-Datei (Universal
  // Links); ohne Extension liefert Next sonst application/octet-stream.
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
      allowedOrigins: ["192.168.1.126:3000", "localhost:3000"],
    },
  },
};

export default nextConfig;
