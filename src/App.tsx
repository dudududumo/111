import { BrowserRouter as Router } from "react-router-dom";
import { motion } from "motion/react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AppShell from "./components/layout/AppShell";
import AuthPage from "./features/auth/AuthPage";

/* ============================================================
   应用入口：Router + 认证门 + 应用外壳
   ============================================================ */

function AuthGate() {
  const { user, loading, setAuthUser } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-frost-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-[3px] border-ink-800 border-t-transparent"
        />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={setAuthUser} />;
  }

  return <AppShell />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </Router>
  );
}
