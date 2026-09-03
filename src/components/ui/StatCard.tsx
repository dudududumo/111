import React from "react";
import type { LucideIcon } from "lucide-react";
import { accents, type AccentKey } from "./accents";

/* ============================================================
   StatCard：KPI 大字卡
   ============================================================ */

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: AccentKey;
  hint?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function StatCard({ label, value, icon: Icon, accent = "slate", hint, className = "", onClick }: StatCardProps) {
  const a = accents[accent];
  const Tag = (onClick ? "button" : "div") as React.ElementType;
  return (
    <Tag
      onClick={onClick}
      className={`glass rounded-2xl p-5 text-left ${onClick ? "glass-hover w-full" : ""} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-ink-900 leading-none truncate">{value}</p>
        </div>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${a.iconWrap}`}>
          <Icon size={20} />
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-ink-400">{hint}</p>}
    </Tag>
  );
}
