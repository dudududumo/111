import { Link, useLocation } from "react-router-dom";
import { X, LogOut } from "lucide-react";
import { UserProfile } from "../../types";
import { navItems } from "./navItems";
import { accents } from "../ui/accents";
import Logo from "../Logo";

/* ============================================================
   侧边栏内容：Logo + 导航 + 用户信息 + 退出
   现代简约：扁平胶囊，active = 白底 + 五色小圆点 + 强调色图标
   ============================================================ */

interface SidebarContentProps {
  profile: UserProfile | null;
  onLogout: () => void;
  isMobile: boolean;
  onClose: () => void;
}

export default function SidebarContent({ profile, onLogout, isMobile, onClose }: SidebarContentProps) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-20 items-center justify-between px-5 border-b border-white/50">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div>
            <h1 className="font-bold text-[15px] text-ink-900 leading-tight">心桥教师关怀</h1>
            <p className="text-[10px] text-ink-400 font-medium mt-0.5">五色心理健康系统</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="关闭侧边栏"
          className="text-ink-400 hover:text-ink-600 transition-colors p-1.5 hover:bg-white/70 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-1 px-3.5 py-4 overflow-y-auto">
        {navItems
          .filter((item) => profile && item.roles.includes(profile.role))
          .map((item) => {
            const isActive = location.pathname === item.path;
            const a = accents[item.accent];
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={isMobile ? onClose : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white text-ink-800 shadow-card"
                    : "text-ink-500 hover:bg-white/70 hover:text-ink-800 hover:shadow-card"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 ${
                    isActive ? a.iconWrap : "text-ink-400 group-hover:text-ink-700"
                  }`}
                >
                  <item.icon size={18} strokeWidth={2} />
                </span>
                <span className={`flex-1 ${isActive ? "text-ink-800" : ""}`}>{item.label}</span>
              </Link>
            );
          })}
      </nav>

      {/* 用户信息 + 退出 */}
      <div className="p-3.5 border-t border-white/50 space-y-1">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-ink-800 to-ink-900 flex items-center justify-center text-white text-sm font-bold shadow-soft flex-shrink-0">
            {profile?.displayName?.[0] || "师"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-800 truncate">{profile?.displayName}</p>
            <p className="text-[11px] text-ink-400 truncate">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-500 transition-all hover:bg-coral-50 hover:text-coral-600"
        >
          <LogOut size={17} />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
}
