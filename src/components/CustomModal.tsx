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
}) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-10 h-10 text-stone-600" />;
      case "error":
        return <XCircle className="w-10 h-10 text-stone-600" />;
      case "warning":
        return <AlertTriangle className="w-10 h-10 text-stone-600" />;
      case "confirm":
        return <AlertTriangle className="w-10 h-10 text-stone-600" />;
      default:
        return <Info className="w-10 h-10 text-stone-600" />;
    }
  };

  const getIconBg = () => {
    return "bg-stone-100";
  };

  const getConfirmButtonStyle = () => {
    return "bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 shadow-stone-200";
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