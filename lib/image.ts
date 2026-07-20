// Client-seitige Bild-Normalisierung für Avatar-Uploads.
//
// Befund (2026-07-20): Members laden alles hoch — von 9504×6336/3MB bis
// 498×498/19KB. Riesige Originale bremsen die App unnötig; zu kleine kann
// niemand retten. Diese Helper verkleinern nur, was zu gross ist (längste
// Kante > maxDim), mit hochwertigem Downscaling — kleine Originale bleiben
// unangetastet (erneutes Encoden würde sie nur weiter verschlechtern).

export async function normalizeAvatarFile(
  file: File,
  maxDim = 1600,
  quality = 0.88,
): Promise<File> {
  try {
    // from-image: EXIF-Orientierung (Handyfotos!) wird beim Dekodieren angewendet.
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = bmp;
    const needsResize = Math.max(width, height) > maxDim;
    // Auch ohne Resize neu encodieren, wenn die Datei absurd schwer ist (>3MB).
    const needsRecompress = file.size > 3 * 1024 * 1024;
    if (!needsResize && !needsRecompress) {
      bmp.close();
      return file;
    }
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bmp.close(); return file; }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // Im Zweifel das Original hochladen — Normalisierung ist Best-Effort.
    return file;
  }
}
