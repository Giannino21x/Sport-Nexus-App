// Bild-Loader für next/image.
//
// Nur Hosts, die in next.config.ts unter images.remotePatterns stehen, gehen
// durch den Vercel-Optimierer (/_next/image → skaliertes WebP). Alles andere
// (Blob-/Data-URLs aus Upload-Vorschauen, unbekannte Hosts) wird unverändert
// ausgeliefert — der Optimierer würde dafür 400 liefern, das Bild bliebe leer.
// Beide Listen müssen synchron bleiben.

const OPTIMIZED_HOSTS = [/(^|\.)guestoo\.de$/, /(^|\.)supabase\.co$/, /^cdn\.prod\.website-files\.com$/];

export function isOptimizable(src: string): boolean {
  if (!src.startsWith("https://")) return false;
  try {
    const host = new URL(src).hostname;
    return OPTIMIZED_HOSTS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

export function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (!isOptimizable(src)) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
