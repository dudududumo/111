// 认证服务 - 替换 Firebase Auth
import { authApi } from "./api";
import type { UserRole } from "../types";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  school?: string;
  department?: string;
  deptId?: string;
  managerId?: string;
  consentAccepted?: boolean;
  syncFrequency?: "hourly" | "daily" | "realtime";
}

// 登录
export const login = async (email: string, password: string) => {
  const result = await authApi.login(email, password);
  return result.user;
};

// 注册
export const register = async (data: {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
  school?: string;
  department?: string;
}) => {
  const result = await authApi.register(data);
  return result.user;
};

// 登出
export const logout = () => {
  authApi.logout();
};

// 获取当前用户
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    if (!authApi.isAuthenticated()) {
      return null;
    }
    return await authApi.getCurrentUser();
  } catch (error) {
    console.error("获取当前用户失败:", error);
    return null;
  }
};

// 检查是否已登录
export const isAuthenticated = () => authApi.isAuthenticated();

// 忘记密码
export const forgotPassword = async (email: string) => {
  return await authApi.forgotPassword(email);
};

// 发送验证码
export const sendVerificationCode = async (email: string, phone: string, type: string = 'password_reset') => {
  return await authApi.sendVerificationCode(email, phone, type);
};

// 验证验证码并重置密码
export const verifyCodeAndResetPassword = async (email: string, phone: string, code: string, newPassword: string, confirmPassword: string) => {
  return await authApi.verifyCodeAndResetPassword(email, phone, code, newPassword, confirmPassword);
};

// 手机号密码登录
export const loginPhonePassword = async (phone: string, password: string) => {
  const result = await authApi.loginPhonePassword(phone, password);
  return result.user;
};

// 验证码登录
export const loginCode = async (phone: string, code: string) => {
  const result = await authApi.loginCode(phone, code);
  return result.user;
};

// 监听认证状态变化（模拟 Firebase 的 onAuthStateChanged）
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  // 立即检查一次
  getCurrentUser().then(callback);

  // 返回取消订阅函数（这里只是模拟，实际没有实时监听）
  return () => {};
};
