/* eslint-disable @next/next/no-img-element */

type Variant = "color" | "color-on-dark" | "black" | "white";
type Props = { height?: number; invert?: boolean; variant?: Variant };

export function LogoWordmark({ height = 22, invert = false, variant }: Props) {
  const v: Variant = variant ?? (invert ? "white" : "color");

  // Official SportNexus wordmark for dark backgrounds: gold "N" + white text.
  if (v === "color-on-dark") {
    return (
      <img
        src="/logo-sportnexus-web.png"
        alt="SportNexus"
        style={{ height, width: "auto", display: "block" }}
      />
    );
  }

  let src = "/logo-sportnexus.png";
  let filter = "none";
  if (v === "black") { src = "/logo-sportnexus-black.png"; filter = "none"; }
  if (v === "white") { src = "/logo-sportnexus-black.png"; filter = "invert(1)"; }

  return (
    <img
      src={src}
      alt="SportNexus"
      style={{ height, width: "auto", display: "block", filter }}
    />
  );
}
