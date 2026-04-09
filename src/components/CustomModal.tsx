import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
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
  const getIconColor = () => {
    if (theme === "stone") {
      switch (type) {
        case "success":
          return "text-stone-600";
        case "error":
          return "text-red-600";
        case "warning":
          return "text-amber-600";
        case "confirm":
          return "text-stone-600";
        default:
          return "text-stone-600";
      }
    }
    switch (type) {
      case "success":
        return "text-emerald-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-amber-600";
      case "confirm":
        return "text-emerald-600";
      default:
        return "text-emerald-600";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className={`w-10 h-10 ${getIconColor()}`} />;
      case "error":
        return <XCircle className={`w-10 h-10 ${getIconColor()}`} />;
      case "warning":
        return <AlertTriangle className={`w-10 h-10 ${getIconColor()}`} />;
      case "confirm":
        return <AlertTriangle className={`w-10 h-10 ${getIconColor()}`} />;
      default:
        return <Info className={`w-10 h-10 ${getIconColor()}`} />;
    }
  };

  const getIconBg = () => {
    if (theme === "stone") {
      switch (type) {
        case "success":
          return "bg-stone-100";
        case "error":
          return "bg-red-100";
        case "warning":
          return "bg-amber-100";
        case "confirm":
          return "bg-stone-100";
        default:
          return "bg-stone-100";
      }
    }
    switch (type) {
      case "success":
        return "bg-emerald-100";
      case "error":
        return "bg-red-100";
      case "warning":
        return "bg-amber-100";
      case "confirm":
        return "bg-emerald-100";
      default:
        return "bg-emerald-100";
    }
  };

  const getConfirmButtonStyle = () => {
    if (theme === "stone") {
      switch (type) {
        case "success":
          return "bg-gradient-to-r from-stone-600 to-stone-700 hover:from-stone-700 hover:to-stone-800 shadow-stone-200";
        case "error":
          return "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-200";
        case "warning":
          return "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-amber-200";
        case "confirm":
          return "bg-gradient-to-r from-stone-600 to-stone-700 hover:from-stone-700 hover:to-stone-800 shadow-stone-200";
        default:
          return "bg-gradient-to-r from-stone-600 to-stone-700 hover:from-stone-700 hover:to-stone-800 shadow-stone-200";
      }
    }
    switch (type) {
      case "success":
        return "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-200";
      case "error":
        return "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-200";
      case "warning":
        return "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-amber-200";
      case "confirm":
        return "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-200";
      default:
        return "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-200";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-20 h-20 ${getIconBg()} rounded-full flex items-center justify-center`}>
                  {getIcon()}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-stone-900">{title}</h3>
                  <p className="text-stone-500 leading-relaxed">{message}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {showCancel && (
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
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
      )}
    </AnimatePresence>
  );
};

export default CustomModal;