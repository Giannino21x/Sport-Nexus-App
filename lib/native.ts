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
