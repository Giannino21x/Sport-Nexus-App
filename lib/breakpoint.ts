/*
 * Eine Quelle für die Chrome-Weiche: Handy-Layout (Tab-Bar, Drawer, kompakte
 * Abstände) vs. Desktop-Layout (Sidebar).
 *
 * Die Weiche selbst steht als Media-Query in app/globals.css — CSS entscheidet,
 * damit beim ersten Render nicht kurz das falsche Chrome aufblitzt. JS muss
 * exakt dieselbe Bedingung benutzen, sonst driften Layout und Verhalten
 * auseinander: das Notification-Sheet ist per CSS position:fixed, wird aber nur
 * im Handy-Zweig auf <body> portalisiert — passt das nicht zusammen, ankert es
 * am backdrop-filter der Topbar statt am Bildschirm.
 *
 * SCHMAL ODER FLACH: ein Handy im Querformat ist mit 812–932px breiter als die
 * 780px-Schwelle, aber nur ~390–430px hoch. Im Desktop-Zweig fressen dort
 * Topbar, Content-Padding und die 56px-Überschrift den halben Bildschirm, bevor
 * Inhalt kommt. Tablets im Querformat (≥744px hoch) und Desktop-Fenster bleiben
 * im Desktop-Zweig.
 */
export const MOBILE_CHROME_QUERY = "(max-width: 779.98px), (max-height: 499.98px)";

/** True, wenn das Handy-Chrome gilt. Server-seitig immer false (dort rendert
 *  ohnehin nur der Boot-Splash). */
export function isMobileChrome(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_CHROME_QUERY).matches;
}
