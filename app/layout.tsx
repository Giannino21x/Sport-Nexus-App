import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SportNexus — Memberbereich",
  description: "Der exklusive Memberbereich von SportNexus — Directory, Events, Verbindungen. Nur für Mitglieder.",
};

// Viewport-Meta — ohne diesen rendert Mobile-Browser die Seite in
// Desktop-Breite (980px) und skaliert runter. `viewportFit: cover` reicht den
// Safe-Area-Inset ins CSS durch, damit env(safe-area-inset-*) für Notch/Home-
// Indicator korrekt aufgelöst wird.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${bricolage.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
