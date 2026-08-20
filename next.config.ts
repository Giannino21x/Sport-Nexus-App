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
    // Client-Router-Cache. Next-Default ist `dynamic: 0` — ein <Link> OHNE
    // prefetch-Prop landet in diesem Topf, sein vorgeladener RSC-Payload gilt
    // damit sofort als veraltet und wird bei JEDER Navigation neu geholt.
    // Auf dem Handy heisst das: Tab antippen → Round-Trip über die Proxy-
    // Middleware (updateSession → Supabase-Auth) → erst dann rendert etwas.
    // 30 s Wiederverwendung reicht für das Hin-und-Her zwischen Tabs; die
    // Seiteninhalte kommen ohnehin aus den Client-Hooks und revalidieren
    // selbst, der RSC-Payload dieser Routen ist praktisch statisch.
    staleTimes: { dynamic: 30, static: 300 },
    serverActions: {
      bodySizeLimit: "30mb",
      allowedOrigins: ["192.168.1.126:3000", "localhost:3000"],
    },
  },
};

export default nextConfig;
