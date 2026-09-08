"use client";

import Image from "next/image";
import { useState, type CSSProperties, type SyntheticEvent } from "react";
import { imageLoader, isOptimizable } from "@/lib/img";

/*
 * Füllendes Bild (position:absolute im relativen Elternelement) über den
 * Vercel-Bildoptimierer. `sizes` bestimmt, wie breit das Bild auf dem Gerät
 * dargestellt wird — daraus wählt der Browser die passende Breite aus dem
 * srcset. Für Blur-Hintergründe reicht sizes="64px" + quality 30: ein
 * winziges Bild, das der GPU-Blur fast nichts kostet.
 *
 * Schlägt der Optimierer für eine Quelle fehl (Host antwortet nicht, kein
 * Bildformat), fällt das Element einmalig auf das Original zurück.
 */
export function Pic({
  src,
  alt,
  sizes,
  quality = 75,
  priority = false,
  className,
  style,
  onLoad,
  imgRef,
  ariaHidden,
}: {
  src: string;
  alt: string;
  sizes: string;
  quality?: 30 | 75;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  onLoad?: (e: SyntheticEvent<HTMLImageElement>) => void;
  imgRef?: (el: HTMLImageElement | null) => void;
  ariaHidden?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const unoptimized = failed || !isOptimizable(src);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={quality}
      priority={priority}
      loader={imageLoader}
      unoptimized={unoptimized}
      className={className}
      style={style}
      onLoad={onLoad}
      onError={() => { if (!failed) setFailed(true); }}
      ref={imgRef}
      aria-hidden={ariaHidden}
      draggable={false}
    />
  );
}
