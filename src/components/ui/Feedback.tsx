import React from "react";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";

/* ============================================================
   反馈组件：Skeleton / Spinner / LoadingState / EmptyState / ErrorState
   ============================================================ */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-frost-200/70 ${className}`} />;
}

export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-mist-500 ${className}`} />;
}

export function LoadingState({ label = "加载中..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-400">
      <Spinner size={24} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = "暂无数据", description, action }: { icon?: React.ElementType; title?: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-frost-100 text-ink-400">
        <Icon size={26} />
      </div>
      <p className="mt-2 text-sm font-medium text-ink-600">{title}</p>
      {description && <p className="max-w-xs text-xs text-ink-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "加载失败，请稍后重试", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-50 text-coral-500">
        <AlertTriangle size={26} />
      </div>
      <p className="text-sm text-ink-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-xl bg-mist-600 px-4 py-2 text-sm font-medium text-white hover:bg-mist-700 transition-colors"
        >
          重试
        </button>
      )}
    </div>
  );
}
