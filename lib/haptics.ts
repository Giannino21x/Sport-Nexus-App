/**
 * Haptisches Feedback für die Mobile-Hülle.
 *
 * Drei Wege, in dieser Reihenfolge:
 *
 * 1. Capacitor-Plugin `Haptics` über die native Bridge. Der einzige Weg, der
 *    auf iOS die Taptic Engine erreicht. Die Bridge wird auch in unsere
 *    remote geladene Web-App injiziert (window.Capacitor, siehe layout.tsx) —
 *    das Plugin muss aber im NATIVEN Build stecken, ein Web-Deploy allein
 *    reicht nicht.
 * 2. iOS-Fallback ohne nativen Build: ein verstecktes
 *    `<input type="checkbox" switch>` in einem <label>. Safari spielt beim
 *    Umschalten von sich aus einen Tap ab. Funktioniert nur iOS 17.4–26.4,
 *    Apple hat die Lücke in 26.5 geschlossen — also Bonus, kein Verlass.
 * 3. `navigator.vibrate()` für Android/Browser. In der Android-Hülle nur mit
 *    VIBRATE-Permission, die das Capacitor-Plugin mitliefert.
 *
 * Alle Aufrufe sind absichtlich fire-and-forget: nie awaiten, nie werfen.
 * Wo nichts vibriert, passiert einfach nichts.
 */

type ImpactStyle = "LIGHT" | "MEDIUM" | "HEAVY";
type NotificationType = "SUCCESS" | "WARNING" | "ERROR";

type HapticsPlugin = {
  impact?: (o: { style: ImpactStyle }) => Promise<void>;
  notification?: (o: { type: NotificationType }) => Promise<void>;
  selectionStart?: () => Promise<void>;
  selectionChanged?: () => Promise<void>;
  selectionEnd?: () => Promise<void>;
};

export type TapStrength = "light" | "medium" | "heavy";

const LS_KEY = "sn_state_v2";

// Zwei Taps dichter als das hintereinander fühlen sich nicht mehr wie zwei
// Ereignisse an, sondern wie ein Brummen. Gilt global, nicht pro Element.
const MIN_GAP_MS = 45;

let enabled = true;
let enabledRead = false;
let lastAt = 0;
let switchLabel: HTMLLabelElement | null = null;

function plugin(): HapticsPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: { Haptics?: HapticsPlugin } } }).Capacitor;
  return cap?.Plugins?.Haptics ?? null;
}

/** Hülle vorhanden? Nur dann hat ein Umschalter in den Settings Sinn. */
export function hapticsAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (plugin()) return true;
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") return true;
  return isIOS();
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS meldet sich als Mac — Touch-Punkte verraten es.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Der Provider ruft das bei jeder Settings-Änderung; hier nur der Startwert. */
function readEnabledOnce() {
  if (enabledRead || typeof window === "undefined") return;
  enabledRead = true;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { haptics?: "on" | "off" };
      if (parsed.haptics === "off") enabled = false;
    }
  } catch {}
}

export function setHapticsEnabled(v: boolean) {
  enabled = v;
  enabledRead = true;
}

function allowed(): boolean {
  if (typeof window === "undefined") return false;
  readEnabledOnce();
  if (!enabled) return false;
  const now = performance.now();
  if (now - lastAt < MIN_GAP_MS) return false;
  lastAt = now;
  return true;
}

/**
 * iOS-Fallback. Das Label ist Pflicht: ein direkter click() auf den Input
 * loest nichts aus, Safari haengt das Feedback an die Label-Aktivierung.
 * Off-Screen statt display:none — Unsichtbares wird nicht aktiviert.
 */
function switchTap() {
  if (!isIOS()) return;
  try {
    if (!switchLabel) {
      const label = document.createElement("label");
      label.setAttribute("aria-hidden", "true");
      label.style.cssText =
        "position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
      const input = document.createElement("input");
      input.type = "checkbox";
      // Boolean-Attribut aus Safari 17.4 — React kennt es nicht, deshalb DOM.
      input.setAttribute("switch", "");
      input.tabIndex = -1;
      label.appendChild(input);
      document.body.appendChild(label);
      switchLabel = label;
    }
    switchLabel.click();
  } catch {}
}

function fallback(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
      return;
    } catch {}
  }
  switchTap();
}

const IMPACT: Record<TapStrength, { style: ImpactStyle; ms: number }> = {
  light: { style: "LIGHT", ms: 8 },
  medium: { style: "MEDIUM", ms: 14 },
  heavy: { style: "HEAVY", ms: 22 },
};

/** Tap auf ein Bedienelement — der Standardfall. */
export function tap(strength: TapStrength = "light") {
  if (!allowed()) return;
  const p = plugin();
  const { style, ms } = IMPACT[strength];
  if (p?.impact) {
    void p.impact({ style }).catch(() => {});
    return;
  }
  fallback(ms);
}

/** Auswahl gewechselt (Tab, Segment, Filter) — feiner als ein Tap. */
export function select() {
  if (!allowed()) return;
  const p = plugin();
  if (p?.selectionChanged) {
    // iOS: selectionChanged ist ohne vorheriges selectionStart ein No-Op —
    // der native UISelectionFeedbackGenerator existiert erst danach. Für den
    // Einzel-Tick deshalb immer die volle Sequenz; die Bridge führt die drei
    // Calls der Reihe nach aus.
    void p.selectionStart?.().catch(() => {});
    void p.selectionChanged().catch(() => {});
    void p.selectionEnd?.().catch(() => {});
    return;
  }
  fallback(6);
}

function notify(type: NotificationType, pattern: number | number[]) {
  if (!allowed()) return;
  const p = plugin();
  if (p?.notification) {
    void p.notification({ type }).catch(() => {});
    return;
  }
  fallback(pattern);
}

/** Aktion ist durch (gespeichert, gesendet). */
export function success() {
  notify("SUCCESS", [10, 60, 16]);
}

/** Etwas ist schiefgegangen. */
export function error() {
  notify("ERROR", [18, 70, 18, 70, 18]);
}

/** Achtung, aber kein Fehler (z.B. Limit erreicht). */
export function warning() {
  notify("WARNING", [14, 70, 14]);
}

export const haptics = { tap, select, success, warning, error };
