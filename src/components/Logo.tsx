import React from "react";

/* ============================================================
   Logo：五色爱心（简洁高级）
   纯净五色渐变爱心 + 柔和投影，无底板/光晕/高光，极简现代
   ============================================================ */

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 40, className = "" }: LogoProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="心桥教师关怀"
      style={{ filter: "drop-shadow(0 2px 8px rgba(17,24,39,0.10))" }}
    >
      <defs>
        <linearGradient id={`logo-heart-${uid}`} x1="0.12" y1="0.08" x2="0.88" y2="0.96">
          <stop offset="0" stopColor="#9AC73B" />
          <stop offset="0.28" stopColor="#0095DA" />
          <stop offset="0.52" stopColor="#F08120" />
          <stop offset="0.76" stopColor="#E84052" />
          <stop offset="1" stopColor="#D464A2" />
        </linearGradient>
      </defs>

      {/* 五色爱心（简洁现代轮廓） */}
      <path
        d="M38 28c2.98-2.92 6-6.42 6-11A11 11 0 0 0 33 6c-3.52 0-6 1-9 4-3-3-5.48-4-9-4A11 11 0 0 0 4 17c0 4.6 3 8.1 6 11l14 14Z"
        fill={`url(#logo-heart-${uid})`}
      />
    </svg>
  );
}
