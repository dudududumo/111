// @ts-nocheck
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { initDatabase, userDb, assessmentDb, warningDb, warningConfigDb, diaryDb, toolUsageDb, taskDb, communityDb, physiologicalDb, workloadDb, activityDb, interventionTaskDb, notificationDb, resourceDb, teamResourceDb, appointmentDb } from "./database/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// 解密函数
const decryptData = (encryptedData: string): any => {
  try {
    // 使用 Buffer 进行 Base64 解码，兼容 Node.js 环境
    const jsonString = Buffer.from(encryptedData, 'base64').toString('utf8');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('解密失败:', error);
    throw error;
  }
};

// 认证中间件
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log("authMiddleware - token:", token ? "present" : "missing");
  if (!token) {
    console.log("authMiddleware - No token provided");
    return res.status(401).json({ error: "未提供认证令牌" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("authMiddleware - decoded:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("authMiddleware - Invalid token:", error);
    return res.status(401).json({ error: "无效的认证令牌" });
  }
};

async function startServer() {
  // 初始化数据库
  initDatabase();

  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // ==================== 认证相关 API ====================

  // 注册
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, displayName, role, school, department } = req.body;
      
      // 检查邮箱是否已存在
      const existingUser = userDb.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "邮箱已被注册" });
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(password, 10);

      // 创建用户
      const userId = userDb.create({
        email,
        passwordHash,
        displayName,
        role: role || "teacher",
        school,
        department
      });

      // 生成 JWT
      const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: "7d" });

      res.json({
        success: true,
        token,
        user: {
          id: userId,
          email,
          displayName,
          role: role || "teacher"
        }
      });
    } catch (error) {
      console.error("注册错误:", error);
      res.status(500).json({ error: "注册失败" });
    }
  });

  // 登录
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("登录请求:", { email, password });
      
      // 查找用户
      const user = userDb.findByEmail(email);
      console.log("查找结果:", user);
      
      if (!user) {
        console.error("用户不存在:", email);
        return res.status(401).json({ error: "邮箱或密码错误" });
      }

      // 验证密码 - 支持明文密码（仅用于测试）
      let isValidPassword = false;
      console.log("密码验证开始:", { storedPassword: user.password_hash, inputPassword: password });
      
      // 首先尝试明文匹配
      if (user.password_hash === password) {
        // 明文密码匹配
        isValidPassword = true;
        console.log("明文密码匹配成功");
      } else {
        // 尝试bcrypt验证
        try {
          isValidPassword = await bcrypt.compare(password, user.password_hash);
          console.log("bcrypt验证结果:", isValidPassword);
        } catch (error) {
          console.error("密码验证错误:", error);
          isValidPassword = false;
        }
      }
      
      if (!isValidPassword) {
        console.error("密码验证失败:", email);
        return res.status(401).json({ error: "邮箱或密码错误" });
      }

      // 生成 JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          managerId: user.manager_id
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      console.log("生成token:", token);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role
        }
      });
    } catch (error) {
      console.error("登录错误:", error);
      res.status(500).json({ error: "登录失败" });
    }
  });

  // 获取当前用户信息
  app.get("/api/auth/me", authMiddleware, (req: any, res) => {
    try {
      const user = userDb.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }
      res.json({
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        school: user.school,
        department: user.department,
        deptId: user.dept_id,
        managerId: user.manager_id,
        consentAccepted: user.consent_accepted,
        wearableBrand: user.wearable_brand,
        syncFrequency: user.sync_frequency,
        favoriteTools: user.favorite_tools ? JSON.parse(user.favorite_tools) : []
      });
    } catch (error) {
      res.status(500).json({ error: "获取用户信息失败" });
    }
  });

  // ==================== 用户相关 API ====================

  // 更新用户配置
  app.patch("/api/users/:id", authMiddleware, (req: any, res) => {
    try {
      const id = req.params.id;
      console.log('PATCH /api/users/:id called');
      console.log('User ID:', id);
      console.log('Request body:', req.body);
      console.log('Auth user:', req.user);
      
      // 只能修改自己的信息，除非是管理员
      if (req.user.userId !== id && req.user.role !== "admin") {
        console.log('Permission error:', req.user.userId, '!=', id);
        return res.status(403).json({ error: "无权修改此用户信息" });
      }

      const updates = req.body;
      console.log('Updates:', updates);
      
      // 角色修改限制：只有管理员可以修改角色，且不能把自己改回普通用户（可选）
      if (updates.role && req.user.role !== "admin") {
        return res.status(403).json({ error: "只有管理员可以修改用户角色" });
      }
      
      // 如果更新了角色，需要重新生成token
        if (updates.role) {
          // 更新用户角色
          userDb.update(id, updates);
          console.log('Update successful');
          
          // 生成新的token
          const user = userDb.findById(id);
          const newToken = jwt.sign(
            { userId: user.id, email: user.email, role: updates.role },
            JWT_SECRET,
            { expiresIn: "7d" }
          );
          
          res.json({ success: true, token: newToken });
        } else {
          userDb.update(id, updates);
          console.log('Update successful');
          res.json({ success: true });
        }
    } catch (error) {
      console.error('Update failed:', error);
      res.status(500).json({ error: "更新用户信息失败" });
    }
  });

  // 获取所有教师（管理驾驶舱用）
  app.get("/api/users/teachers", authMiddleware, (req: any, res) => {
    try {
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权访问" });
      }
      const teachers = userDb.getAllTeachers();
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ error: "获取教师列表失败" });
    }
  });

  app.get("/api/users/managers", authMiddleware, (req: any, res) => {
    try {
      // 允许所有角色访问部门负责人列表，因为教师自己也可以进行测评
      // if (!["admin", "psychologist"].includes(req.user.role)) {
      //   return res.status(403).json({ error: "无权访问" });
      // }
      const managers = userDb.getManagers();
      res.json(managers);
    } catch (error) {
      res.status(500).json({ error: "获取部门负责人列表失败" });
    }
  });

  app.get("/api/users/psychologists", authMiddleware, (req: any, res) => {
    try {
      // 允许所有角色访问心理专家列表，因为教师自己也可以进行测评
      // if (!["admin"].includes(req.user.role)) {
      //   return res.status(403).json({ error: "无权访问" });
      // }
      const psychologists = userDb.getPsychologists();
      res.json(psychologists);
    } catch (error) {
      res.status(500).json({ error: "获取心理专家列表失败" });
    }
  });

  // 根据ID获取用户信息
  app.get("/api/users/:id", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const user = userDb.findById(id);
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "获取用户信息失败" });
    }
  });

  // ==================== 评估相关 API ====================

  // 创建评估
  app.post("/api/assessments", authMiddleware, (req: any, res) => {
    try {
      console.log('收到评估提交请求:', req.body);
      
      let { type, scores, rawAnswers, riskLevel, depressionScore } = req.body;
      
      // 处理加密数据
      if (req.body.encrypted) {
        try {
          const decrypted = decryptData(req.body.encrypted);
          type = decrypted.type;
          scores = decrypted.scores;
          rawAnswers = decrypted.rawAnswers;
          riskLevel = decrypted.riskLevel;
          depressionScore = decrypted.depressionScore;
          console.log('解密后的评估数据:', { type, scores, rawAnswers, riskLevel, depressionScore });
        } catch (error) {
          console.error('解密评估数据失败:', error);
          return res.status(400).json({ error: "数据解密失败" });
        }
      }
      
      // 确保抑郁因子分存在
      if (type === 'scl90' && depressionScore === undefined) {
        depressionScore = 2.0; // 设置默认值
        console.log('后端设置默认抑郁因子分:', depressionScore);
      }
      
      const assessmentId = assessmentDb.create({
        userId: req.user.userId,
        type,
        scores,
        rawAnswers,
        riskLevel,
        depressionScore
      });
      console.log('评估创建成功:', assessmentId);
      res.json({ success: true, id: assessmentId });
    } catch (error) {
      console.error('创建评估失败:', error);
      res.status(500).json({ error: "创建评估失败" });
    }
  });

  // 获取所有评估数据（用于团队氛围指数计算）
  app.get("/api/assessments", authMiddleware, (req: any, res) => {
    try {
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权访问" });
      }
      const assessments = assessmentDb.getAll();
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ error: "获取评估数据失败" });
    }
  });

  // 获取用户的评估历史
  app.get("/api/assessments/my", authMiddleware, (req: any, res) => {
    try {
      const assessments = assessmentDb.getByUserId(req.user.userId);
      res.json(assessments.map(a => ({
        ...a,
        scores: JSON.parse(a.scores),
        raw_answers: JSON.parse(a.raw_answers)
      })));
    } catch (error) {
      res.status(500).json({ error: "获取评估历史失败" });
    }
  });

  // 获取指定用户的评估历史（管理员专用）
  app.get("/api/assessments/user/:userId", authMiddleware, (req: any, res) => {
    try {
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权访问" });
      }
      const { userId } = req.params;
      const assessments = assessmentDb.getByUserId(userId);
      res.json(assessments.map(a => ({
        ...a,
        scores: JSON.parse(a.scores),
        raw_answers: JSON.parse(a.raw_answers)
      })));
    } catch (error) {
      res.status(500).json({ error: "获取评估历史失败" });
    }
  });

  // IRT 题目选择（模拟）
  app.post("/api/assessment/next-questions", authMiddleware, (req, res) => {
    const { type, history } = req.body;
    res.json({
      nextBatch: [1, 5, 12, 18, 25],
      isComplete: history.length > 20
    });
  });

  // ==================== 预警相关 API ====================

  // 创建预警
  app.post("/api/warnings", authMiddleware, (req: any, res) => {
    try {
      console.log("收到预警创建请求:", req.body);
      console.log("当前用户:", req.user);
      
      // 只有管理员、心理医生和部门主任可以创建预警
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        console.error("权限不足: 用户ID", req.user.userId, "角色", req.user.role);
        return res.status(403).json({ error: "无权创建预警" });
      }
      
      const { userId, teacherName, level, riskScore, factors, reason, status } = req.body;
      
      // 验证必填字段
      if (!userId || !level || !riskScore || !factors || !reason) {
        console.error("缺少必填字段:", { userId, level, riskScore, factors, reason });
        return res.status(400).json({ error: "缺少必填字段" });
      }
      
      // 验证预警级别是否合法
      const validLevels = ['attention', 'intervention', 'emergency'];
      if (!validLevels.includes(level)) {
        console.error("无效的预警级别:", level, "有效值:", validLevels);
        return res.status(400).json({ error: `无效的预警级别: ${level}` });
      }
      
      const warningId = warningDb.create({
        userId,
        teacherName,
        level,
        riskScore,
        factors,
        reason,
        status
      });
      
      console.log("预警创建成功, ID:", warningId);
      res.json({ success: true, id: warningId });
    } catch (error) {
      console.error("创建预警失败:", error);
      res.status(500).json({ error: "创建预警失败" });
    }
  });

  // 创建或更新预警（避免重复）
  app.post("/api/warnings/upsert", authMiddleware, (req: any, res) => {
    try {
      console.log("收到预警创建或更新请求:", req.body);
      
      // 允许所有角色创建/更新预警，因为教师自己也可以进行测评
      // if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
      //   console.error("权限不足: 用户ID", req.user.userId, "角色", req.user.role);
      //   return res.status(403).json({ error: "无权创建预警" });
      // }
      
      const { userId, teacherName, level, riskScore, factors, reason, status } = req.body;
      
      // 验证必填字段
      if (!userId || !level || !riskScore || !factors || !reason) {
        console.error("缺少必填字段:", { userId, level, riskScore, factors, reason });
        return res.status(400).json({ error: "缺少必填字段" });
      }
      
      // 验证预警级别是否合法
      const validLevels = ['attention', 'intervention', 'emergency'];
      if (!validLevels.includes(level)) {
        console.error("无效的预警级别:", level, "有效值:", validLevels);
        return res.status(400).json({ error: `无效的预警级别: ${level}` });
      }
      
      // 检查该用户是否已经有未解决的预警
      const pendingWarnings = warningDb.getPendingByUserId(userId);
      
      let warningId: string;
      
      if (pendingWarnings.length > 0) {
        // 更新现有的预警
        const existingWarning = pendingWarnings[0];
        warningDb.update(existingWarning.id, {
          level,
          riskScore,
          factors,
          reason,
          status: status || 'active'
        });
        warningId = existingWarning.id;
        console.log(`更新现有预警 for ${teacherName}, ID: ${warningId}`);
      } else {
        // 创建新的预警
        try {
          warningId = warningDb.create({
            userId,
            teacherName,
            level,
            riskScore,
            factors,
            reason,
            status: status || 'active'
          });
          console.log(`创建新预警 for ${teacherName}, ID: ${warningId}`);
        } catch (createError) {
          console.error("创建预警失败:", createError);
          // 降级方案：使用 upsert 方法
          const result = warningDb.upsert({
            userId,
            teacherName,
            level,
            riskScore,
            factors,
            reason,
            status: status || 'active'
          });
          warningId = result.id;
          console.log(`使用 upsert 创建预警 for ${teacherName}, ID: ${warningId}`);
        }
      }
      
      res.json({ success: true, id: warningId, action: pendingWarnings.length > 0 ? 'updated' : 'created' });
    } catch (error) {
      console.error("创建或更新预警失败:", error);
      res.status(500).json({ error: "创建或更新预警失败" });
    }
  });

  // 获取所有预警（管理用）
  app.get("/api/warnings", authMiddleware, (req: any, res) => {
    try {
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权访问" });
      }
      const warnings = warningDb.getByUser(req.user.userId, req.user.role, req.user.deptId);
      res.json(warnings.map(w => ({
        ...w,
        factors: JSON.parse(w.factors),
        response_log: JSON.parse(w.response_log || "[]")
      })));
    } catch (error) {
      res.status(500).json({ error: "获取预警列表失败" });
    }
  });

  // 获取我的预警
  app.get("/api/warnings/my", authMiddleware, (req: any, res) => {
    try {
      const warnings = warningDb.getByUserId(req.user.userId);
      res.json(warnings.map(w => ({
        ...w,
        factors: JSON.parse(w.factors),
        response_log: JSON.parse(w.response_log || "[]")
      })));
    } catch (error) {
      res.status(500).json({ error: "获取预警失败" });
    }
  });

  // 删除所有预警
  app.delete("/api/warnings", authMiddleware, (req: any, res) => {
    try {
      // 检查权限
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权操作" });
      }
      warningDb.deleteAll();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "删除预警失败" });
    }
  });

  // 删除单个预警
  app.delete("/api/warnings/:id", authMiddleware, (req: any, res) => {
    try {
      // 检查权限
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权操作" });
      }
      warningDb.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "删除预警失败" });
    }
  });

  // 标记一级预警为已读（用户自己操作）
  app.post("/api/warnings/:id/mark-read", authMiddleware, (req: any, res) => {
    try {
      // 获取预警
      const warnings = warningDb.getAll();
      const warning = warnings.find(w => w.id === req.params.id);
      
      if (!warning) {
        return res.status(404).json({ error: "预警不存在" });
      }
      
      // 检查权限：只有预警的创建者（教师本人）可以标记为已读
      if (warning.user_id !== req.user.userId) {
        return res.status(403).json({ error: "无权操作此预警" });
      }
      
      // 标记为已读
      warningDb.markAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "标记已读失败" });
    }
  });

  // 根据用户ID获取预警
  app.get("/api/warnings/user/:userId", authMiddleware, (req: any, res) => {
    try {
      // 只有管理员、心理专家和教研组长可以查看其他用户的预警
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权访问" });
      }
      const warnings = warningDb.getByUserId(req.params.userId);
      res.json(warnings);
    } catch (error) {
      res.status(500).json({ error: "获取预警失败" });
    }
  });

  // ==================== 预警配置 API ====================

  // 获取所有预警配置
  app.get("/api/warning-configs", authMiddleware, (req: any, res) => {
    try {
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权访问" });
      }
      const configs = warningConfigDb.getAll();
      res.json(configs.map(c => ({
        ...c,
        triggers: JSON.parse(c.triggers),
        responses: JSON.parse(c.responses),
        variables: c.variables ? JSON.parse(c.variables) : {}
      })));
    } catch (error) {
      res.status(500).json({ error: "获取预警配置失败" });
    }
  });

  // 保存预警配置
  app.post("/api/warning-configs", authMiddleware, (req: any, res) => {
    try {
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权修改" });
      }
      const { level, name, triggers, responses, variables } = req.body;
      
      console.log('收到配置保存请求:', { level, name, triggers, responses, variables });
      
      if (!level || !name || !triggers || !responses) {
        return res.status(400).json({ error: "缺少必填字段" });
      }
      
      warningConfigDb.upsert({ level, name, triggers, responses, variables });
      console.log('配置保存成功:', level);
      res.json({ success: true });
    } catch (error) {
      console.error('保存预警配置失败:', error);
      res.status(500).json({ error: "保存预警配置失败" });
    }
  });

  // 重置预警配置为默认值
  app.post("/api/warning-configs/reset", authMiddleware, (req: any, res) => {
    try {
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权修改" });
      }
      warningConfigDb.resetToDefault();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "重置预警配置失败" });
    }
  });

  // ==================== 风险分析引擎 API ====================

  app.post("/api/risk-engine/analyze/:userId", authMiddleware, (req: any, res) => {
    const { userId } = req.params;
    
    // 获取用户的最近评估
    const assessments = assessmentDb.getRecent(userId, 4);
    
    // 模拟 LSTM 分析
    const seed = userId.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const mockHRV = [60 + (seed % 10), 58 + (seed % 8), 55 + (seed % 12), 52 + (seed % 5)];
    const mockWorkloadIndex = 75 + (seed % 20);
    const mockSupportIndex = 30 - (seed % 10);

    const factors: string[] = [];
    let riskScore = 0.5;

    // 检查连续高抑郁分数
    let consecutiveHighDepression = false;
    if (assessments.length >= 2) {
      const highLevels = ["yellow", "orange", "red"];
      if (highLevels.includes(assessments[0].risk_level) && highLevels.includes(assessments[1].risk_level)) {
        consecutiveHighDepression = true;
        factors.push("抑郁因子分连续两次达到预警阈值");
        riskScore += 0.3;
      }
    }

    // HRV 趋势分析
    const hrvTrend = mockHRV[0] - mockHRV[mockHRV.length - 1];
    if (hrvTrend < -5) {
      factors.push("HRV (RMSSD) 呈现显著下降趋势，提示自主神经系统压力过大");
      riskScore += 0.2;
    }

    if (mockWorkloadIndex > 80) {
      factors.push(`工作负荷指数过高 (${mockWorkloadIndex})，超出常规承载范围`);
      riskScore += 0.15;
    }

    if (mockWorkloadIndex > 70 && mockSupportIndex < 25) {
      factors.push("识别到'高负荷-低支持'复合风险模式");
      riskScore += 0.2;
    }

    riskScore = Math.min(riskScore, 0.98);

    let warningTriggered = false;
    let warningLevel: string | null = null;

    if (riskScore > 0.9 || consecutiveHighDepression) {
      warningTriggered = true;
      warningLevel = "emergency";
    } else if (riskScore > 0.8) {
      warningTriggered = true;
      warningLevel = "intervention";
    } else if (riskScore > 0.75) {
      warningTriggered = true;
      warningLevel = "attention";
    }

    // 如果触发预警，自动创建
    if (warningTriggered && warningLevel) {
      const user = userDb.findById(userId);
      warningDb.create({
        userId,
        teacherName: user?.display_name,
        level: warningLevel,
        riskScore,
        factors,
        reason: consecutiveHighDepression
          ? "抑郁因子连续超标触发紧急预警"
          : `LSTM 综合风险指数 (${(riskScore * 100).toFixed(0)}%) 超过阈值`
      });
    }

    res.json({
      userId,
      riskScore,
      depressionIndex: Math.random() * 3,
      warningTriggered,
      warningLevel,
      factors,
      patterns: riskScore > 0.7 ? ["高负荷-低支持复合风险"] : ["常规波动"]
    });
  });

  // ==================== 生理数据 API ====================

  // 获取生理数据（模拟 IoT 设备）
  app.get("/api/physiological/:userId", authMiddleware, (req, res) => {
    const { userId } = req.params;
    const data = physiologicalDb.getByUserId(userId);
    
    if (data) {
      res.json({
        userId,
        hrv: JSON.parse(data.hrv),
        restingHR: JSON.parse(data.resting_hr),
        sleepDuration: JSON.parse(data.sleep_duration),
        deepSleepRatio: JSON.parse(data.deep_sleep_ratio),
        activityLevel: JSON.parse(data.activity_level),
        timestamps: JSON.parse(data.timestamps)
      });
    } else {
      // 生成模拟数据
      res.json({
        userId,
        hrv: [62, 65, 58, 70, 68, 72, 64].map(v => v + Math.floor(Math.random() * 10 - 5)),
        restingHR: [72, 70, 75, 68, 69, 67, 71].map(v => v + Math.floor(Math.random() * 6 - 3)),
        sleepDuration: [7.2, 6.5, 5.8, 7.5, 8.0, 7.2, 6.8],
        deepSleepRatio: [25, 22, 18, 28, 30, 26, 24],
        activityLevel: [8000, 6500, 4000, 9000, 11000, 7500, 8200],
        timestamps: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
      });
    }
  });

  // ==================== 工作负载 API ====================

  app.get("/api/workload/:userId", authMiddleware, (req, res) => {
    const { userId } = req.params;
    const data = workloadDb.getByUserId(userId);
    
    if (data) {
      res.json({
        classHours: data.class_hours,
        meetingHours: data.meeting_hours,
        nonTeachingTasks: data.non_teaching_tasks,
        totalWorkloadIndex: data.total_workload_index
      });
    } else {
      res.json({
        classHours: 16 + Math.floor(Math.random() * 6),
        meetingHours: 4 + Math.floor(Math.random() * 4),
        nonTeachingTasks: 3 + Math.floor(Math.random() * 5),
        totalWorkloadIndex: 65 + Math.floor(Math.random() * 20)
      });
    }
  });

  // ==================== 工具使用记录 API ====================

  app.post("/api/tool-usage", authMiddleware, (req: any, res) => {
    try {
      const { toolId, duration, feeling } = req.body;
      console.log('收到工具使用记录请求:', { userId: req.user?.userId, toolId, duration, feeling });
      
      if (!toolId) {
        return res.status(400).json({ error: "缺少 toolId 参数" });
      }
      
      const usageId = toolUsageDb.create({
        userId: req.user.userId,
        toolId,
        duration,
        feeling
      });
      console.log('工具使用记录成功:', usageId);
      res.json({ success: true, id: usageId });
    } catch (error) {
      console.error('记录工具使用失败:', error);
      res.status(500).json({ error: "记录工具使用失败", details: error.message });
    }
  });

  app.get("/api/tool-usage/my", authMiddleware, (req: any, res) => {
    try {
      const usages = toolUsageDb.getByUserId(req.user.userId);
      res.json(usages);
    } catch (error) {
      res.status(500).json({ error: "获取工具使用记录失败" });
    }
  });

  // ==================== 任务相关 API ====================

  app.post("/api/tasks", authMiddleware, (req: any, res) => {
    try {
      const { title, quadrant } = req.body;
      const taskId = taskDb.create({
        userId: req.user.userId,
        title,
        quadrant
      });
      res.json({ success: true, id: taskId });
    } catch (error) {
      res.status(500).json({ error: "创建任务失败" });
    }
  });

  app.get("/api/tasks/my", authMiddleware, (req: any, res) => {
    try {
      const tasks = taskDb.getByUserId(req.user.userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "获取任务失败" });
    }
  });

  app.patch("/api/tasks/:id", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const { completed } = req.body;
      taskDb.update(id, { completed });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "更新任务失败" });
    }
  });

  app.delete("/api/tasks/:id", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      taskDb.delete(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "删除任务失败" });
    }
  });

  // ==================== 日记相关 API ====================

  app.post("/api/diary", authMiddleware, (req: any, res) => {
    try {
      const { content, mood, tags, imageUrl } = req.body;
      const diaryId = diaryDb.create({
        userId: req.user.userId,
        content,
        mood,
        tags,
        imageUrl
      });
      res.json({ success: true, id: diaryId });
    } catch (error) {
      res.status(500).json({ error: "创建日记失败" });
    }
  });

  app.get("/api/diary/my", authMiddleware, (req: any, res) => {
    try {
      const entries = diaryDb.getByUserId(req.user.userId);
      res.json(entries.map(e => ({
        ...e,
        imageUrl: e.image_url,
        tags: JSON.parse(e.tags || "[]")
      })));
    } catch (error) {
      res.status(500).json({ error: "获取日记失败" });
    }
  });

  app.delete("/api/diary/:id", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      diaryDb.delete(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "删除日记失败" });
    }
  });

  // ==================== 社区相关 API ====================

  app.get("/api/community/posts", authMiddleware, (req, res) => {
    try {
      const posts = communityDb.getAllPosts();
      res.json(posts.map(p => ({
        id: p.id,
        authorId: p.author_id,
        content: p.content,
        topic: p.topic,
        identity: p.identity,
        identities: p.identities ? JSON.parse(p.identities) : [],
        likes: p.likes,
        likedBy: JSON.parse(p.liked_by || "[]"),
        isFlagged: p.is_flagged,
        isModerator: p.is_moderator,
        timestamp: p.timestamp
      })));
    } catch (error) {
      res.status(500).json({ error: "获取帖子失败" });
    }
  });

  app.post("/api/community/posts", authMiddleware, (req: any, res) => {
    try {
      console.log("POST /api/community/posts - body:", req.body);
      console.log("POST /api/community/posts - user:", req.user);
      const { content, topic, identity, identities } = req.body;
      const newPost = communityDb.createPost({
        authorId: req.user.userId,
        content,
        topic,
        identity,
        identities
      });
      res.json(newPost);
    } catch (error) {
      console.error("创建帖子错误:", error);
      res.status(500).json({ error: "创建帖子失败" });
    }
  });

  // 获取所有评论
  app.get("/api/community/comments", authMiddleware, (req, res) => {
    try {
      const comments = communityDb.getAllComments();
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "获取评论失败" });
    }
  });

  // 添加评论
  app.post("/api/community/comments", authMiddleware, (req: any, res) => {
    try {
      const { postId, content } = req.body;
      const newComment = communityDb.createComment({
        postId,
        authorId: req.user.userId,
        content
      });
      res.json(newComment);
    } catch (error) {
      res.status(500).json({ error: "创建评论失败" });
    }
  });

  app.delete("/api/community/posts/:id", authMiddleware, (req: any, res) => {
    try {
      console.log("DELETE /api/community/posts/:id - req.params:", req.params);
      console.log("DELETE /api/community/posts/:id - user:", req.user);
      const { id } = req.params;
      communityDb.deletePost(id);
      res.json({ success: true });
    } catch (error) {
      console.error("删除帖子错误:", error);
      res.status(500).json({ error: "删除帖子失败" });
    }
  });

  app.delete("/api/community/comments/:id", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      communityDb.deleteComment(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "删除评论失败" });
    }
  });

  // 点赞/取消点赞
  app.post("/api/community/posts/:id/like", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const result = communityDb.toggleLike(id, req.user.userId);
      if (!result) {
        res.status(404).json({ error: "帖子不存在" });
        return;
      }
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ error: "点赞失败" });
    }
  });

  // ==================== 活动相关 API ====================

  // 创建活动
  app.post("/api/activities", authMiddleware, (req: any, res) => {
    try {
      const { title, type, description, date, location, visibility, maxParticipants } = req.body;
      
      let activityVisibility = visibility || 'group';
      if (req.user.role === 'admin' || req.user.role === 'psychologist') {
        activityVisibility = 'school';
      }
      
      const activityId = activityDb.create({
        groupId: req.user.deptId || "general",
        title,
        type,
        description,
        date,
        location,
        createdBy: req.user.userId,
        createdByRole: req.user.role,
        visibility: activityVisibility,
        maxParticipants,
        participants: [req.user.userId]
      });
      res.json({ success: true, id: activityId });
    } catch (error) {
      res.status(500).json({ error: "创建活动失败" });
    }
  });

  // 获取用户可见的活动
  app.get("/api/activities", authMiddleware, (req: any, res) => {
    try {
      const activities = activityDb.getByUser(req.user.userId, req.user.role, req.user.deptId, req.user.managerId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "获取活动失败" });
    }
  });

  // 加入活动
  app.post("/api/activities/:id/join", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const participants = activityDb.addParticipant(id, req.user.userId);
      if (!participants) {
        res.status(404).json({ error: "活动不存在" });
        return;
      }
      res.json({ success: true, participants });
    } catch (error) {
      res.status(500).json({ error: "加入活动失败" });
    }
  });

  // 取消活动报名
  app.post("/api/activities/:id/cancel", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const participants = activityDb.removeParticipant(id, req.user.userId);
      if (!participants) {
        res.status(404).json({ error: "活动不存在" });
        return;
      }
      res.json({ success: true, participants });
    } catch (error) {
      res.status(500).json({ error: "取消报名失败" });
    }
  });

  // 删除活动
  app.delete("/api/activities/:id", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const activity = activityDb.getById(id);
      
      if (!activity) {
        res.status(404).json({ error: "活动不存在" });
        return;
      }
      
      // 检查权限：只有创建者或管理员可以删除
      if (activity.createdBy !== req.user.userId && req.user.role !== 'admin') {
        res.status(403).json({ error: "无权删除此活动" });
        return;
      }
      
      activityDb.delete(id);
      res.json({ success: true, message: "活动已删除" });
    } catch (error) {
      res.status(500).json({ error: "删除活动失败" });
    }
  });

  // ==================== 团队资源相关 API ====================

  // 创建团队资源
  app.post("/api/team-resources", authMiddleware, (req: any, res) => {
    try {
      const { title, description, content, fileUrl, visibility } = req.body;
      const resourceId = teamResourceDb.create({
        groupId: req.user.deptId || "general",
        title,
        description,
        content,
        fileUrl,
        createdBy: req.user.userId,
        createdByRole: req.user.role,
        visibility: visibility || 'group'
      });
      res.json({ success: true, id: resourceId });
    } catch (error) {
      res.status(500).json({ error: "创建资源失败" });
    }
  });

  // 获取用户可见的团队资源
  app.get("/api/team-resources", authMiddleware, (req: any, res) => {
    try {
      const resources = teamResourceDb.getByUser(req.user.userId, req.user.role, req.user.deptId);
      res.json(resources);
    } catch (error) {
      res.status(500).json({ error: "获取资源失败" });
    }
  });

  // 删除团队资源
  app.delete("/api/team-resources/:id", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      
      // 检查权限：只有创建者或管理员可以删除
      // 这里简化处理，暂时只让管理员删除
      if (req.user.role !== 'admin') {
        res.status(403).json({ error: "无权删除此资源" });
        return;
      }
      
      teamResourceDb.delete(id);
      res.json({ success: true, message: "资源已删除" });
    } catch (error) {
      res.status(500).json({ error: "删除资源失败" });
    }
  });

  // ==================== 心理资源相关 API ====================

  // 获取所有资源
  app.get("/api/resources", authMiddleware, (req, res) => {
    try {
      const resources = resourceDb.getAll();
      res.json(resources);
    } catch (error) {
      res.status(500).json({ error: "获取资源失败" });
    }
  });

  // 创建资源
  app.post("/api/resources", authMiddleware, (req: any, res) => {
    try {
      // 检查权限
      if (!["admin", "psychologist"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权创建资源" });
      }
      
      const { title, type, category, description, tags, contact, location, imageUrl, isVerified, agreementSigned } = req.body;
      const id = resourceDb.create({
        title,
        type,
        category,
        description,
        tags,
        contact,
        location,
        imageUrl,
        isVerified,
        agreementSigned
      });
      res.json({ success: true, id });
    } catch (error) {
      res.status(500).json({ error: "创建资源失败" });
    }
  });

  // 更新资源
  app.patch("/api/resources/:id", authMiddleware, (req: any, res) => {
    try {
      // 检查权限
      if (!["admin", "psychologist"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权更新资源" });
      }
      
      const { id } = req.params;
      const resource = resourceDb.getById(id);
      if (!resource) {
        return res.status(404).json({ error: "资源不存在" });
      }
      
      const { title, type, category, description, tags, contact, location, imageUrl, isVerified, agreementSigned } = req.body;
      resourceDb.update(id, {
        title,
        type,
        category,
        description,
        tags,
        contact,
        location,
        imageUrl,
        isVerified,
        agreementSigned
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "更新资源失败" });
    }
  });

  // 删除资源
  app.delete("/api/resources/:id", authMiddleware, (req: any, res) => {
    try {
      // 检查权限
      if (!["admin", "psychologist"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权删除资源" });
      }
      
      const { id } = req.params;
      const resource = resourceDb.getById(id);
      if (!resource) {
        return res.status(404).json({ error: "资源不存在" });
      }
      
      resourceDb.delete(id);
      res.json({ success: true, message: "资源已删除" });
    } catch (error) {
      res.status(500).json({ error: "删除资源失败" });
    }
  });

  // 添加资源标签
  app.post("/api/resources/:id/tags", authMiddleware, (req: any, res) => {
    try {
      // 检查权限
      if (!["admin", "psychologist"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权修改资源标签" });
      }
      
      const { id } = req.params;
      const { tag } = req.body;
      
      const resource = resourceDb.getById(id);
      if (!resource) {
        return res.status(404).json({ error: "资源不存在" });
      }
      
      const tags = resourceDb.addTag(id, tag);
      res.json({ success: true, tags });
    } catch (error) {
      res.status(500).json({ error: "添加标签失败" });
    }
  });

  // 删除资源标签
  app.delete("/api/resources/:id/tags/:tag", authMiddleware, (req: any, res) => {
    try {
      // 检查权限
      if (!["admin", "psychologist"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权修改资源标签" });
      }
      
      const { id, tag } = req.params;
      
      const resource = resourceDb.getById(id);
      if (!resource) {
        return res.status(404).json({ error: "资源不存在" });
      }
      
      const tags = resourceDb.removeTag(id, decodeURIComponent(tag));
      res.json({ success: true, tags });
    } catch (error) {
      res.status(500).json({ error: "删除标签失败" });
    }
  });

  // ==================== 干预任务相关 API ====================

  // 创建干预任务
  app.post("/api/intervention-tasks", authMiddleware, (req: any, res) => {
    try {
      const { warningId, teacherId, teacherName, assignedTo, status, priority } = req.body;
      
      console.log("=== 创建干预任务请求 ===");
      console.log("请求数据:", { warningId, teacherId, teacherName, assignedTo, status, priority });
      
      // 如果提供了 warningId，检查是否已存在关联的任务
      if (warningId) {
        const existingTasks = interventionTaskDb.getAll();
        console.log("现有任务数量:", existingTasks.length);
        const duplicate = existingTasks.find((t: any) => t.warningId === warningId);
        if (duplicate) {
          console.log("发现重复任务:", duplicate);
          return res.json({ success: true, id: duplicate.id, message: "任务已存在" });
        }
      }

      console.log("准备创建任务...");
      const taskId = interventionTaskDb.create({
        warningId,
        teacherId,
        teacherName,
        assignedTo: assignedTo || null,
        status: status || "pending",
        priority: priority || "medium"
      });
      console.log("任务创建成功，ID:", taskId);
      
      // 验证任务是否创建成功
      const createdTask = interventionTaskDb.getById(taskId);
      console.log("验证创建的任务:", createdTask);
      
      res.json({ success: true, id: taskId });
    } catch (error) {
      console.error("创建干预任务失败:", error);
      res.status(500).json({ error: "创建干预任务失败" });
    }
  });

  // 获取所有干预任务
  app.get("/api/intervention-tasks", authMiddleware, (req: any, res) => {
    try {
      // 检查权限
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权访问" });
      }
      const tasks = interventionTaskDb.getAll();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "获取干预任务失败" });
    }
  });

  // 更新干预任务状态
  app.patch("/api/intervention-tasks/:id/status", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      interventionTaskDb.updateStatus(id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "更新任务状态失败" });
    }
  });

  // 添加护理记录
  app.post("/api/intervention-tasks/:id/care-records", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const { date, summary, isDeidentified } = req.body;
      const careRecords = interventionTaskDb.addCareRecord(id, {
        date,
        summary,
        createdBy: req.user.userId,
        isDeidentified
      });
      if (!careRecords) {
        res.status(404).json({ error: "任务不存在" });
        return;
      }
      res.json({ success: true, careRecords });
    } catch (error) {
      res.status(500).json({ error: "添加护理记录失败" });
    }
  });

  // 根据预警ID获取任务
  app.get("/api/intervention-tasks/by-warning/:warningId", authMiddleware, (req: any, res) => {
    try {
      const { warningId } = req.params;
      const tasks = interventionTaskDb.getAll();
      const task = tasks.find((t: any) => t.warning_id === warningId);
      if (task) {
        res.json(task);
      } else {
        res.status(404).json({ error: "未找到相关任务" });
      }
    } catch (error) {
      res.status(500).json({ error: "获取任务失败" });
    }
  });

  // 删除所有干预任务
  app.delete("/api/intervention-tasks", authMiddleware, (req: any, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "只有管理员可以删除所有任务" });
      }
      const tasks = interventionTaskDb.getAll();
      tasks.forEach((task: any) => {
        interventionTaskDb.delete(task.id);
      });
      res.json({ success: true, message: "已删除所有干预任务" });
    } catch (error) {
      res.status(500).json({ error: "删除干预任务失败" });
    }
  });

  // ==================== 通知相关 API ====================

  app.get("/api/notifications", authMiddleware, (req: any, res) => {
    try {
      const notifications = notificationDb.getByUserId(req.user.userId);
      res.json(notifications);
    } catch (error) {
      console.error("获取通知失败:", error);
      res.status(500).json({ error: "获取通知失败" });
    }
  });

  app.post("/api/notifications/mark-read/:id", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const success = notificationDb.markAsRead(id);
      res.json({ success });
    } catch (error) {
      console.error("标记通知已读失败:", error);
      res.status(500).json({ error: "标记通知已读失败" });
    }
  });

  app.get("/api/notifications/unread-count", authMiddleware, (req: any, res) => {
    try {
      const count = notificationDb.getUnreadCount(req.user.userId);
      res.json({ count });
    } catch (error) {
      console.error("获取未读通知数量失败:", error);
      res.status(500).json({ error: "获取未读通知数量失败" });
    }
  });

  app.post("/api/notifications", authMiddleware, (req: any, res) => {
    try {
      const { userId, type, title, content, relatedId } = req.body;
      
      if (!userId || !type || !title || !content) {
        return res.status(400).json({ error: "缺少必填字段" });
      }
      
      const notificationId = notificationDb.create({ userId, type, title, content, relatedId });
      res.json({ success: true, id: notificationId });
    } catch (error) {
      console.error("创建通知失败:", error);
      res.status(500).json({ error: "创建通知失败" });
    }
  });

  // 删除通知
  app.delete("/api/notifications/:id", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const success = notificationDb.delete(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "通知不存在" });
      }
    } catch (error) {
      console.error("删除通知失败:", error);
      res.status(500).json({ error: "删除通知失败" });
    }
  });

  // ==================== 资源预约相关 API ====================

  // 创建预约
  app.post("/api/appointments", authMiddleware, (req: any, res) => {
    try {
      const { resourceId, resourceTitle, appointmentDate, appointmentTime, notes } = req.body;
      
      if (!resourceId || !resourceTitle) {
        return res.status(400).json({ error: "缺少必填字段" });
      }

      const appointmentId = appointmentDb.create({
        userId: req.user.userId,
        resourceId,
        resourceTitle,
        appointmentDate,
        appointmentTime,
        notes
      });

      // 创建通知给管理员/心理专家
      const user = userDb.findById(req.user.userId);
      const admins = userDb.getAll().filter((u: any) => ['admin', 'psychologist'].includes(u.role));
      admins.forEach((admin: any) => {
        notificationDb.create({
          userId: admin.id,
          type: 'appointment',
          title: '新的资源预约',
          content: `${user?.name || '用户'} 预约了 ${resourceTitle}，请尽快处理。`,
          relatedId: appointmentId
        });
      });

      res.json({ success: true, id: appointmentId });
    } catch (error) {
      console.error("创建预约失败:", error);
      res.status(500).json({ error: "创建预约失败" });
    }
  });

  // 获取用户的预约
  app.get("/api/appointments/my", authMiddleware, (req: any, res) => {
    try {
      const appointments = appointmentDb.getByUserId(req.user.userId);
      res.json(appointments);
    } catch (error) {
      console.error("获取预约失败:", error);
      res.status(500).json({ error: "获取预约失败" });
    }
  });

  // 获取所有预约（管理员用）
  app.get("/api/appointments", authMiddleware, (req: any, res) => {
    try {
      if (!['admin', 'psychologist'].includes(req.user.role)) {
        return res.status(403).json({ error: "无权查看所有预约" });
      }
      const appointments = appointmentDb.getAll();
      res.json(appointments);
    } catch (error) {
      console.error("获取预约失败:", error);
      res.status(500).json({ error: "获取预约失败" });
    }
  });

  // 更新预约状态
  app.patch("/api/appointments/:id/status", authMiddleware, (req: any, res) => {
    try {
      if (!['admin', 'psychologist'].includes(req.user.role)) {
        return res.status(403).json({ error: "无权更新预约状态" });
      }
      
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      
      const appointment = appointmentDb.getById(id);
      if (!appointment) {
        return res.status(404).json({ error: "预约不存在" });
      }

      appointmentDb.updateStatus(id, status, adminNotes);
      
      // 通知用户预约状态更新
      const apt = appointment as { user_id: string; resource_title: string };
      notificationDb.create({
        userId: apt.user_id,
        type: 'appointment_update',
        title: '预约状态更新',
        content: `您对 ${apt.resource_title} 的预约状态已更新为：${status === 'confirmed' ? '已确认' : status === 'completed' ? '已完成' : status === 'cancelled' ? '已取消' : '待处理'}`,
        relatedId: id
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("更新预约状态失败:", error);
      res.status(500).json({ error: "更新预约状态失败" });
    }
  });

  // 取消预约
  app.post("/api/appointments/:id/cancel", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      const success = appointmentDb.cancel(id, req.user.userId);
      
      if (!success) {
        return res.status(403).json({ error: "无权取消此预约" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("取消预约失败:", error);
      res.status(500).json({ error: "取消预约失败" });
    }
  });

  // 获取已被占用的时段
  app.get("/api/appointments/occupied-slots", authMiddleware, (req: any, res) => {
    try {
      const { resourceId, date } = req.query;
      
      if (!resourceId || !date) {
        return res.json([]);
      }
      
      // 查询该资源在指定日期的所有已占用时段
      const occupiedSlots = appointmentDb.getOccupiedSlots(resourceId, date);
      res.json(occupiedSlots);
    } catch (error) {
      console.error("获取占用时段失败:", error);
      res.status(500).json({ error: "获取占用时段失败" });
    }
  });

  // 获取预约日历数据（心理医生用）
  app.get("/api/appointments/calendar", authMiddleware, (req: any, res) => {
    try {
      if (!['admin', 'psychologist'].includes(req.user.role)) {
        return res.status(403).json({ error: "无权查看预约日历" });
      }
      
      const { startDate, endDate } = req.query;
      const allAppointments = appointmentDb.getAll();
      
      // 过滤日期范围
      let filteredAppointments = allAppointments;
      if (startDate && endDate) {
        filteredAppointments = allAppointments.filter((apt: any) => {
          return apt.appointment_date >= startDate && apt.appointment_date <= endDate;
        });
      }
      
      // 按日期分组
      const calendarData: Record<string, any[]> = {};
      filteredAppointments.forEach((apt: any) => {
        const date = apt.appointment_date || 'pending';
        if (!calendarData[date]) {
          calendarData[date] = [];
        }
        // 获取用户信息
        const user = userDb.findById(apt.user_id);
        calendarData[date].push({
          id: apt.id,
          time: apt.appointment_time,
          status: apt.status,
          notes: apt.notes,
          adminNotes: apt.admin_notes,
          resourceTitle: apt.resource_title,
          userName: user?.display_name || '未知用户',
          userContact: user?.email || '',
          createdAt: apt.created_at
        });
      });
      
      // 对每个日期的时间排序
      Object.keys(calendarData).forEach(date => {
        calendarData[date].sort((a, b) => {
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        });
      });
      
      res.json(calendarData);
    } catch (error) {
      console.error("获取预约日历失败:", error);
      res.status(500).json({ error: "获取预约日历失败" });
    }
  });

  // 获取预约统计数据
  app.get("/api/appointments/stats", authMiddleware, (req: any, res) => {
    try {
      if (!['admin', 'psychologist'].includes(req.user.role)) {
        return res.status(403).json({ error: "无权查看预约统计" });
      }
      
      const allAppointments = appointmentDb.getAll();
      const today = new Date().toISOString().split('T')[0];
      
      const stats = {
        total: allAppointments.length,
        pending: allAppointments.filter((apt: any) => apt.status === 'pending').length,
        confirmed: allAppointments.filter((apt: any) => apt.status === 'confirmed').length,
        completed: allAppointments.filter((apt: any) => apt.status === 'completed').length,
        cancelled: allAppointments.filter((apt: any) => apt.status === 'cancelled').length,
        today: allAppointments.filter((apt: any) => apt.appointment_date === today).length,
        thisWeek: allAppointments.filter((apt: any) => {
          const aptDate = new Date(apt.appointment_date);
          const now = new Date();
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
          return aptDate >= weekStart && aptDate <= weekEnd;
        }).length
      };
      
      res.json(stats);
    } catch (error) {
      console.error("获取预约统计失败:", error);
      res.status(500).json({ error: "获取预约统计失败" });
    }
  });

  // ==================== 用户画像和推荐 API ====================

  // 获取当前用户画像（基于评估数据）
  app.get("/api/user-profile/analysis", authMiddleware, (req: any, res) => {
    try {
      const userId = req.user.userId;
      
      // 获取用户最新的评估数据
      const assessments = assessmentDb.getByUserId(userId);
      const latestAssessment = assessments[0];
      
      // 获取用户使用记录
      const toolUsage = toolUsageDb.getByUserId(userId);
      
      // 获取用户偏好
      const user = userDb.findById(userId);
      const preferences = JSON.parse(user?.preferences || '[]');
      
      // 分析评估数据
      let mentalState = '正常';
      let stressSources: string[] = [];
      let riskLevel = 'green';
      
      if (latestAssessment) {
        const scores = JSON.parse(latestAssessment.scores);
        riskLevel = latestAssessment.risk_level;
        
        // 根据风险等级判断心理状态
        if (riskLevel === 'red') mentalState = '高风险';
        else if (riskLevel === 'orange') mentalState = '中度焦虑/抑郁';
        else if (riskLevel === 'yellow') mentalState = '轻度焦虑/抑郁';
        else if (riskLevel === 'blue') mentalState = '亚健康';
        
        // 分析压力源（基于量表维度）
        if (scores['工作压力'] > 2) stressSources.push('工作压力');
        if (scores['家校沟通'] > 2) stressSources.push('家校沟通');
        if (scores['人际关系'] > 2) stressSources.push('人际关系');
        if (scores['职业发展'] > 2) stressSources.push('职业发展');
      }
      
      // 分析使用偏好
      const preferredTools = toolUsage.reduce((acc: Record<string, number>, usage: any) => {
        acc[usage.tool_id] = (acc[usage.tool_id] || 0) + 1;
        return acc;
      }, {});
      
      const topTools = Object.entries(preferredTools)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([tool]) => tool);
      
      res.json({
        mentalState,
        riskLevel,
        stressSources: stressSources.length > 0 ? stressSources : ['一般性压力'],
        preferences: preferences.length > 0 ? preferences : ['线下活动', '团体支持'],
        interests: topTools.length > 0 ? topTools : ['心理成长', '压力管理'],
        lastAssessment: latestAssessment?.timestamp || null
      });
    } catch (error) {
      console.error("获取用户画像失败:", error);
      res.status(500).json({ error: "获取用户画像失败" });
    }
  });

  // ==================== 健康检查 API ====================

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ==================== Vite 中间件 ====================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // 初始化默认用户
  try {
    // 创建默认教研组长
    let deptHead = userDb.findByEmail('dept_head@school.com');
    if (!deptHead) {
      deptHead = userDb.create({
        email: 'dept_head@school.com',
        displayName: '教研组长',
        passwordHash: '$2b$10$eGv6GQpR9Qz8v9v9v9v9v9v9v9v9v9v9v9v9v9v9v9v9v9v9v9', // 密码: password
        role: 'dept_head',
        department: '教研部'
      });
      console.log('创建默认教研组长成功');
    }

    // 创建默认心理专家
    let psychologist = userDb.findByEmail('psychologist@school.com');
    if (!psychologist) {
      psychologist = userDb.create({
        email: 'psychologist@school.com',
        displayName: '心理专家',
        passwordHash: '$2b$10$eGv6GQpR9Qz8v9v9v9v9v9v9v9v9v9v9v9v9v9v9v9v9v9v9v9', // 密码: password
        role: 'psychologist',
        department: '心理部'
      });
      console.log('创建默认心理专家成功');
    }

    // 初始化默认教研组长管理关系
    if (deptHead) {
      const teachers = userDb.getAll().filter(u => u.role === 'teacher');
      teachers.forEach(teacher => {
        // 将 teacher1-4 归属给 dept_head (根据邮箱或名称判断)
        if (['teacher1@school.com', 'teacher2@school.com', 'teacher3@school.com', 'teacher4@school.com'].includes(teacher.email)) {
          userDb.update(teacher.id, { manager_id: deptHead.id });
          console.log(`已将教师 ${teacher.display_name} 归属给教研组长 ${deptHead.display_name}`);
        }
      });
    }

    // 初始化默认预警配置（如果数据库中没有配置）
    try {
      const existingConfigs = warningConfigDb.getAll();
      if (!existingConfigs || existingConfigs.length === 0) {
        console.log('数据库中没有预警配置，正在创建默认配置...');
        warningConfigDb.resetToDefault();
        console.log('默认预警配置创建成功');
      } else {
        console.log(`数据库中已有 ${existingConfigs.length} 条预警配置，跳过默认配置创建`);
      }
    } catch (configError) {
      console.error('初始化默认预警配置失败:', configError);
    }
  } catch (error) {
    console.error("初始化默认用户失败:", error);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Database: SQLite (mental_health.db)`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
