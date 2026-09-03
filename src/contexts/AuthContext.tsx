import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, logout } from "../services/auth";
import { userApi } from "../services/api";
import { UserProfile, UserRole } from "../types";

/* ============================================================
   认证上下文：用户 / 档案 / 加载态 / 登录 / 退出 / 角色切换
   从原 App.tsx 迁移，业务逻辑保持不变
   ============================================================ */

interface AuthContextValue {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  setAuthUser: (result: any) => void;
  updateProfile: (p: UserProfile) => void;
  handleLogout: () => void;
  handleRoleChange: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// 由后端返回的用户对象构建前端 UserProfile
const buildProfile = (result: any): UserProfile => ({
  uid: result.id,
  displayName: result.displayName,
  email: result.email,
  role: result.role as UserRole,
  school: result.school,
  department: result.department,
  deptId: result.deptId,
  managerId: result.managerId,
  consentAccepted: result.consentAccepted,
  syncFrequency: result.syncFrequency,
  createdAt: new Date().toISOString(),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setProfile(buildProfile(currentUser));
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const setAuthUser = (result: any) => {
    setUser(result);
    setProfile(buildProfile(result));
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

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        setAuthUser,
        updateProfile: setProfile,
        handleLogout,
        handleRoleChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
