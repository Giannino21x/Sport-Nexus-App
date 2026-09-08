import { Pic } from "./pic";

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
        // Über den Bildoptimierer in Darstellungsgrösse: Profilbilder liegen
        // mit bis zu 1600 px / 400 KB im Storage, gezeigt werden 30–52 px.
        // 114 Members × Originalgrösse zu dekodieren war ein Hauptgrund für
        // den zähen Members-Tab.
        <Pic
          src={url as string}
          alt={`${first} ${last}`.trim()}
          sizes={`${size}px`}
          className="img-fade"
          // ref-Check fängt bereits gecachte Bilder ab, deren onLoad vor der
          // Hydration gefeuert hat — sonst blieben sie unsichtbar.
          imgRef={(el) => { if (el?.complete) el.classList.add("loaded"); }}
          onLoad={(e) => e.currentTarget.classList.add("loaded")}
          style={{ objectFit: "cover" }}
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
