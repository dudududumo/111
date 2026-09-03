import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  User, Mail, Phone, Key, LogIn, UserPlus, CheckCircle
} from "lucide-react";
import Logo from "../../components/Logo";
import {
  login, sendVerificationCode,
  verifyCodeAndResetPassword, loginPhonePassword, loginCode
} from "../../services/auth";
import { authApi } from "../../services/api";
import { UserRole } from "../../types";
import {
  AuthTextField, PasswordField, CountdownButton, ErrorBanner
} from "./AuthFields";

/* ============================================================
   认证页（登录 / 注册 / 找回密码）
   从原 App.tsx 迁移全部认证状态与逻辑，视觉重做为现代简约毛玻璃风
   ============================================================ */

type AuthPageProps = {
  onSuccess: (user: any) => void;
};

// 五色体系展示
const WU_SE = [
  { name: "绿色测评", color: "bg-meadow-500" },
  { name: "蓝色调适", color: "bg-breeze-500" },
  { name: "橙色干预", color: "bg-terra-500" },
  { name: "红色预警", color: "bg-coral-500" },
  { name: "紫色评估", color: "bg-iris-500" },
];

export default function AuthPage({ onSuccess }: AuthPageProps) {
  // ---------- 模式 ----------
  const [showLogin, setShowLogin] = useState(true); // true = 登录, false = 注册
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // ---------- 登录/注册/找回公共字段 ----------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // 忘记密码
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [passwordResetDone, setPasswordResetDone] = useState(false);

  // 登录方式
  const [loginMethod, setLoginMethod] = useState<'email-password' | 'phone-password' | 'phone-code'>('email-password');

  // 注册验证码
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerCode, setRegisterCode] = useState('');
  const [registerCountdown, setRegisterCountdown] = useState(0);

  // 登录验证码
  const [loginPhone, setLoginPhone] = useState('');
  const [loginVerificationCode, setLoginVerificationCode] = useState('');
  const [loginCountdown, setLoginCountdown] = useState(0);

  // ---------- 倒计时 ----------
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (registerCountdown > 0) timer = setInterval(() => setRegisterCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [registerCountdown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loginCountdown > 0) timer = setInterval(() => setLoginCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [loginCountdown]);

  // ---------- 登录成功后回调 ----------
  const finishAuth = (result: any) => {
    onSuccess(result);
  };

  // 发送验证码（找回密码）
  const handleSendCode = async () => {
    if (!email || !phone) {
      setAuthError("请输入邮箱和手机号");
      return;
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setAuthError("请输入正确的手机号格式");
      return;
    }
    setAuthError("");
    try {
      await sendVerificationCode(email, phone);
      setCountdown(60);
      setResetSuccess(true);
    } catch (error: any) {
      setAuthError(error.message || "发送验证码失败");
    }
  };

  // 发送注册验证码
  const handleSendRegisterCode = async () => {
    if (!email || !registerPhone) {
      setAuthError("请输入邮箱和手机号");
      return;
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(registerPhone)) {
      setAuthError("请输入正确的手机号格式");
      return;
    }
    setAuthError("");
    try {
      await sendVerificationCode(email, registerPhone, 'register');
      setRegisterCountdown(60);
    } catch (error: any) {
      setAuthError(error.message || "发送验证码失败");
    }
  };

  // 发送登录验证码
  const handleSendLoginCode = async () => {
    if (!loginPhone) {
      setAuthError("请输入手机号");
      return;
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(loginPhone)) {
      setAuthError("请输入正确的手机号格式");
      return;
    }
    setAuthError("");
    try {
      await sendVerificationCode('', loginPhone, 'login');
      setLoginCountdown(60);
    } catch (error: any) {
      setAuthError(error.message || "发送验证码失败");
    }
  };

  // 登录
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      let result;
      if (loginMethod === 'email-password') {
        result = await login(email, password);
      } else if (loginMethod === 'phone-password') {
        result = await loginPhonePassword(loginPhone, password);
      } else if (loginMethod === 'phone-code') {
        result = await loginCode(loginPhone, loginVerificationCode);
      }
      finishAuth(result);
    } catch (error: any) {
      setAuthError(error.message || "登录失败");
    }
  };

  // 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const result = await authApi.register({
        email,
        password,
        displayName,
        role: UserRole.TEACHER,
        phone: registerPhone,
        code: registerCode
      });
      finishAuth(result.user);
    } catch (error: any) {
      setAuthError(error.message || "注册失败");
    }
  };

  // 验证验证码并设置新密码
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!email || !phone || !code || !newPassword || !confirmPassword) {
      setAuthError("请填写完整信息");
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthError("两次输入的密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setAuthError("密码长度至少6位");
      return;
    }
    try {
      await verifyCodeAndResetPassword(email, phone, code, newPassword, confirmPassword);
      setPasswordResetDone(true);
    } catch (error: any) {
      setAuthError(error.message || "重置密码失败");
    }
  };

  // 重置忘记密码状态
  const resetForgotState = () => {
    setEmail("");
    setPhone("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setCountdown(0);
    setAuthError("");
    setResetSuccess(false);
  };

  const gotoLogin = () => {
    resetForgotState();
    setShowForgotPassword(false);
    setShowLogin(true);
  };

  const goForgot = () => {
    setShowForgotPassword(true);
  };

  const goRegister = () => setShowLogin(false);
  const goLogin = () => setShowLogin(true);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-frost-50 p-4 sm:p-6 lg:p-8">
      {/* 五色光晕背景（与个人主页一致） */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -right-20 w-[34rem] h-[34rem] rounded-full" style={{ background: "radial-gradient(circle, rgba(154,199,59,0.30), transparent 68%)" }} />
        <div className="absolute top-16 -left-28 w-[30rem] h-[30rem] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,149,218,0.24), transparent 68%)" }} />
        <div className="absolute top-1/2 -right-40 w-[34rem] h-[34rem] rounded-full" style={{ background: "radial-gradient(circle, rgba(240,129,32,0.24), transparent 68%)" }} />
        <div className="absolute bottom-0 -right-20 w-[30rem] h-[30rem] rounded-full" style={{ background: "radial-gradient(circle, rgba(232,64,82,0.22), transparent 68%)" }} />
        <div className="absolute -bottom-28 -left-24 w-[34rem] h-[34rem] rounded-full" style={{ background: "radial-gradient(circle, rgba(212,100,162,0.26), transparent 68%)" }} />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-center relative z-10">
        {/* 左侧品牌区（lg 显示） */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block"
        >
          <div className="flex items-center gap-5 mb-7">
            <Logo size={76} />
            <div>
              <h1 className="text-4xl font-bold text-ink-900 leading-tight">心桥教师关怀</h1>
              <p className="mt-1.5 text-sm text-ink-400 font-medium">五色教师心理健康支持系统</p>
            </div>
          </div>
          <p className="text-base text-ink-500 mb-9 leading-relaxed">
            数据驱动关怀，守护教师心灵。
            <br />
            用系统化的心理支持，温暖每一份坚守。
          </p>
          <div className="glass rounded-2xl p-6 shadow-soft">
            <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-5">五色心理健康模块</p>
            <div className="flex items-center justify-between gap-2">
              {WU_SE.map((item) => (
                <div key={item.name} className="flex flex-col items-center gap-2">
                  <span className={`h-5 w-5 rounded-full ${item.color} shadow-soft ring-4 ring-white/70`}></span>
                  <span className="text-xs text-ink-500 font-medium">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 右侧认证卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md mx-auto lg:mx-0"
        >
          <div className="glass rounded-3xl p-7 sm:p-9">
            {/* 移动端品牌 */}
            <div className="lg:hidden text-center mb-6">
              <Logo size={52} className="mx-auto mb-3" />
              <h1 className="text-xl font-bold text-ink-900">心桥教师关怀</h1>
              <p className="mt-1 text-xs text-ink-500">五色心理健康系统 · 守护教师心灵</p>
            </div>

            {showForgotPassword ? (
              passwordResetDone ? (
                <div className="text-center py-6">
                  <CheckCircle size={48} className="text-meadow-500 mx-auto mb-4" />
                  <h2 className="text-lg font-bold text-ink-800 mb-2">密码重置成功</h2>
                  <p className="text-sm text-ink-500 mb-6">请使用新密码登录</p>
                  <button
                    onClick={gotoLogin}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 py-3.5 text-white font-semibold hover:bg-ink-800 transition-colors text-[15px]"
                  >
                    返回登录
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyAndReset} className="space-y-3.5">
                  <h2 className="text-xl font-bold text-ink-900 mb-5">找回密码</h2>
                  <AuthTextField
                    icon={User}
                    type="email"
                    placeholder="请输入注册时的邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <AuthTextField
                    icon={Phone}
                    type="tel"
                    placeholder="请输入手机号（未绑定则绑定）"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <AuthTextField
                    icon={Key}
                    placeholder="请输入验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    required
                    trailing={
                      <CountdownButton seconds={countdown} onClick={handleSendCode} />
                    }
                  />
                  <PasswordField
                    icon={LogIn}
                    placeholder="请输入新密码（至少6位）"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <PasswordField
                    icon={LogIn}
                    placeholder="请再次输入新密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />

                  <ErrorBanner message={authError} type="error" />
                  {resetSuccess && <ErrorBanner message="验证码已发送，请查看手机短信" type="success" />}

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 py-3 text-white font-semibold shadow-soft hover:bg-ink-800 active:translate-y-px transition-all duration-200 text-sm"
                  >
                    重置密码
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={gotoLogin}
                      className="text-sm text-ink-700 font-medium hover:text-ink-800 transition-colors"
                    >
                      返回登录
                    </button>
                  </div>
                </form>
              )
            ) : showLogin ? (
              /* ===== 登录 ===== */
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-ink-900 mb-5 text-center">欢迎回来</h2>
                {/* 登录方式切换 */}
                <div className="flex gap-1.5 glass-nav rounded-xl p-1">
                  {([
                    ['email-password', '邮箱登录'],
                    ['phone-password', '手机号密码'],
                    ['phone-code', '验证码登录'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLoginMethod(key)}
                      className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-200 ${
                        loginMethod === key
                          ? 'bg-white text-ink-700 shadow-card'
                          : 'text-ink-500 hover:text-ink-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  {/* 邮箱登录 */}
                  {loginMethod === 'email-password' && (
                    <>
                      <AuthTextField
                        icon={User}
                        type="email"
                        placeholder="请输入邮箱"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <PasswordField
                        icon={LogIn}
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </>
                  )}

                  {/* 手机号密码登录 */}
                  {loginMethod === 'phone-password' && (
                    <>
                      <AuthTextField
                        icon={Phone}
                        type="tel"
                        placeholder="请输入手机号"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        required
                      />
                      <PasswordField
                        icon={LogIn}
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </>
                  )}

                  {/* 验证码登录 */}
                  {loginMethod === 'phone-code' && (
                    <>
                      <AuthTextField
                        icon={Phone}
                        type="tel"
                        placeholder="请输入手机号"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        required
                      />
                      <AuthTextField
                        icon={Key}
                        placeholder="请输入验证码"
                        value={loginVerificationCode}
                        onChange={(e) => setLoginVerificationCode(e.target.value)}
                        required
                        trailing={
                          <CountdownButton seconds={loginCountdown} onClick={handleSendLoginCode} />
                        }
                      />
                    </>
                  )}

                  <ErrorBanner message={authError} type="error" />

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-ink-900 px-6 py-3.5 text-white font-semibold shadow-soft hover:bg-ink-800 active:translate-y-px transition-all duration-200 text-[15px]"
                  >
                    <LogIn size={17} />
                    登录
                  </button>

                  <div className="flex flex-col items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={goForgot}
                      className="text-sm text-ink-700 font-medium hover:text-ink-800 transition-colors"
                    >
                      忘记密码？
                    </button>
                    <p className="text-sm text-ink-500">
                      还没有账号？{" "}
                      <button
                        type="button"
                        onClick={goRegister}
                        className="text-ink-700 font-medium hover:text-ink-800 transition-colors"
                      >
                        立即注册
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            ) : (
              /* ===== 注册 ===== */
              <form onSubmit={handleRegister} className="space-y-3.5">
                <h2 className="text-xl font-bold text-ink-900 mb-5">创建账号</h2>
                <AuthTextField
                  icon={User}
                  type="text"
                  placeholder="请输入姓名"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <AuthTextField
                  icon={Mail}
                  type="email"
                  placeholder="请输入邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <AuthTextField
                  icon={Phone}
                  type="tel"
                  placeholder="请输入手机号"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  required
                />
                <AuthTextField
                  icon={Key}
                  placeholder="请输入验证码"
                  value={registerCode}
                  onChange={(e) => setRegisterCode(e.target.value)}
                  required
                  trailing={
                    <CountdownButton seconds={registerCountdown} onClick={handleSendRegisterCode} />
                  }
                />
                <PasswordField
                  icon={LogIn}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <ErrorBanner message={authError} type="error" />

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-ink-900 px-6 py-3.5 text-white font-semibold shadow-soft hover:bg-ink-800 active:translate-y-px transition-all duration-200 text-[15px]"
                >
                  <UserPlus size={17} />
                  注册
                </button>

                <div className="text-center">
                  <p className="text-sm text-ink-500">
                    已有账号？{" "}
                    <button
                      type="button"
                      onClick={goLogin}
                      className="text-ink-700 font-medium hover:text-ink-800 transition-colors"
                    >
                      立即登录
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-xs text-ink-400"
          >
            登录即表示同意我们的服务条款和隐私政策
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
