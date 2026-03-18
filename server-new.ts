import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { initDatabase, userDb, assessmentDb, warningDb, warningConfigDb, diaryDb, toolUsageDb, taskDb, communityDb, physiologicalDb, workloadDb, activityDb, interventionTaskDb } from "./database/db.js";

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
        { userId: user.id, email: user.email, role: user.role },
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
      // 检查权限
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权访问" });
      }

      const teachers = userDb.getAllTeachers();
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ error: "获取教师列表失败" });
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
      
      // 只有管理员、心理医生和部门主任可以创建/更新预警
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
          status: status || 'pending'
        });
        warningId = existingWarning.id;
        console.log(`更新现有预警 for ${teacherName}, ID: ${warningId}`);
      } else {
        // 创建新的预警
        warningId = warningDb.create({
          userId,
          teacherName,
          level,
          riskScore,
          factors,
          reason,
          status: status || 'pending'
        });
        console.log(`创建新预警 for ${teacherName}, ID: ${warningId}`);
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
      const warnings = warningDb.getAll();
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
      const { level, name, threshold, triggers, responses, variables } = req.body;
      
      console.log('收到配置保存请求:', { level, name, threshold, triggers, responses, variables });
      
      if (!level || !name || threshold === undefined || !triggers || !responses) {
        return res.status(400).json({ error: "缺少必填字段" });
      }
      
      warningConfigDb.upsert({ level, name, threshold, triggers, responses, variables });
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
      const { title, type, description, date, location } = req.body;
      const activityId = activityDb.create({
        groupId: req.user.deptId || "general",
        title,
        type,
        description,
        date,
        location,
        createdBy: req.user.userId,
        participants: [req.user.userId]
      });
      res.json({ success: true, id: activityId });
    } catch (error) {
      res.status(500).json({ error: "创建活动失败" });
    }
  });

  // 获取所有活动
  app.get("/api/activities", authMiddleware, (req, res) => {
    try {
      const activities = activityDb.getAll();
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

  // ==================== 干预任务相关 API ====================

  // 创建干预任务
  app.post("/api/intervention-tasks", authMiddleware, (req: any, res) => {
    try {
      const { warningId, teacherId, teacherName, assignedTo, status, priority } = req.body;
      const taskId = interventionTaskDb.create({
        warningId,
        teacherId,
        teacherName,
        assignedTo,
        status: status || "pending",
        priority: priority || "medium"
      });
      res.json({ success: true, id: taskId });
    } catch (error) {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Database: SQLite (mental_health.db)`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
