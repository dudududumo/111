import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useAssessmentReminder } from "../../hooks/useAssessmentReminder";
import { UserRole } from "../../types";

// Pages
import PersonalSettings from "../../pages/PersonalSettings";
import AssessmentPage from "../../pages/AssessmentPage";
import Toolkit from "../../pages/Toolkit";
import Intervention from "../../pages/Intervention";
import WarningCenter from "../../pages/WarningCenter";
import AdminCockpit from "../../pages/AdminCockpit";

// Layout
import Sidebar from "./Sidebar";
import Header from "./Header";

/* ============================================================
   应用外壳：侧边栏 + 顶栏 + 内容路由 + 页脚
   背景跟随板块主题色（淡淡晕染，不抢眼）
   ============================================================ */

// 各板块主题色（RGB），用于背景淡色晕染
const MODULE_GLOWS: Record<string, string> = {
  "/assessment": "154, 199, 59", // 绿
  "/toolkit": "0, 149, 218", // 蓝
  "/intervention": "240, 129, 32", // 橙
  "/warnings": "232, 64, 82", // 红
  "/cockpit": "212, 100, 162", // 紫
};

// 五色光晕（个人中心首页背景使用，五色齐辉）
const FIVE_COLOR_GLOWS = [
  { rgb: "154, 199, 59", pos: "-top-32 -right-20", size: "w-[34rem] h-[34rem]", o: 0.20 },   // 绿
  { rgb: "0, 149, 218", pos: "top-16 -left-28", size: "w-[30rem] h-[30rem]", o: 0.16 },      // 蓝
  { rgb: "240, 129, 32", pos: "top-1/2 -right-40", size: "w-[34rem] h-[34rem]", o: 0.16 },   // 橙
  { rgb: "232, 64, 82", pos: "bottom-0 -right-20", size: "w-[30rem] h-[30rem]", o: 0.15 },   // 红
  { rgb: "212, 100, 162", pos: "-bottom-28 -left-24", size: "w-[34rem] h-[34rem]", o: 0.18 },// 紫
];

function ModuleBackground() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  if (isHome) {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-50 sm:opacity-100" aria-hidden="true">
        {FIVE_COLOR_GLOWS.map((g, i) => (
          <div
            key={i}
            className={`absolute ${g.pos} ${g.size} rounded-full`}
            style={{ background: `radial-gradient(circle, rgba(${g.rgb}, ${g.o}), transparent 68%)` }}
          />
        ))}
      </div>
    );
  }

  const rgb = MODULE_GLOWS[location.pathname] || "128, 138, 148";
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-50 sm:opacity-100" aria-hidden="true">
      <div
        className="absolute -top-40 -right-24 w-[44rem] h-[44rem] rounded-full"
        style={{ background: `radial-gradient(circle, rgba(${rgb}, 0.30), transparent 68%)` }}
      />
      <div
        className="absolute -bottom-44 -left-32 w-[46rem] h-[46rem] rounded-full"
        style={{ background: `radial-gradient(circle, rgba(${rgb}, 0.22), transparent 68%)` }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[30rem] rounded-full"
        style={{ background: `radial-gradient(circle, rgba(${rgb}, 0.18), transparent 72%)` }}
      />
    </div>
  );
}

export default function AppShell() {
  const { profile, updateProfile, handleLogout } = useAuth();
  // 首次访问按视口决定侧边栏：桌面默认展开，移动端默认收起（抽屉）
  const [isSidebarOpen, setSidebarOpen] = useLocalStorage<boolean>("sidebarOpen", typeof window !== "undefined" ? window.innerWidth >= 1024 : true);

  useAssessmentReminder(profile);

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="relative flex h-screen overflow-hidden bg-frost-50">
      <ModuleBackground />

      <Sidebar profile={profile} onLogout={handleLogout} isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header profile={profile} isSidebarOpen={isSidebarOpen} onOpenSidebar={openSidebar} />

        <main className="relative flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<PersonalSettings profile={profile} />} />
            <Route
              path="/assessment"
              element={<AssessmentPage profile={profile} onProfileUpdate={(p) => updateProfile(p)} />}
            />
            <Route path="/toolkit" element={<Toolkit profile={profile} />} />
            <Route path="/intervention" element={<Intervention profile={profile} />} />

            {(profile?.role === UserRole.ADMIN ||
              profile?.role === UserRole.PSYCHOLOGIST ||
              profile?.role === UserRole.DEPT_HEAD) && (
              <Route path="/warnings" element={<WarningCenter profile={profile} />} />
            )}
            {profile?.role === UserRole.ADMIN && (
              <Route path="/cockpit" element={<AdminCockpit profile={profile} />} />
            )}

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
