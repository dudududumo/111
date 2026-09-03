import React from "react";
import type { LucideIcon } from "lucide-react";

/* ============================================================
   Input：玻璃底 + 可选前导图标/尾随元素，透传原生属性
   ============================================================ */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  trailing?: React.ReactNode;
  label?: string;
  containerClassName?: string;
}

export default function Input({
  icon: Icon,
  trailing,
  label,
  containerClassName = "",
  className = "",
  ...props
}: InputProps) {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-ink-500">{label}</label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Icon size={16} className="text-ink-400 group-focus-within:text-mist-500 transition-colors" />
          </div>
        )}
        <input
          {...props}
          className={`w-full ${Icon ? "pl-10" : "pl-3.5"} ${trailing ? "pr-10" : "pr-3.5"} py-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-mist-500/15 focus:border-mist-500 transition-all duration-200 text-sm ${className}`}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</div>}
      </div>
    </div>
  );
}
