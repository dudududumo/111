import { Routes, Route, Navigate } from "react-router-dom";
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
import GlobalBackground from "./GlobalBackground";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import PageContainer from "./PageContainer";

/* ============================================================
   应用外壳：侧边栏 + 顶栏 + 内容路由 + 页脚
   ============================================================ */

export default function AppShell() {
  const { profile, updateProfile, handleLogout } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useLocalStorage<boolean>("sidebarOpen", true);

  useAssessmentReminder(profile);

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="relative flex h-screen overflow-hidden bg-frost-50">
      <GlobalBackground />

      <Sidebar profile={profile} onLogout={handleLogout} isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header profile={profile} isSidebarOpen={isSidebarOpen} onOpenSidebar={openSidebar} />

        <main className="flex-1 overflow-y-auto">
          <PageContainer>
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
          </PageContainer>
        </main>

        <Footer />
      </div>
    </div>
  );
}
