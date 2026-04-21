type AvatarProps = {
  first?: string;
  last?: string;
  color?: string;
  size?: number;
  square?: boolean;
  url?: string | null;
};

export function Avatar({ first = "", last = "", color = "#C7916A", size = 40, square = false, url }: AvatarProps) {
  const initials = (first[0] || "") + (last[0] || "");
  const cls = "avatar" + (square ? " square" : "");
  const hasImage = Boolean(url && url.trim());
  return (
    <span
      className={cls}
      style={{
        width: size,
        height: size,
        background: hasImage ? "var(--bg-sunken)" : color,
        fontSize: size * 0.42,
      }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url as string}
          alt={`${first} ${last}`.trim()}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <>
          <span className="avatar-stripes" />
          <span className="initials" style={{ color: "rgba(255,255,255,0.95)" }}>{initials}</span>
        </>
      )}
    </span>
  );
}
