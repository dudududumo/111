import React from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  X
} from "lucide-react";

type ModalType = "success" | "error" | "warning" | "info" | "confirm";
type ModalTheme = "green" | "stone";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  theme?: ModalTheme;
}

/* ============================================================
   弹窗：跟随当前板块的五色主题自动适配强调色
   错误/警告保持红色（coral），其余用板块主题色
   ============================================================ */

// 路由 → 板块主题色
const MODULE_ROUTES: Record<string, string> = {
  "/assessment": "meadow", // 绿色测评
  "/toolkit": "breeze",    // 蓝色调适
  "/intervention": "terra",// 橙色干预
  "/warnings": "coral",    // 红色预警
  "/cockpit": "iris",      // 紫色评估
};

const ACCENTS: Record<string, { primary: string; icon: string; soft: string }> = {
  meadow: { primary: "bg-meadow-500 hover:bg-meadow-600", icon: "text-meadow-600", soft: "bg-meadow-50" },
  breeze: { primary: "bg-breeze-500 hover:bg-breeze-600", icon: "text-breeze-600", soft: "bg-breeze-50" },
  terra:  { primary: "bg-terra-500 hover:bg-terra-600", icon: "text-terra-600", soft: "bg-terra-50" },
  coral:  { primary: "bg-coral-500 hover:bg-coral-600", icon: "text-coral-600", soft: "bg-coral-50" },
  iris:   { primary: "bg-iris-500 hover:bg-iris-600", icon: "text-iris-600", soft: "bg-iris-50" },
};

const CustomModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  type = "info",
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  onConfirm,
  showCancel = false,
  theme = "green",
}) => {
  const location = useLocation();

  // 板块主题色（stone 主题回退为墨色）
  const moduleAccent = theme === "stone"
    ? null
    : (ACCENTS[MODULE_ROUTES[location.pathname] || ""] || null);

  const isAlert = type === "error" || type === "warning";

  const getConfirmButtonStyle = () => {
    if (isAlert) return "bg-coral-500 hover:bg-coral-600";
    if (moduleAccent) return moduleAccent.primary;
    return "bg-ink-900 hover:bg-ink-800";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-[300] m-0! bg-ink-900/30 backdrop-blur-sm">
          <div className="absolute inset-0 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh_-_5rem)]"
          >
            <div className="p-8 space-y-6 overflow-y-auto flex-1 min-h-0">
              <div className="flex flex-col items-center text-center space-y-2">
                <h3 className="text-2xl font-bold text-ink-900">{title}</h3>
                <p className="text-ink-500 leading-relaxed">{message}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {showCancel && (
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-2xl bg-white/70 text-ink-700 border border-frost-200 font-semibold hover:bg-white transition-all flex items-center justify-center gap-2"
                  >
                    <X size={18} /> {cancelText}
                  </button>
                )}
                <button
                  onClick={() => {
                    onConfirm?.();
                    onClose();
                  }}
                  className={`flex-1 py-3 rounded-2xl text-white font-semibold transition-all shadow-lg flex items-center justify-center gap-2 ${getConfirmButtonStyle()}`}
                >
                  <Check size={18} /> {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CustomModal;
