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

// Universal Links / App Links: öffnet jemand einen sport-nexus-app.vercel.app-
// Link und landet in der App, liefert die Hülle den Ziel-Link als appUrlOpen-
// Event — hier wird er in Client-Navigation übersetzt.
let appUrlOpenBound = false;
export function initNativeDeepLinks(navigate: (path: string) => void) {
  if (appUrlOpenBound) return;
  const app = plugin("App");
  if (!app) return;
  appUrlOpenBound = true;
  try {
    app.addListener?.("appUrlOpen", ((data: { url?: string }) => {
      try {
        const u = new URL(String(data?.url ?? ""));
        navigate(u.pathname + u.search + u.hash);
      } catch {}
    }) as never);
  } catch {}
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
