import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, signIn, signOut } from "./firebase";
import { UserProfile, UserRole } from "./types";
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  AlertTriangle, 
  Wind, 
  Users, 
  BarChart3, 
  LogOut, 
  LogIn,
  Menu,
  X,
  Heart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Pages (to be implemented)
import Dashboard from "./pages/Dashboard";
import AssessmentPage from "./pages/AssessmentPage";
import WarningCenter from "./pages/WarningCenter";
import Toolkit from "./pages/Toolkit";
import Community from "./pages/Community";
import AdminCockpit from "./pages/AdminCockpit";

import { handleFirestoreError, OperationType } from "./utils/firestoreErrorHandler";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const docRef = doc(db, "users", firebaseUser.uid);
          let docSnap;
          try {
            docSnap = await getDoc(docRef);
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`);
            return;
          }
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Create default profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || "教师",
              email: firebaseUser.email || "",
              role: UserRole.TEACHER,
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(docRef, newProfile);
            } catch (e) {
              handleFirestoreError(e, OperationType.CREATE, `users/${firebaseUser.uid}`);
            }
            setProfile(newProfile);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-stone-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-xl border border-stone-100"
        >
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Heart size={40} fill="currentColor" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-stone-900">五色教师心理健康系统</h1>
            <p className="mt-2 text-stone-500">数据驱动关怀，守护教师心灵</p>
          </div>
          <button
            onClick={async () => {
              try {
                await signIn();
              } catch (error: any) {
                console.error("Sign in error:", error);
                if (error.code === 'auth/unauthorized-domain') {
                  alert("登录失败：当前域名未在 Firebase 中授权。请在 Firebase Console -> Authentication -> Settings -> Authorized domains 中添加此域名。");
                } else if (error.code === 'auth/popup-closed-by-user') {
                  // User closed the popup, no need to show an alert usually, but we can log it
                  console.log("User closed the sign-in popup.");
                } else {
                  alert("登录失败: " + error.message);
                }
              }
            }}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-4 py-4 text-white font-semibold shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95"
          >
            <LogIn size={20} />
            使用 Google 账号登录
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { path: "/", label: "个人看板", icon: LayoutDashboard, roles: [UserRole.TEACHER, UserRole.ADMIN, UserRole.PSYCHOLOGIST] },
    { path: "/assessment", label: "绿色测评", icon: ClipboardCheck, roles: [UserRole.TEACHER, UserRole.ADMIN, UserRole.PSYCHOLOGIST] },
    { path: "/toolkit", label: "蓝色调适", icon: Wind, roles: [UserRole.TEACHER, UserRole.ADMIN, UserRole.PSYCHOLOGIST] },
    { path: "/community", label: "橙色干预", icon: Users, roles: [UserRole.TEACHER, UserRole.ADMIN, UserRole.PSYCHOLOGIST] },
    { path: "/warnings", label: "红色预警", icon: AlertTriangle, roles: [UserRole.ADMIN, UserRole.PSYCHOLOGIST, UserRole.DEPT_HEAD] },
    { path: "/cockpit", label: "紫色评估", icon: BarChart3, roles: [UserRole.ADMIN] },
  ];

  return (
    <Router>
      <div className="flex h-screen bg-stone-50 overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-100 shadow-sm lg:relative lg:block"
            >
              <div className="flex h-full flex-col">
                <div className="flex h-16 items-center justify-between px-6 border-bottom border-stone-50">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xl">
                    <Heart size={24} fill="currentColor" />
                    <span>五色系统</span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-stone-400">
                    <X size={20} />
                  </button>
                </div>

                <nav className="flex-1 space-y-1 px-4 py-6">
                  {navItems.filter(item => profile && item.roles.includes(profile.role)).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-600 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      <item.icon size={20} className="text-stone-400 group-hover:text-emerald-500" />
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="p-4 border-t border-stone-50">
                  {/* Role Switcher for Demo Purposes */}
                  <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-2">开发演示：切换角色</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(UserRole).map((role) => (
                        <button
                          key={role}
                          onClick={async () => {
                            if (profile) {
                              const docRef = doc(db, "users", profile.uid);
                              await setDoc(docRef, { ...profile, role }, { merge: true });
                              setProfile({ ...profile, role });
                            }
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${profile?.role === role ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}
                        >
                          {role === 'admin' ? '管理员' : role === 'psychologist' ? '专员' : role === 'dept_head' ? '组长' : '教师'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-stone-50 mb-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                      {profile?.displayName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{profile?.displayName}</p>
                      <p className="text-xs text-stone-500 truncate">{profile?.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
                  >
                    <LogOut size={20} />
                    退出登录
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white border-b border-stone-100 flex items-center px-6 justify-between lg:justify-end">
            <button onClick={() => setIsSidebarOpen(true)} className={`lg:hidden text-stone-600 ${isSidebarOpen ? 'hidden' : 'block'}`}>
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-500 hidden sm:block">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Dashboard profile={profile} />} />
                <Route path="/assessment" element={<AssessmentPage profile={profile} />} />
                <Route path="/toolkit" element={<Toolkit profile={profile} />} />
                <Route path="/community" element={<Community profile={profile} />} />
                
                {/* Protected Routes */}
                {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST || profile?.role === UserRole.DEPT_HEAD) && (
                  <Route path="/warnings" element={<WarningCenter profile={profile} />} />
                )}
                {profile?.role === UserRole.ADMIN && (
                  <Route path="/cockpit" element={<AdminCockpit profile={profile} />} />
                )}
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
