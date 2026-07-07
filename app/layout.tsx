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
// maximumScale/userScalable: Safari IGNORIERT beides seit iOS 10 (Pinch-Zoom
// im Browser bleibt möglich), aber die WKWebView der nativen App respektiert
// es — verhindert dort den hängenbleibenden Auto-Zoom beim Input-Fokus.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Edge-to-Edge-Erkennung: Das Safe-Area-Top-Padding (--safe-top) darf nur
// greifen, wenn die Seite WIRKLICH unter der Status-Bar liegt. Das ist der
// Fall in (a) der nativen Hülle mit contentInset 'never' — erkennbar am
// UA-Token "SportNexusEdge" (appendUserAgent in capacitor.config.ts) — und
// (b) einer Homescreen-PWA. Die ALTE App-Hülle (contentInset 'always') rückt
// den Inhalt schon nativ unter die Status-Bar; dort würde env(safe-area-
// inset-top) obendrauf doppeln ("Titel kommt zu weit runter"). Im Browser
// ist env() ohnehin 0. Läuft inline vor dem ersten Paint (kein Layout-Flash).
// (c) Messbasierter Fallback für die TestFlight-Zwischengeneration vom
// 2026-07-06 (contentInset 'never' OHNE UA-Token): native Hülle
// (window.Capacitor, Bridge wird atDocumentStart injiziert) + echte
// Safe-Area (env-Probe > 0) + randlose Viewport-Höhe (innerHeight ≈
// screen.height; Gerätedaten shell_diag id=2: 840–874 vs. 874). Die alte
// 'always'-Hülle hat eine eingerückte Viewport (~62–96px kleiner, belegt
// durch die Scrim-Empirik: fixe Elemente ankern dort UNTER der Status-Bar)
// und fällt sicher durch die 40px-Toleranz.
// Zusätzlich: Theme/Accent aus localStorage VOR dem ersten Paint auf <html>
// stempeln — sonst blitzt bei Dark-Mode-Nutzern beim Laden erst das helle
// Theme auf, bevor der SettingsProvider (nach der Hydration) umschaltet.
const edgeDetect =
  `try{if(/SportNexusEdge/.test(navigator.userAgent)||window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true){document.documentElement.setAttribute("data-shell","edge")}}catch(e){}` +
  `try{if(!document.documentElement.hasAttribute("data-shell")&&window.Capacitor&&window.innerHeight>=window.screen.height-40){var p=document.createElement("div");p.style.cssText="position:fixed;top:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)";document.body.appendChild(p);var et=parseFloat(getComputedStyle(p).paddingTop)||0;p.remove();if(et>0){document.documentElement.setAttribute("data-shell","edge")}}}catch(e){}` +
  `try{var s=JSON.parse(localStorage.getItem("sn_state_v2")||"{}");if(s.theme==="dark"){document.documentElement.setAttribute("data-theme","dark")}if(s.accent==="navy"||s.accent==="mono"){document.documentElement.setAttribute("data-accent",s.accent)}}catch(e){}`;

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
      <body>
        <script dangerouslySetInnerHTML={{ __html: edgeDetect }} />
        {children}
      </body>
    </html>
  );
}
