"use client";

// Dünne Brücke zur nativen Capacitor-Hülle. Die Plugin-Objekte werden von der
// Hülle atDocumentStart injiziert — im Browser oder wenn das installierte
// Binary ein Plugin (noch) nicht mitbringt, sind alle Aufrufe stille No-ops.
type CapPlugin = Record<string, (...args: unknown[]) => Promise<unknown> | undefined>;

function plugin(name: string): CapPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, CapPlugin> } }).Capacitor;
  return cap?.Plugins?.[name] ?? null;
}

// Status-Bar-Glyphen ans Theme koppeln: Style "LIGHT" = dunkle Glyphen für
// helle UI, "DARK" = helle Glyphen für dunkle UI (Capacitor-Benennung folgt
// dem Hintergrund, nicht der Glyphenfarbe).
export function setNativeStatusBarStyle(theme: "light" | "dark") {
  try {
    plugin("StatusBar")?.setStyle?.({ style: theme === "dark" ? "DARK" : "LIGHT" })?.catch(() => {});
  } catch {}
}

// Splash gezielt ausblenden, sobald die App wirklich steht (Session geklärt,
// erste Inhalte gerendert) — launchAutoHide (1.5 s) bleibt als Fallback, damit
// ein Ladefehler nie im ewigen Splash endet.
export function hideNativeSplash() {
  try {
    plugin("SplashScreen")?.hide?.({ fadeOutDuration: 200 })?.catch(() => {});
  } catch {}
}

export function nativePlatform(): "ios" | "android" | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.();
  return p === "ios" || p === "android" ? p : null;
}

// Universal Links / App Links: die AASA/assetlinks-Regel greift für ALLE
// Pfade, also fängt die installierte App auch Mail-Links wie
// /reset-confirm?token_hash=... ab. Wird der Ziel-Pfad dann nicht übernommen,
// landet der User stumm auf /login und der Reset-Link "geht auf dem Handy
// nicht" (User-Report 2026-08-20) — während derselbe Link am PC funktioniert,
// weil dort keine App dazwischenfunkt.
//
// Zwei Fälle, beide müssen behandelt werden:
//   warm  — App läuft schon: die Hülle feuert "appUrlOpen".
//   kalt  — App wird durch den Link ERST gestartet: das Event ist weg, bevor
//           irgendein Listener existiert. Nur getLaunchUrl() liefert es nach.
// Darum wird das hier bewusst auf JEDER Route initialisiert (siehe
// components/native-deep-links.tsx im Root-Layout) und nicht erst, wenn eine
// Session steht — ein Passwort-Reset-Link trifft per Definition Ausgeloggte.
let appUrlOpenBound = false;
let launchUrlChecked = false;
export function initNativeDeepLinks(navigate: (path: string) => void) {
  const app = plugin("App");
  if (!app) return;

  const go = (raw?: string | null) => {
    if (!raw) return;
    let u: URL;
    try {
      u = new URL(String(raw));
    } catch {
      return;
    }
    // Nur die eigene Origin folgen — sonst wäre jeder Deep Link ein
    // Open Redirect in der WebView.
    if (u.origin !== window.location.origin) return;
    const target = u.pathname + u.search + u.hash;
    const here = window.location.pathname + window.location.search + window.location.hash;
    if (target === here) return;
    navigate(target);
  };

  if (!appUrlOpenBound) {
    appUrlOpenBound = true;
    try {
      app.addListener?.("appUrlOpen", ((data: { url?: string }) => go(data?.url)) as never);
    } catch {}
  }

  if (!launchUrlChecked) {
    launchUrlChecked = true;
    try {
      const p = app.getLaunchUrl?.() as Promise<{ url?: string } | null> | undefined;
      p?.then((res) => {
        const url = res?.url;
        if (!url) return;
        // getLaunchUrl() liefert dieselbe URL den ganzen App-Lauf lang. Ohne
        // Merker würde jeder WebView-Reload den User zurück auf den
        // Start-Deeplink werfen.
        try {
          if (sessionStorage.getItem("sn_launch_url") === url) return;
          sessionStorage.setItem("sn_launch_url", url);
        } catch {}
        go(url);
      })?.catch(() => {});
    } catch {}
  }
}

// Push-Registrierung (nur native Hülle): fragt die Berechtigung an, holt den
// Geräte-Token (APNs raw auf iOS, FCM auf Android) und meldet ihn via
// Callback. Tap auf eine Push-Notification navigiert zum hinterlegten Link.
let pushBound = false;
export async function registerPushNotifications(
  onToken: (token: string, platform: "ios" | "android") => void,
  navigate: (path: string) => void,
): Promise<void> {
  const platform = nativePlatform();
  const push = plugin("PushNotifications");
  if (!push || !platform || pushBound) return;
  pushBound = true;
  try {
    let perm = (await push.checkPermissions?.()) as { receive?: string } | undefined;
    if (perm?.receive === "prompt" || perm?.receive === "prompt-with-rationale") {
      perm = (await push.requestPermissions?.()) as { receive?: string } | undefined;
    }
    if (perm?.receive !== "granted") return;
    push.addListener?.("registration", ((t: { value?: string }) => {
      if (t?.value) onToken(t.value, platform);
    }) as never);
    push.addListener?.("pushNotificationActionPerformed", ((a: { notification?: { data?: { link?: string } } }) => {
      const link = a?.notification?.data?.link;
      if (typeof link === "string" && link.startsWith("/")) navigate(link);
    }) as never);
    await push.register?.();
  } catch {
    // Push ist Komfort — Fehler hier dürfen die App nie beeinträchtigen.
  }
}
