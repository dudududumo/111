import React from "react";
import type { LucideIcon } from "lucide-react";
import { accents, type AccentKey } from "./accents";

/* ============================================================
   页面头部：图标 + 标题 + 副标题 + 右侧操作区
   ============================================================ */

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent?: AccentKey;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ icon: Icon, title, subtitle, accent = "slate", actions, className = "" }: PageHeaderProps) {
  const a = accents[accent];
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 mb-6 ${className}`}>
      <div className="flex items-center gap-3.5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.iconWrap}`}>
          <Icon size={22} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-ink-900 leading-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
