import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UserProfile } from "../../types";
import SidebarContent from "./SidebarContent";

/* ============================================================
   侧边栏：桌面固定展开 / 移动端抽屉 + 遮罩
   ============================================================ */

interface SidebarProps {
  profile: UserProfile | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ profile, onLogout, isOpen, onClose }: SidebarProps) {
  // 移动端点击导航后自动收起抽屉
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => setIsMobile(!mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <>
      {/* 移动端遮罩 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink-900/20 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* 侧边栏本体 */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-60 glass-nav border-r border-white/60 lg:relative lg:z-30 lg:flex-shrink-0"
          >
            <SidebarContent profile={profile} onLogout={onLogout} isMobile={isMobile} onClose={onClose} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
