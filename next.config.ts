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
  // Externe Bilder (Guestoo-Eventmotive, Supabase-Avatare, Webflow) laufen
  // über den Vercel-Bildoptimierer: Die Originale sind bis 3 MB gross (24
  // Events = 21 MB), wurden aber in 360 px breite Karten gerendert — und
  // jedes zweimal (Blur-Hintergrund). Jetzt liefert /_next/image passend
  // skalierte WebPs; die Blur-Kopie wird aus einer 64-px-Variante gerechnet.
  // Nur hier gelistete Hosts werden optimiert, alle anderen zeigt lib/img.ts
  // unverändert an.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.guestoo.de" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "cdn.prod.website-files.com" },
    ],
    // 30 = Blur-Hintergründe (Qualität egal, Grösse zählt), 75 = Standard.
    qualities: [30, 75],
    // Eventbilder ändern sich praktisch nie unter derselben URL.
    minimumCacheTTL: 7 * 24 * 3600,
  },
  experimental: {
    // Client-Router-Cache. Next-Default ist `dynamic: 0` — ein <Link> OHNE
    // prefetch-Prop landet in diesem Topf, sein vorgeladener RSC-Payload gilt
    // damit sofort als veraltet und wird bei JEDER Navigation neu geholt.
    // Auf dem Handy heisst das: Tab antippen → Round-Trip über die Proxy-
    // Middleware → erst dann rendert etwas. Die Seiteninhalte kommen
    // ohnehin aus den Client-Hooks und revalidieren selbst; der RSC-Payload
    // dieser Routen ist pro Deploy konstant — darum grosszügig cachen.
    staleTimes: { dynamic: 300, static: 1800 },
    serverActions: {
      bodySizeLimit: "30mb",
      allowedOrigins: ["192.168.1.126:3000", "localhost:3000"],
    },
  },
};

export default nextConfig;
