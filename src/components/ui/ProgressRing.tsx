import React from "react";

/* ============================================================
   ProgressRing：环形进度（测评/心理健康度展示）
   ============================================================ */

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string; // 圆环颜色（CSS 颜色）
  trackColor?: string;
  label?: React.ReactNode;
  sublabel?: string;
}

export default function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  color = "#5b7c99",
  trackColor = "#e6e9ec",
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label !== undefined ? (
          label
        ) : (
          <>
            <span className="text-xl font-bold text-ink-900 leading-none">{clamped}</span>
            {sublabel && <span className="mt-1 text-[10px] text-ink-400">{sublabel}</span>}
          </>
        )}
      </div>
    </div>
  );
}
