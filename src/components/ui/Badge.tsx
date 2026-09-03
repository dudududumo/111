import React from "react";

/* ============================================================
   Badge：状态徽章（淡底 + 强调文字）
   ============================================================ */

type BadgeTone = "meadow" | "breeze" | "terra" | "coral" | "iris" | "slate";

const tones: Record<BadgeTone, string> = {
  meadow: "bg-meadow-50 text-meadow-600",
  breeze: "bg-breeze-50 text-breeze-600",
  terra: "bg-terra-50 text-terra-600",
  coral: "bg-coral-50 text-coral-600",
  iris: "bg-iris-50 text-iris-600",
  slate: "bg-frost-100 text-ink-600",
};

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export default function Badge({ children, tone = "slate", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
