import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

/* ============================================================
   Modal：与 CustomModal 同 API 的玻璃版弹窗
   ============================================================ */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  hideClose?: boolean;
}

export default function Modal({ open, onClose, title, children, maxWidth = "max-w-lg", hideClose = false }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-[100] m-0! bg-ink-900/30 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${maxWidth} glass rounded-3xl p-6 pointer-events-auto`}
          >
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="关闭"
                className="absolute right-4 top-4 p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-white/70 transition-colors"
              >
                <X size={18} />
              </button>
            )}
            {title && <h3 className="mb-4 text-base font-semibold text-ink-900 pr-8">{title}</h3>}
            {children}
          </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
