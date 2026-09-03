import React from "react";

/* ============================================================
   页面头部：标题 + 副标题 + 右侧操作区（无图标）
   ============================================================ */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, actions, className = "" }: PageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 mb-6 ${className}`}>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink-900 leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm sm:text-[15px] text-ink-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
