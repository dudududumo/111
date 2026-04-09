import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { getCurrentUser, logout, login, register } from "./services/auth";
import { userApi, notificationApi } from "./services/api";
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
  Heart,
  UserPlus,
  ChevronRight,
  User
} from "lucide-react";
import NotificationDropdown from "./components/NotificationDropdown";
import { motion, AnimatePresence } from "motion/react";

// Pages
import AssessmentPage from "./pages/AssessmentPage";
import WarningCenter from "./pages/WarningCenter";
import Toolkit from "./pages/Toolkit";
import Intervention from "./pages/Intervention";
import AdminCockpit from "./pages/AdminCockpit";
import PersonalSettings from "./pages/PersonalSettings";

const SidebarContent = ({ 
  profile, 
  navItems, 
  onLogout, 
  onRoleChange, 
  isMobile,
  onClose 
}: { 
  profile: UserProfile | null; 
  navItems: any[]; 
  onLogout: () => void; 
  onRoleChange: (role: UserRole) => void; 
  isMobile: boolean;
  onClose: () => void;
}) => {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-end justify-between px-4 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200">
            <Heart size={20} fill="white" className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-stone-900">心桥教师关怀</h1>
            <p className="text-[10px] text-stone-400 font-medium">五色心理健康系统</p>
          </div>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1.5 hover:bg-stone-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1.5 px-3.5 py-4">
        {navItems.filter(item => profile && item.roles.includes(profile.role)).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={isMobile ? onClose : undefined}
              className={`group flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-300 ${isActive ? (item.color === 'slate' ? item.activeBg + ' text-slate-700 shadow-sm' : item.activeBg + ' text-white shadow-md') : item.hoverBg + ' ' + item.hoverText} hover:scale-[1.02] hover:shadow-md`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${isActive ? (item.color === 'slate' ? 'bg-white/50 text-slate-700' : 'bg-white/20 text-white') : 'bg-gradient-to-br ' + item.gradient + ' ' + item.activeText}`}>
                <item.icon size={18} />
              </div>
              <span className="flex-1">{item.label}</span>
              <ChevronRight size={16} className={`transition-all duration-300 ${isActive ? (item.color === 'slate' ? 'opacity-100 text-slate-700' : 'opacity-100 text-white') : 'opacity-0 ' + item.activeText} group-hover:opacity-100 group-hover:translate-x-1 ${isActive ? (item.color === 'slate' ? 'text-slate-700' : '') : item.activeText}`} />
            </Link>
          );
        })}
      </nav>

      <div className="p-3.5 border-t border-stone-100">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 mb-3.5 shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
            {profile?.displayName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900 truncate">{profile?.displayName}</p>
            <p className="text-xs text-stone-500 truncate">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-600 transition-all hover:bg-red-50 hover:text-red-600 group"
        >
          <LogOut size={18} className="transition-colors group-hover:text-red-600" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    localStorage.getItem('sidebarOpen') === 'false' ? false : true
  );
  const [showLogin, setShowLogin] = useState(true); // true = 登录, false = 注册
  
  // 登录/注册表单状态
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    // 检查是否已登录
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          console.log('App.tsx - currentUser:', currentUser);
          console.log('App.tsx - currentUser.syncFrequency:', currentUser.syncFrequency);
          setUser(currentUser);
          setProfile({
            uid: currentUser.id,
            displayName: currentUser.displayName,
            email: currentUser.email,
            role: currentUser.role as UserRole,
            school: currentUser.school,
            department: currentUser.department,
            deptId: currentUser.deptId,
            managerId: currentUser.managerId,
            consentAccepted: currentUser.consentAccepted,
            syncFrequency: currentUser.syncFrequency,
            createdAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // 持久化侧边栏状态
  useEffect(() => {
    localStorage.setItem('sidebarOpen', isSidebarOpen.toString());
  }, [isSidebarOpen]);

  // 定时发送测评提醒通知
  useEffect(() => {
    if (!profile || !profile.uid) return;

    // 获取上次通知时间
    const lastNotifyTime = localStorage.getItem('last_assessment_notify_time');
    const todayNotifyCount = parseInt(localStorage.getItem('today_assessment_notify_count') || '0');
    const todayDate = localStorage.getItem('today_date');

    // 检查是否需要重置计数（新月的一天）
    const today = new Date().toDateString();
    let notifyCount = todayDate === today ? todayNotifyCount : 0;

    // 根据测评频率设置提醒间隔（毫秒）
    const getInterval = () => {
      switch (profile.syncFrequency) {
        case 'hourly':
          return 60 * 60 * 1000; // 每小时
        case 'daily':
          return 24 * 60 * 60 * 1000; // 每天
        case 'realtime':
          return 0; // 实时模式不需要定时提醒
        default:
          return 24 * 60 * 60 * 1000; // 默认每天
      }
    };

    const interval = getInterval();

    // 如果是实时模式或者没有启用提醒，则不发送定时通知
    if (profile.syncFrequency === 'realtime' || interval === 0) {
      return;
    }

    // 每天最多提醒 3 次
    const MAX_NOTIFY_COUNT = 3;

    const sendNotification = async () => {
      // 检查今天是否已经提醒了 3 次
      const currentToday = new Date().toDateString();
      const currentNotifyCount = parseInt(localStorage.getItem('today_assessment_notify_count') || '0');
      const savedDate = localStorage.getItem('today_date');

      if (savedDate !== currentToday || currentNotifyCount >= MAX_NOTIFY_COUNT) {
        // 重置计数
        localStorage.setItem('today_assessment_notify_count', '0');
        localStorage.setItem('today_date', currentToday);
        return;
      }

      try {
        await notificationApi.create({
          userId: profile.uid,
          type: 'reminder',
          title: '【心理测评提醒】',
          content: '您今天还没有完成心理测评哦~关注心理健康，从测评开始。点击前往完成测评吧！',
          relatedId: ''
        });

        // 更新通知计数
        const newCount = currentNotifyCount + 1;
        localStorage.setItem('today_assessment_notify_count', newCount.toString());
        localStorage.setItem('today_date', currentToday);
        localStorage.setItem('last_assessment_notify_time', new Date().toISOString());

        console.log(`✅ 已发送测评提醒通知（今日第 ${newCount} 次）`);
      } catch (error) {
        console.error('发送测评提醒通知失败:', error);
      }
    };

    // 立即发送一次通知（如果上次通知时间超过间隔）
    if (lastNotifyTime) {
      const lastTime = new Date(lastNotifyTime).getTime();
      const now = Date.now();
      if (now - lastTime >= interval) {
        sendNotification();
      }
    }

    // 设置定时器
    const timer = setInterval(() => {
      sendNotification();
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [profile]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const result = await login(email, password);
      setUser(result);
      setProfile({
        uid: result.id,
        displayName: result.displayName,
        email: result.email,
        role: result.role as UserRole,
        school: result.school,
        department: result.department,
        deptId: result.deptId,
        managerId: result.managerId,
        syncFrequency: result.syncFrequency,
        createdAt: new Date().toISOString()
      });
    } catch (error: any) {
      setAuthError(error.message || "登录失败");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const result = await register({
        email,
        password,
        displayName,
        role: UserRole.TEACHER
      });
      setUser(result);
      setProfile({
        uid: result.id,
        displayName: result.displayName,
        email: result.email,
        role: result.role as UserRole,
        school: result.school,
        department: result.department,
        deptId: result.deptId,
        managerId: result.managerId,
        syncFrequency: result.syncFrequency,
        createdAt: new Date().toISOString()
      });
    } catch (error: any) {
      setAuthError(error.message || "注册失败");
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setProfile(null);
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (profile) {
      try {
        await userApi.update(profile.uid, { role: newRole });
        setProfile({ ...profile, role: newRole });
      } catch (error) {
        console.error("Role change error:", error);
      }
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-white to-stone-100 p-4 sm:p-6 lg:p-8">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-200/50 to-teal-200/50 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/50 to-purple-200/50 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-amber-100/30 to-rose-100/30 rounded-full blur-3xl"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg relative z-10"
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-stone-200/50 border border-white/50 overflow-hidden">
            <div className="relative p-6 sm:p-8 lg:p-10">
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mx-auto mb-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl blur-xl opacity-30"></div>
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-300/50">
                      <Heart size={40} sm={48} fill="white" className="text-white" />
                    </div>
                  </div>
                </motion.div>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-stone-800 via-stone-700 to-stone-800 bg-clip-text text-transparent"
                >
                  心桥教师关怀
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-2 text-sm sm:text-base text-stone-500"
                >
                  五色心理健康系统 · 数据驱动关怀，守护教师心灵
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {showLogin ? (
                  <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                    <div className="space-y-4">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <div className="w-5 h-5 text-stone-400 group-focus-within:text-emerald-500 transition-colors">
                            <User size={18} />
                          </div>
                        </div>
                        <input
                          type="email"
                          placeholder="请输入邮箱"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl bg-stone-50/80 border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      </div>
                      
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <div className="w-5 h-5 text-stone-400 group-focus-within:text-emerald-500 transition-colors">
                            <LogIn size={18} />
                          </div>
                        </div>
                        <input
                          type="password"
                          placeholder="请输入密码"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl bg-stone-50/80 border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      </div>
                    </div>
                    
                    {authError && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100"
                      >
                        <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                        <p className="text-red-600 text-sm">{authError}</p>
                      </motion.div>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 sm:py-4 text-white font-semibold shadow-lg shadow-emerald-300/50 hover:shadow-xl hover:shadow-emerald-400/40 transition-all duration-300 text-sm sm:text-base"
                    >
                      <LogIn size={18} />
                      登录
                    </motion.button>
                    
                    <div className="text-center">
                      <p className="text-sm text-stone-500">
                        还没有账号？{" "}
                        <button
                          type="button"
                          onClick={() => setShowLogin(false)}
                          className="text-emerald-600 font-medium hover:text-emerald-700 hover:underline transition-colors"
                        >
                          立即注册
                        </button>
                      </p>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
                    <div className="space-y-4">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <div className="w-5 h-5 text-stone-400 group-focus-within:text-emerald-500 transition-colors">
                            <User size={18} />
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="请输入姓名"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl bg-stone-50/80 border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      </div>
                      
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <div className="w-5 h-5 text-stone-400 group-focus-within:text-emerald-500 transition-colors">
                            <User size={18} />
                          </div>
                        </div>
                        <input
                          type="email"
                          placeholder="请输入邮箱"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl bg-stone-50/80 border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      </div>
                      
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <div className="w-5 h-5 text-stone-400 group-focus-within:text-emerald-500 transition-colors">
                            <LogIn size={18} />
                          </div>
                        </div>
                        <input
                          type="password"
                          placeholder="请输入密码"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl bg-stone-50/80 border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      </div>
                    </div>
                    
                    {authError && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100"
                      >
                        <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                        <p className="text-red-600 text-sm">{authError}</p>
                      </motion.div>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 sm:py-4 text-white font-semibold shadow-lg shadow-emerald-300/50 hover:shadow-xl hover:shadow-emerald-400/40 transition-all duration-300 text-sm sm:text-base"
                    >
                      <UserPlus size={18} />
                      注册
                    </motion.button>
                    
                    <div className="text-center">
                      <p className="text-sm text-stone-500">
                        已有账号？{" "}
                        <button
                          type="button"
                          onClick={() => setShowLogin(true)}
                          className="text-emerald-600 font-medium hover:text-emerald-700 hover:underline transition-colors"
                        >
                          立即登录
                        </button>
                      </p>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 text-center"
          >
            <p className="text-xs sm:text-sm text-stone-400">
              登录即表示同意我们的服务条款和隐私政策
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { path: "/", label: "个人中心", icon: LayoutDashboard, roles: [UserRole.TEACHER, UserRole.ADMIN, UserRole.PSYCHOLOGIST, UserRole.DEPT_HEAD], color: "white", gradient: "from-white to-white", activeBg: "bg-stone-500", activeText: "text-stone-500", hoverBg: "hover:bg-stone-50", hoverText: "hover:text-stone-600" },
    { path: "/assessment", label: "绿色测评", icon: ClipboardCheck, roles: [UserRole.TEACHER, UserRole.ADMIN, UserRole.PSYCHOLOGIST, UserRole.DEPT_HEAD], color: "emerald", gradient: "from-emerald-50 to-emerald-100", activeBg: "bg-emerald-600", activeText: "text-emerald-600", hoverBg: "hover:bg-emerald-50", hoverText: "hover:text-emerald-600" },
    { path: "/toolkit", label: "蓝色调适", icon: Wind, roles: [UserRole.TEACHER, UserRole.ADMIN, UserRole.PSYCHOLOGIST, UserRole.DEPT_HEAD], color: "blue", gradient: "from-blue-50 to-blue-100", activeBg: "bg-blue-600", activeText: "text-blue-600", hoverBg: "hover:bg-blue-50", hoverText: "hover:text-blue-600" },
    { path: "/intervention", label: "橙色干预", icon: Users, roles: [UserRole.TEACHER, UserRole.ADMIN, UserRole.PSYCHOLOGIST, UserRole.DEPT_HEAD], color: "orange", gradient: "from-orange-50 to-orange-100", activeBg: "bg-orange-600", activeText: "text-orange-600", hoverBg: "hover:bg-orange-50", hoverText: "hover:text-orange-600" },
    { path: "/warnings", label: "红色预警", icon: AlertTriangle, roles: [UserRole.ADMIN, UserRole.PSYCHOLOGIST, UserRole.DEPT_HEAD], color: "rose", gradient: "from-rose-50 to-rose-100", activeBg: "bg-rose-600", activeText: "text-rose-600", hoverBg: "hover:bg-rose-50", hoverText: "hover:text-rose-600" },
    { path: "/cockpit", label: "紫色评估", icon: BarChart3, roles: [UserRole.ADMIN], color: "purple", gradient: "from-purple-50 to-purple-100", activeBg: "bg-purple-600", activeText: "text-purple-600", hoverBg: "hover:bg-purple-50", hoverText: "hover:text-purple-600" },
  ];

  return (
    <Router>
      <div className="flex h-screen bg-stone-50 overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-stone-100 shadow-xl lg:relative lg:block lg:shadow-sm"
            >
              <SidebarContent
                profile={profile}
                navItems={navItems}
                onLogout={handleLogout}
                onRoleChange={handleRoleChange}
                isMobile={false}
                onClose={() => setIsSidebarOpen(false)}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white border-b border-stone-100 flex items-center px-4 lg:px-6">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className={`text-stone-600 hover:text-stone-900 transition-colors p-2 hover:bg-stone-100 rounded-lg ${isSidebarOpen ? 'hidden' : 'block'}`}
            >
              <Menu size={24} />
            </button>
            <div className="flex-1 flex items-center justify-end px-4 gap-4">
              <span className="text-sm text-stone-500 hidden sm:block">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <NotificationDropdown />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<PersonalSettings profile={profile} />} />
                <Route path="/assessment" element={<AssessmentPage profile={profile} onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)} />} />
                <Route path="/toolkit" element={<Toolkit profile={profile} />} />
                <Route path="/intervention" element={<Intervention profile={profile} />} />
                
                {/* Protected Routes */}
                {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST || profile?.role === UserRole.DEPT_HEAD) && (
                  <Route path="/warnings" element={<WarningCenter profile={profile} />} />
                )}
                {profile?.role === UserRole.ADMIN && (
                  <Route path="/cockpit" element={<AdminCockpit profile={profile} />} />
                )}
                
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
