import { Menu } from "lucide-react";
import NotificationDropdown from "../NotificationDropdown";
import { UserProfile } from "../../types";

/* ============================================================
   顶部栏：日期 + 通知中心（毛玻璃）
   ============================================================ */

interface HeaderProps {
  profile: UserProfile | null;
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
}

export default function Header({ profile, isSidebarOpen, onOpenSidebar }: HeaderProps) {
  return (
    <header className="h-12 flex-shrink-0 flex items-center px-4 lg:px-6 glass-nav border-b border-white/50 relative z-20">
      <button
        onClick={onOpenSidebar}
        aria-label="打开侧边栏"
        className={`text-ink-600 hover:text-ink-900 transition-colors p-2 hover:bg-white/70 rounded-lg ${
          isSidebarOpen ? "hidden" : "block"
        }`}
      >
        <Menu size={24} />
      </button>
      <div className="flex-1 flex items-center justify-end gap-4">
        <span className="text-sm text-ink-500 hidden sm:block">
          {new Date().toLocaleDateString("zh-CN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        <NotificationDropdown profile={profile} />
      </div>
    </header>
  );
}
