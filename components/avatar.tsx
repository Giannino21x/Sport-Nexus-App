type AvatarProps = {
  first?: string;
  last?: string;
  color?: string;
  size?: number;
  square?: boolean;
};

export function Avatar({ first = "", last = "", color = "#C7916A", size = 40, square = false }: AvatarProps) {
  const initials = (first[0] || "") + (last[0] || "");
  const cls = "avatar" + (square ? " square" : "");
  return (
    <span className={cls} style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}>
      <span className="avatar-stripes" />
      <span className="initials" style={{ color: "rgba(255,255,255,0.95)" }}>{initials}</span>
    </span>
  );
}
