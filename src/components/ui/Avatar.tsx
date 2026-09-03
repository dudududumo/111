import type { AccentKey } from "./accents";

/* ============================================================
   Avatar：圆角头像（现代 35% 圆角）
   ============================================================ */

interface AvatarProps {
  name?: string;
  src?: string;
  size?: number;
  accent?: AccentKey;
  className?: string;
}

export default function Avatar({ name = "师", src, size = 40, className = "" }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-[35%] object-cover flex-shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`flex items-center justify-center rounded-[35%] font-bold text-white flex-shrink-0 bg-gradient-to-br from-mist-500 to-mist-700 ${className}`}
    >
      {name?.[0] || "师"}
    </div>
  );
}
