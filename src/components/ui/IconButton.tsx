import React from "react";
import type { LucideIcon } from "lucide-react";

/* ============================================================
   IconButton：圆形/圆角图标按钮
   ============================================================ */

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label?: string;
}

export default function IconButton({ icon: Icon, label, className = "", ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-frost-100 hover:text-ink-800 ${className}`}
      {...props}
    >
      <Icon size={18} />
    </button>
  );
}
