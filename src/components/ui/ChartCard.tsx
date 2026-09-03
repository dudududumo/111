import React from "react";
import { accents, type AccentKey } from "./accents";

/* ============================================================
   ChartCard：图表容器（统一标题区 + recharts 主题）
   ============================================================ */

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: AccentKey;
  actions?: React.ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, children, accent = "slate", actions, className = "" }: ChartCardProps) {
  const a = accents[accent];
  return (
    <div className={`glass rounded-2xl p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
        </div>
      </div>
      {children}
    </div>
  );
}
