import React from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, AlertTriangle, CheckCircle, LucideIcon } from "lucide-react";

/* ============================================================
   认证表单可复用字段（现代简约 · 毛玻璃）
   ============================================================ */

type TextFieldProps = {
  icon?: LucideIcon;
  label?: string;
  trailing?: React.ReactNode;
  className?: string;
  inputClassName?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function AuthTextField({
  icon: Icon,
  label,
  trailing,
  className = "",
  inputClassName = "",
  ...props
}: TextFieldProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-ink-500 mb-1.5">{label}</label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Icon size={17} className="text-ink-400 group-focus-within:text-mist-500 transition-colors" />
          </div>
        )}
        <input
          {...props}
          className={`w-full ${Icon ? "pl-11" : "pl-4"} ${trailing ? "pr-11" : "pr-4"} py-3 rounded-xl bg-white/70 border border-frost-200 text-ink-800 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-mist-500/15 focus:border-mist-500 transition-all duration-200 text-sm ${inputClassName}`}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</div>
        )}
      </div>
    </div>
  );
}

type PasswordFieldProps = {
  label?: string;
  icon?: LucideIcon;
  className?: string;
  inputClassName?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordField({ label, icon, className = "", inputClassName = "", ...props }: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);
  return (
    <AuthTextField
      icon={icon}
      label={label}
      type={visible ? "text" : "password"}
      className={className}
      inputClassName={inputClassName}
      trailing={
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="p-2 text-ink-400 hover:text-ink-600 transition-colors"
          aria-label={visible ? "隐藏密码" : "显示密码"}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      }
      {...props}
    />
  );
}

type CountdownButtonProps = {
  seconds: number;
  onClick: () => void;
  idleLabel?: string;
  activeLabel?: string;
  className?: string;
};

export function CountdownButton({
  seconds,
  onClick,
  idleLabel = "发送验证码",
  className = "",
}: CountdownButtonProps) {
  const disabled = seconds > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
        disabled
          ? "bg-frost-100 text-ink-400 cursor-not-allowed"
          : "bg-mist-500 text-white hover:bg-mist-600 shadow-soft active:translate-y-px"
      } ${className}`}
    >
      {disabled ? `${seconds}s` : idleLabel}
    </button>
  );
}

type ErrorBannerProps = {
  message?: string;
  type?: "error" | "success";
  className?: string;
};

export function ErrorBanner({ message, type = "error", className = "" }: ErrorBannerProps) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${className} ${
        isError
          ? "bg-coral-50 border-coral-100"
          : "bg-meadow-50 border-meadow-100"
      }`}
    >
      {isError ? (
        <AlertTriangle size={15} className="text-coral-500 flex-shrink-0" />
      ) : (
        <CheckCircle size={15} className="text-meadow-500 flex-shrink-0" />
      )}
      <p className={`text-xs ${isError ? "text-coral-600" : "text-meadow-600"}`}>{message}</p>
    </motion.div>
  );
}
