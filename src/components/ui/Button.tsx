import React from "react";
import type { LucideIcon } from "lucide-react";

/* ============================================================
   Button：primary(mist) / secondary(glass) / ghost / danger
   透传原生 button 属性
   ============================================================ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-mist-600 text-white hover:bg-mist-700 shadow-soft active:translate-y-px",
  secondary:
    "bg-white/70 text-ink-700 border border-frost-200 hover:bg-white hover:shadow-card active:translate-y-px",
  ghost: "text-ink-500 hover:bg-frost-100 hover:text-ink-800",
  danger:
    "bg-coral-500 text-white hover:bg-coral-600 shadow-soft active:translate-y-px",
};

export default function Button({
  variant = "primary",
  icon: Icon,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
