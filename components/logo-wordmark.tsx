/* eslint-disable @next/next/no-img-element */

type Props = { height?: number; invert?: boolean };

export function LogoWordmark({ height = 22, invert = false }: Props) {
  return (
    <img
      src={invert ? "/logo-sportnexus-black.png" : "/logo-sportnexus.png"}
      alt="SportNexus"
      style={{
        height,
        width: "auto",
        display: "block",
        filter: invert ? "invert(1)" : "none",
      }}
    />
  );
}
