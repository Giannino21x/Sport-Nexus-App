import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Erlaubt den Zugriff vom Handy über die LAN-IP im Dev-Modus
  // (HMR/Dev-Ressourcen + Server-Action-Origin-Check).
  allowedDevOrigins: ["192.168.1.126"],
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
      allowedOrigins: ["192.168.1.126:3000", "localhost:3000"],
    },
  },
};

export default nextConfig;
