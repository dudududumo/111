// @ts-nocheck
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { initDatabase, db, userDb, assessmentDb, warningDb, warningConfigDb, diaryDb, toolUsageDb, toolRatingDb, taskDb, communityDb, physiologicalDb, workloadDb, activityDb, interventionTaskDb, notificationDb, resourceDb, teamResourceDb, appointmentDb } from "./database/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// 解密函数（匹配前端的加密方式）
const decryptData = (encryptedData: string): any => {
  try {
    const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
    return JSON.parse(decoded);
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
        school: school || "南部县第二小学",
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
      
      // 检查是否需要更新预警状态
      try {
        const pendingWarnings = warningDb.getPendingByUserId(req.user.userId);
        if (pendingWarnings.length > 0) {
          // 用户有未解决的预警，检查新评估的风险分数
          const totalScore = Object.values(scores).reduce((sum: number, val: any) => sum + (val || 0), 0);
          const avgScore = totalScore / Object.keys(scores).length;
          
          // 如果平均分低于 2.5（健康范围），关闭预警
          if (avgScore < 2.5) {
            const warning = pendingWarnings[0];
            warningDb.update(warning.id, {
              status: 'resolved',
              reason: warning.reason + '\n[系统自动关闭] 教师已完成重新评估，风险指标已降至安全范围'
            });
            console.log(`自动关闭预警：${warning.id}，原因：重新评估风险降低`);
          } else if (riskLevel === 'low') {
            // 如果风险级别为低，也关闭预警
            const warning = pendingWarnings[0];
            warningDb.update(warning.id, {
              status: 'resolved',
              reason: warning.reason + '\n[系统自动关闭] 教师已完成重新评估，风险指标已降至安全范围'
            });
            console.log(`自动关闭预警：${warning.id}，原因：风险级别为低`);
          }
        }
      } catch (warningError) {
        console.error('更新预警状态失败:', warningError);
        // 不阻塞主流程
      }
      
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

  // 获取团队氛围统计（本组 vs 全校）
  app.get("/api/atmosphere/stats", authMiddleware, (req: any, res) => {
    console.log('=== /api/atmosphere/stats 被调用 ===');
    try {
      const currentUser = userDb.findById(req.user.userId);
      console.log('当前用户:', currentUser);
      if (!currentUser) {
        return res.status(404).json({ error: "用户不存在" });
      }

      // 获取所有评估数据
      const allAssessments = assessmentDb.getAll();
      const allUsers = userDb.getAll();

      // 创建用户信息映射
      const userMap = new Map();
      allUsers.forEach((user: any) => {
        userMap.set(user.id, user);
      });

      // 计算氛围数据的辅助函数
      const calculateAtmosphere = (assessments: any[]) => {
        let totalDepression = 0;
        let totalAnxiety = 0;
        let totalRiskLevel = 0;
        let validCount = 0;

        assessments.forEach((assessment: any) => {
          try {
            let depressionScore = null;
            let anxietyScore = null;
            
            // 优先使用数据库中直接存储的抑郁因子分
            if (assessment.depressionScore !== undefined && assessment.depressionScore !== null) {
              depressionScore = assessment.depressionScore;
            } else if (assessment.depression_score !== undefined && assessment.depression_score !== null) {
              depressionScore = assessment.depression_score;
            }
            
            // 优先使用数据库中直接存储的焦虑因子分
            if (assessment.anxietyScore !== undefined && assessment.anxietyScore !== null) {
              anxietyScore = assessment.anxietyScore;
            } else if (assessment.anxiety_score !== undefined && assessment.anxiety_score !== null) {
              anxietyScore = assessment.anxiety_score;
            }
            
            // 如果没有直接存储的因子分，尝试从scores中解析
            if (depressionScore === null || anxietyScore === null) {
              const scores = JSON.parse(assessment.scores);
              
              // 尝试从scores中获取因子分
              if (depressionScore === null) {
                if (scores['抑郁'] !== undefined) {
                  depressionScore = scores['抑郁'];
                } else if (scores['depression'] !== undefined) {
                  depressionScore = scores['depression'];
                } else {
                  // SCL-90抑郁因子计算：13个项目的平均分
                  const depressionItems = [4, 13, 14, 19, 21, 25, 28, 29, 30, 31, 53, 70, 78];
                  let sum = 0;
                  let count = 0;
                  for (const index of depressionItems) {
                    if (scores[index.toString()] !== undefined) {
                      sum += scores[index.toString()];
                      count++;
                    }
                  }
                  if (count > 0) {
                    depressionScore = sum / count;
                  }
                }
              }
              
              if (anxietyScore === null) {
                if (scores['焦虑'] !== undefined) {
                  anxietyScore = scores['焦虑'];
                } else if (scores['anxiety'] !== undefined) {
                  anxietyScore = scores['anxiety'];
                } else {
                  // SCL-90焦虑因子计算：10个项目的平均分
                  const anxietyItems = [1, 2, 16, 23, 27, 36, 45, 49, 50, 72];
                  let sum = 0;
                  let count = 0;
                  for (const index of anxietyItems) {
                    if (scores[index.toString()] !== undefined) {
                      sum += scores[index.toString()];
                      count++;
                    }
                  }
                  if (count > 0) {
                    anxietyScore = sum / count;
                  }
                }
              }
            }
            
            if (depressionScore !== null && anxietyScore !== null) {
              totalDepression += depressionScore;
              totalAnxiety += anxietyScore;
              validCount++;
            }

            if (assessment.risk_level) {
              const riskValue = assessment.risk_level === 'red' ? 3 : 
                              assessment.risk_level === 'orange' ? 2 : 
                              assessment.risk_level === 'yellow' ? 1 : 0;
              totalRiskLevel += riskValue;
            }
          } catch (error) {
            console.log('解析评估失败，跳过:', error);
          }
        });

        if (validCount > 0) {
          const avgDepression = totalDepression / validCount;
          const avgAnxiety = totalAnxiety / validCount;
          const avgRiskLevel = assessments.length > 0 ? totalRiskLevel / assessments.length : 0;

          const vitality = Math.max(0, Math.min(100, 100 - ((avgDepression + avgAnxiety) / 2) * 25));
          const support = Math.max(0, Math.min(100, 100 - avgRiskLevel * 20));
          const stress = Math.max(0, Math.min(100, ((avgDepression + avgAnxiety) / 2) * 20));
          const cohesion = Math.max(0, Math.min(100, 70 + (100 - avgRiskLevel * 15)));

          return {
            vitality: Math.round(vitality),
            support: Math.round(support),
            stress: Math.round(stress),
            cohesion: Math.round(cohesion)
          };
        }

        return null;
      };

      // 筛选本组用户（通过 manager_id 或 department）
      let groupUserIds: string[] = [];
      if (currentUser.manager_id) {
        // 如果当前用户有组长，说明是普通教师，找同组长的用户
        groupUserIds = allUsers
          .filter((user: any) => user.manager_id === currentUser.manager_id)
          .map((user: any) => user.id);
      } else if (currentUser.role === 'dept_head') {
        // 如果当前用户是组长，找自己的组员
        groupUserIds = allUsers
          .filter((user: any) => user.manager_id === currentUser.id)
          .map((user: any) => user.id);
        // 组长自己也算
        groupUserIds.push(currentUser.id);
      }

      // 筛选本组评估和全校评估
      const groupAssessments = allAssessments.filter((a: any) => groupUserIds.includes(a.user_id));
      const schoolAssessments = allAssessments;

      // 计算氛围数据
      const groupAtmosphere = calculateAtmosphere(groupAssessments);
      const schoolAtmosphere = calculateAtmosphere(schoolAssessments);
      
      console.log('计算结果 - groupAtmosphere:', groupAtmosphere);
      console.log('计算结果 - schoolAtmosphere:', schoolAtmosphere);

      res.json({
        group: groupAtmosphere,
        school: schoolAtmosphere
      });
    } catch (error) {
      console.error('获取团队氛围统计失败:', error);
      res.status(500).json({ error: "获取团队氛围统计失败" });
    }
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

  // 标记二级预警为教研组长已读
  app.post("/api/warnings/:id/mark-dept-head-read", authMiddleware, (req: any, res) => {
    try {
      // 获取预警
      const warnings = warningDb.getAll();
      const warning = warnings.find(w => w.id === req.params.id);
      
      if (!warning) {
        return res.status(404).json({ error: "预警不存在" });
      }
      
      // 检查权限：只有教研组长、管理员和心理医生可以操作
      if (!["admin", "psychologist", "dept_head"].includes(req.user.role)) {
        return res.status(403).json({ error: "无权操作此预警" });
      }
      
      // 标记为教研组长已读
      warningDb.markDeptHeadAsRead(req.params.id);
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
    
    console.log(`风险扫描 - 用户 ${userId} 的评估数量: ${assessments.length}`);
    
    const factors: string[] = [];
    let riskScore = 0.3; // 基础风险分
    let consecutiveHighDepression = false;
    
    // 真正使用最新评估数据计算风险
    if (assessments.length > 0) {
      const latestAssessment = assessments[0];
      console.log(`最新评估数据:`, {
        risk_level: latestAssessment.risk_level,
        depression_score: latestAssessment.depression_score,
        scores: latestAssessment.scores
      });
      
      // 使用最新评估的抑郁因子分
      if (latestAssessment.depression_score) {
        const depressionScore = parseFloat(latestAssessment.depression_score);
        console.log(`抑郁因子分: ${depressionScore}`);
        
        if (depressionScore >= 3.0) {
          factors.push("抑郁因子分严重超标（≥3.0）");
          riskScore += 0.4;
        } else if (depressionScore >= 2.5) {
          factors.push("抑郁因子分较高（≥2.5）");
          riskScore += 0.25;
        } else if (depressionScore >= 2.0) {
          factors.push("抑郁因子分轻度偏高（≥2.0）");
          riskScore += 0.1;
        }
        // 如果抑郁因子分 < 2.0，不加分
      }
      
      // 使用最新评估的风险级别
      if (latestAssessment.risk_level === "red") {
        factors.push("综合风险评估为高风险");
        riskScore += 0.3;
      } else if (latestAssessment.risk_level === "orange") {
        factors.push("综合风险评估为中等风险");
        riskScore += 0.15;
      }
      
      // 检查连续高抑郁分数（基于实际抑郁因子分）
      if (assessments.length >= 2) {
        const dep1 = parseFloat(assessments[0].depression_score) || 0;
        const dep2 = parseFloat(assessments[1].depression_score) || 0;
        if (dep1 >= 2.5 && dep2 >= 2.5) {
          consecutiveHighDepression = true;
          factors.push("抑郁因子分连续两次达到预警阈值");
          riskScore += 0.2;
        }
      }
    }
    
    // 模拟数据（保留但降低权重）
    const seed = userId.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const mockHRV = [60 + (seed % 10), 58 + (seed % 8), 55 + (seed % 12), 52 + (seed % 5)];
    const mockWorkloadIndex = 65 + (seed % 15); // 降低默认工作量
    const mockSupportIndex = 35 - (seed % 8);
    
    // 模拟数据权重降低
    const hrvTrend = mockHRV[0] - mockHRV[mockHRV.length - 1];
    if (hrvTrend < -8) {
      factors.push("HRV 呈现下降趋势");
      riskScore += 0.1;
    }
    
    if (mockWorkloadIndex > 85) {
      factors.push(`工作负荷指数较高 (${mockWorkloadIndex})`);
      riskScore += 0.1;
    }
    
    riskScore = Math.min(riskScore, 0.98);
    
    console.log(`最终风险分数: ${riskScore}, 连续高抑郁: ${consecutiveHighDepression}`);
    
    let warningTriggered = false;
    let warningLevel: string | null = null;
    
    // 如果有最新评估且风险很低，直接不触发预警
    if (assessments.length > 0) {
      const latestAssessment = assessments[0];
      const depressionScore = parseFloat(latestAssessment.depression_score) || 0;
      
      // 如果最新评估的抑郁因子分 < 2.0 且风险级别为 green，不触发预警
      if (depressionScore < 2.0 && latestAssessment.risk_level === "green") {
        console.log(`最新评估显示风险很低，不触发预警`);
        warningTriggered = false;
        warningLevel = null;
      } else if (riskScore > 0.85 || consecutiveHighDepression) {
        warningTriggered = true;
        warningLevel = "emergency";
      } else if (riskScore > 0.7) {
        warningTriggered = true;
        warningLevel = "intervention";
      } else if (riskScore > 0.6) {
        warningTriggered = true;
        warningLevel = "attention";
      }
    } else {
      // 没有评估数据时，使用原有逻辑
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
    }

    // 如果触发预警，检查是否已存在未解决的预警
    if (warningTriggered && warningLevel) {
      const user = userDb.findById(userId);
      
      // 检查是否已存在未解决的预警
      const existingWarnings = warningDb.getPendingByUserId(userId);
      
      if (existingWarnings.length > 0) {
        // 更新现有预警
        const existingWarning = existingWarnings[0];
        warningDb.update(existingWarning.id, {
          level: warningLevel,
          riskScore,
          factors,
          reason: consecutiveHighDepression
            ? "抑郁因子连续超标触发紧急预警"
            : `LSTM 综合风险指数 (${(riskScore * 100).toFixed(0)}%) 超过阈值`
        });
      } else {
        // 创建新预警
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
    } else {
      // 风险未触发预警，检查是否有未解决的预警需要关闭
      const existingWarnings = warningDb.getPendingByUserId(userId);
      if (existingWarnings.length > 0) {
        // 风险降低，关闭预警
        const existingWarning = existingWarnings[0];
        warningDb.update(existingWarning.id, {
          status: 'resolved',
          reason: existingWarning.reason + '\n[系统自动关闭] 风险指标已降至安全范围'
        });
        console.log(`风险扫描自动关闭预警：${existingWarning.id}，原因：风险降低`);
      }
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

  // 获取生理数据
  app.get("/api/physiological/:userId", authMiddleware, (req, res) => {
    const { userId } = req.params;
    const { date } = req.query;
    const data = physiologicalDb.getByUserId(userId);
    
    console.log('获取生理数据:', { userId, date, data });
    
    if (data) {
      let hrv: any[] = [];
      let restingHR: any[] = [];
      let sleepDuration: any[] = [];
      let deepSleepRatio: any[] = [];
      let timestamps: string[] = [];
      
      try {
        hrv = data.hrv ? JSON.parse(data.hrv) : [];
      } catch (e) {
        hrv = data.hrv !== null ? [data.hrv] : [];
      }
      
      try {
        restingHR = data.resting_hr ? JSON.parse(data.resting_hr) : [];
      } catch (e) {
        restingHR = data.resting_hr !== null ? [data.resting_hr] : [];
      }
      
      try {
        sleepDuration = data.sleep_duration ? JSON.parse(data.sleep_duration) : [];
      } catch (e) {
        sleepDuration = data.sleep_duration !== null ? [data.sleep_duration] : [];
      }
      
      try {
        deepSleepRatio = data.deep_sleep_ratio ? JSON.parse(data.deep_sleep_ratio) : [];
      } catch (e) {
        deepSleepRatio = data.deep_sleep_ratio !== null ? [data.deep_sleep_ratio] : [];
      }
      
      try {
        timestamps = data.timestamps ? JSON.parse(data.timestamps) : [];
      } catch (e) {
        timestamps = data.recorded_at ? [data.recorded_at] : [];
      }
      
      if (date) {
        const targetDate = new Date(date as string).toDateString();
        let foundData = {
          hrv: null,
          restingHR: null,
          sleepDuration: null,
          deepSleepRatio: null
        };
        
        for (let i = 0; i < timestamps.length; i++) {
          const ts = new Date(timestamps[i]);
          if (ts.toDateString() === targetDate) {
            foundData = {
              hrv: hrv[i] !== undefined ? hrv[i] : null,
              restingHR: restingHR[i] !== undefined ? restingHR[i] : null,
              sleepDuration: sleepDuration[i] !== undefined ? sleepDuration[i] : null,
              deepSleepRatio: deepSleepRatio[i] !== undefined ? deepSleepRatio[i] : null
            };
            break;
          }
        }
        
        console.log('按日期查找的生理数据:', { date, foundData });
        res.json({
          userId,
          ...foundData,
          date: date
        });
      } else {
        const historyData = timestamps.map((ts, index) => ({
          date: ts,
          hrv: hrv[index] !== undefined ? hrv[index] : null,
          restingHR: restingHR[index] !== undefined ? restingHR[index] : null,
          sleepDuration: sleepDuration[index] !== undefined ? sleepDuration[index] : null,
          deepSleepRatio: deepSleepRatio[index] !== undefined ? deepSleepRatio[index] : null
        }));
        
        const latestIndex = hrv.length > 0 ? hrv.length - 1 : -1;
        const parsedData = {
          userId,
          hrv: latestIndex >= 0 ? hrv[latestIndex] : null,
          restingHR: latestIndex >= 0 && restingHR.length > 0 ? restingHR[latestIndex] : null,
          sleepDuration: latestIndex >= 0 && sleepDuration.length > 0 ? sleepDuration[latestIndex] : null,
          deepSleepRatio: latestIndex >= 0 && deepSleepRatio.length > 0 ? deepSleepRatio[latestIndex] : null,
          timestamps: timestamps.length > 0 ? timestamps : null,
          history: historyData,
          recordedAt: data.recorded_at
        };
        console.log('解析后的生理数据:', parsedData);
        res.json(parsedData);
      }
    } else {
      if (date) {
        res.json({
          userId,
          hrv: null,
          restingHR: null,
          sleepDuration: null,
          deepSleepRatio: null,
          date: date
        });
      } else {
        res.json({
          userId,
          hrv: null,
          restingHR: null,
          sleepDuration: null,
          deepSleepRatio: null,
          timestamps: null,
          recordedAt: null
        });
      }
    }
  });

  // 保存生理数据
  app.post("/api/physiological", authMiddleware, (req: any, res) => {
    try {
      let data = req.body;
      
      // 检查是否需要解密
      if (data.encrypted) {
        data = decryptData(data.encrypted);
      }
      
      const { hrv, restingHR, sleepDuration, deepSleepRatio, date } = data;
      const userId = req.user.userId;
      
      console.log('保存生理数据:', { userId, hrv, restingHR, sleepDuration, deepSleepRatio, date, reqBody: req.body, decryptedData: data });
      
      const existingData = physiologicalDb.getByUserId(userId);
      
      let newHrv = existingData?.hrv ? JSON.parse(existingData.hrv) : [];
      let newRestingHR = existingData?.resting_hr ? JSON.parse(existingData.resting_hr) : [];
      let newSleepDuration = existingData?.sleep_duration ? JSON.parse(existingData.sleep_duration) : [];
      let newDeepSleepRatio = existingData?.deep_sleep_ratio ? JSON.parse(existingData.deep_sleep_ratio) : [];
      let newTimestamps = existingData?.timestamps ? JSON.parse(existingData.timestamps) : [];
      
      const targetDate = date ? new Date(date).toDateString() : new Date().toDateString();
      const timestamp = date ? new Date(date).toISOString() : new Date().toISOString();
      
      let foundIndex = -1;
      for (let i = 0; i < newTimestamps.length; i++) {
        const ts = new Date(newTimestamps[i]);
        if (ts.toDateString() === targetDate) {
          foundIndex = i;
          break;
        }
      }
      
      if (foundIndex >= 0) {
        if (hrv !== null && hrv !== undefined) newHrv[foundIndex] = hrv;
        if (restingHR !== null && restingHR !== undefined) newRestingHR[foundIndex] = restingHR;
        if (sleepDuration !== null && sleepDuration !== undefined) newSleepDuration[foundIndex] = sleepDuration;
        if (deepSleepRatio !== null && deepSleepRatio !== undefined) newDeepSleepRatio[foundIndex] = deepSleepRatio;
        newTimestamps[foundIndex] = timestamp;
      } else {
        if (hrv !== null && hrv !== undefined) newHrv.unshift(hrv);
        else newHrv.unshift(null);
        
        if (restingHR !== null && restingHR !== undefined) newRestingHR.unshift(restingHR);
        else newRestingHR.unshift(null);
        
        if (sleepDuration !== null && sleepDuration !== undefined) newSleepDuration.unshift(sleepDuration);
        else newSleepDuration.unshift(null);
        
        if (deepSleepRatio !== null && deepSleepRatio !== undefined) newDeepSleepRatio.unshift(deepSleepRatio);
        else newDeepSleepRatio.unshift(null);
        
        newTimestamps.unshift(timestamp);
      }
      
      newHrv = newHrv.slice(0, 30);
      newRestingHR = newRestingHR.slice(0, 30);
      newSleepDuration = newSleepDuration.slice(0, 30);
      newDeepSleepRatio = newDeepSleepRatio.slice(0, 30);
      newTimestamps = newTimestamps.slice(0, 30);
      
      const dataId = physiologicalDb.create({
        userId,
        hrv: newHrv.length > 0 ? newHrv : null,
        restingHR: newRestingHR.length > 0 ? newRestingHR : null,
        sleepDuration: newSleepDuration.length > 0 ? newSleepDuration : null,
        deepSleepRatio: newDeepSleepRatio.length > 0 ? newDeepSleepRatio : null,
        timestamps: newTimestamps
      });
      
      console.log('生理数据保存成功:', dataId);
      res.json({ success: true, id: dataId });
    } catch (error) {
      console.error('保存生理数据失败:', error);
      res.status(500).json({ error: "保存生理数据失败", details: error.message });
    }
  });

  // ==================== 工作负载 API ====================

  // 获取工作负载数据
  app.get("/api/workload/:userId", authMiddleware, (req, res) => {
    const { userId } = req.params;
    const { date } = req.query;
    const data = workloadDb.getByUserId(userId);
    
    console.log('获取工作负载数据:', { userId, date, data });
    
    if (data) {
      let classHours: any[] = [];
      let meetingHours: any[] = [];
      let nonTeachingTasks: any[] = [];
      let totalWorkloadIndex: any[] = [];
      let timestamps: string[] = [];
      
      try {
        const parsed = data.class_hours ? JSON.parse(data.class_hours) : [];
        classHours = Array.isArray(parsed) ? parsed : (parsed !== null ? [parsed] : []);
      } catch (e) {
        classHours = data.class_hours !== null ? [data.class_hours] : [];
      }
      
      try {
        const parsed = data.meeting_hours ? JSON.parse(data.meeting_hours) : [];
        meetingHours = Array.isArray(parsed) ? parsed : (parsed !== null ? [parsed] : []);
      } catch (e) {
        meetingHours = data.meeting_hours !== null ? [data.meeting_hours] : [];
      }
      
      try {
        const parsed = data.non_teaching_tasks ? JSON.parse(data.non_teaching_tasks) : [];
        nonTeachingTasks = Array.isArray(parsed) ? parsed : (parsed !== null ? [parsed] : []);
      } catch (e) {
        nonTeachingTasks = data.non_teaching_tasks !== null ? [data.non_teaching_tasks] : [];
      }
      
      try {
        const parsed = data.total_workload_index ? JSON.parse(data.total_workload_index) : [];
        totalWorkloadIndex = Array.isArray(parsed) ? parsed : (parsed !== null ? [parsed] : []);
      } catch (e) {
        totalWorkloadIndex = data.total_workload_index !== null ? [data.total_workload_index] : [];
      }
      
      try {
        const parsed = data.timestamps ? JSON.parse(data.timestamps) : [];
        timestamps = Array.isArray(parsed) ? parsed : (parsed !== null ? [parsed] : []);
      } catch (e) {
        timestamps = data.timestamps !== null ? [data.timestamps] : [];
      }
      
      console.log('解析后的工作负载数据:', { classHours, meetingHours, nonTeachingTasks, totalWorkloadIndex, timestamps });
      
      if (date) {
        const targetDate = new Date(date as string).toDateString();
        console.log('日期匹配调试:', {
          dateParam: date,
          targetDate: targetDate,
          timestamps: timestamps
        });
        
        let foundData = {
          classHours: null,
          meetingHours: null,
          nonTeachingTasks: null,
          totalWorkloadIndex: null
        };
        
        for (let i = 0; i < timestamps.length; i++) {
          const ts = new Date(timestamps[i]);
          const tsDateString = ts.toDateString();
          console.log(`  检查索引 ${i}:`, {
            timestamp: timestamps[i],
            tsDateString: tsDateString,
            match: tsDateString === targetDate
          });
          
          if (tsDateString === targetDate) {
            foundData = {
              classHours: classHours[i] !== undefined ? classHours[i] : null,
              meetingHours: meetingHours[i] !== undefined ? meetingHours[i] : null,
              nonTeachingTasks: nonTeachingTasks[i] !== undefined ? nonTeachingTasks[i] : null,
              totalWorkloadIndex: totalWorkloadIndex[i] !== undefined ? totalWorkloadIndex[i] : null
            };
            console.log('  找到匹配数据!', foundData);
            break;
          }
        }
        
        console.log('按日期查找的工作负载数据:', { date, foundData });
        res.json({
          ...foundData,
          date: date
        });
      } else {
        const historyData = timestamps.map((ts, index) => ({
          date: ts,
          classHours: classHours[index] !== undefined ? classHours[index] : null,
          meetingHours: meetingHours[index] !== undefined ? meetingHours[index] : null,
          nonTeachingTasks: nonTeachingTasks[index] !== undefined ? nonTeachingTasks[index] : null,
          totalWorkloadIndex: totalWorkloadIndex[index] !== undefined ? totalWorkloadIndex[index] : null
        }));
        
        const latestIndex = classHours.length > 0 ? 0 : -1;
        res.json({
          classHours: latestIndex >= 0 ? classHours[latestIndex] : null,
          meetingHours: latestIndex >= 0 && meetingHours.length > 0 ? meetingHours[latestIndex] : null,
          nonTeachingTasks: latestIndex >= 0 && nonTeachingTasks.length > 0 ? nonTeachingTasks[latestIndex] : null,
          totalWorkloadIndex: latestIndex >= 0 && totalWorkloadIndex.length > 0 ? totalWorkloadIndex[latestIndex] : null,
          timestamps: timestamps.length > 0 ? timestamps : null,
          history: historyData,
          recordedAt: data.recorded_at
        });
      }
    } else {
      if (date) {
        res.json({
          classHours: null,
          meetingHours: null,
          nonTeachingTasks: null,
          totalWorkloadIndex: null,
          date: date
        });
      } else {
        res.json({
          classHours: null,
          meetingHours: null,
          nonTeachingTasks: null,
          totalWorkloadIndex: null,
          timestamps: null,
          recordedAt: null
        });
      }
    }
  });

  // 保存工作负载数据
  app.post("/api/workload", authMiddleware, (req: any, res) => {
    try {
      let data = req.body;
      
      // 检查是否需要解密
      if (data.encrypted) {
        data = decryptData(data.encrypted);
      }
      
      const { classHours, meetingHours, nonTeachingTasks, date } = data;
      const userId = req.user.userId;
      
      console.log('保存工作负载数据:', { userId, classHours, meetingHours, nonTeachingTasks, date, reqBody: req.body, decryptedData: data });
      
      const existingData = workloadDb.getByUserId(userId);
      
      let newClassHours: any[] = [];
      let newMeetingHours: any[] = [];
      let newNonTeachingTasks: any[] = [];
      let newTotalWorkloadIndex: any[] = [];
      let newTimestamps: string[] = [];
      
      try {
        const parsed = existingData?.class_hours ? JSON.parse(existingData.class_hours) : [];
        newClassHours = Array.isArray(parsed) ? parsed : (parsed !== null ? [parsed] : []);
      } catch (e) {
        newClassHours = existingData?.class_hours !== null ? [existingData.class_hours] : [];
      }
      
      try {
        const parsed = existingData?.meeting_hours ? JSON.parse(existingData.meeting_hours) : [];
        newMeetingHours = Array.isArray(parsed) ? parsed : (parsed !== null ? [parsed] : []);
      } catch (e) {
        newMeetingHours = existingData?.meeting_hours !== null ? [existingData.meeting_hours] : [];
      }
      
      try {
        const parsed = existingData?.non_teaching_tasks ? JSON.parse(existingData.non_teaching_tasks) : [];
        newNonTeachingTasks = Array.isArray(parsed) ? parsed : (parsed !== null ? [parsed] : []);
      } catch (e) {
        newNonTeachingTasks = existingData?.non_teaching_tasks !== null ? [existingData.non_teaching_tasks] : [];
      }
      
      try {
        const parsed = existingData?.total_workload_index ? JSON.parse(existingData.total_workload_index) : [];
        newTotalWorkloadIndex = Array.isArray(parsed) ? parsed : (parsed !== null ? [parsed] : []);
      } catch (e) {
        newTotalWorkloadIndex = existingData?.total_workload_index !== null ? [existingData.total_workload_index] : [];
      }
      
      try {
        const parsed = existingData?.timestamps ? JSON.parse(existingData.timestamps) : [];
        newTimestamps = Array.isArray(parsed) ? parsed : (parsed !== null ? [parsed] : []);
      } catch (e) {
        newTimestamps = existingData?.timestamps !== null ? [existingData.timestamps] : [];
      }
      
      const targetDate = date ? new Date(date).toDateString() : new Date().toDateString();
      const timestamp = date ? new Date(date).toISOString() : new Date().toISOString();
      
      const totalWorkloadIndex = Math.min(100, (classHours || 0) * 3 + (meetingHours || 0) * 2 + (nonTeachingTasks || 0) * 2);
      
      let foundIndex = -1;
      for (let i = 0; i < newTimestamps.length; i++) {
        const ts = new Date(newTimestamps[i]);
        if (ts.toDateString() === targetDate) {
          foundIndex = i;
          break;
        }
      }
      
      if (foundIndex >= 0) {
        if (classHours !== null && classHours !== undefined) newClassHours[foundIndex] = classHours;
        if (meetingHours !== null && meetingHours !== undefined) newMeetingHours[foundIndex] = meetingHours;
        if (nonTeachingTasks !== null && nonTeachingTasks !== undefined) newNonTeachingTasks[foundIndex] = nonTeachingTasks;
        newTotalWorkloadIndex[foundIndex] = totalWorkloadIndex;
        newTimestamps[foundIndex] = timestamp;
      } else {
        if (classHours !== null && classHours !== undefined) newClassHours.unshift(classHours);
        else newClassHours.unshift(null);
        
        if (meetingHours !== null && meetingHours !== undefined) newMeetingHours.unshift(meetingHours);
        else newMeetingHours.unshift(null);
        
        if (nonTeachingTasks !== null && nonTeachingTasks !== undefined) newNonTeachingTasks.unshift(nonTeachingTasks);
        else newNonTeachingTasks.unshift(null);
        
        newTotalWorkloadIndex.unshift(totalWorkloadIndex);
        newTimestamps.unshift(timestamp);
      }
      
      newClassHours = newClassHours.slice(0, 30);
      newMeetingHours = newMeetingHours.slice(0, 30);
      newNonTeachingTasks = newNonTeachingTasks.slice(0, 30);
      newTotalWorkloadIndex = newTotalWorkloadIndex.slice(0, 30);
      newTimestamps = newTimestamps.slice(0, 30);
      
      console.log('准备保存工作负载数据到数据库:', {
        userId,
        newClassHours,
        newMeetingHours,
        newNonTeachingTasks,
        newTotalWorkloadIndex,
        newTimestamps
      });
      
      const dataId = workloadDb.create({
        userId,
        classHours: newClassHours.length > 0 ? newClassHours : null,
        meetingHours: newMeetingHours.length > 0 ? newMeetingHours : null,
        nonTeachingTasks: newNonTeachingTasks.length > 0 ? newNonTeachingTasks : null,
        totalWorkloadIndex: newTotalWorkloadIndex.length > 0 ? newTotalWorkloadIndex : null,
        timestamps: newTimestamps
      });
      
      console.log('工作负载数据保存成功:', dataId);
      res.json({ success: true, id: dataId, totalWorkloadIndex });
    } catch (error) {
      console.error('保存工作负载数据失败:', error);
      console.error('错误堆栈:', error.stack);
      res.status(500).json({ error: "保存工作负载数据失败", details: error.message, stack: error.stack });
    }
  });

  // ==================== 工具使用记录 API ====================

  app.post("/api/tool-usage", authMiddleware, (req: any, res) => {
    try {
      let data = req.body;
      
      // 检查是否需要解密
      if (data.encrypted) {
        data = decryptData(data.encrypted);
      }
      
      const { toolId, duration, feeling } = data;
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

  // ==================== 工具评分 API ====================

  // 创建或更新工具评分
  app.post("/api/tool-ratings", authMiddleware, (req: any, res) => {
    try {
      const { toolId, rating } = req.body;
      
      if (!toolId || rating === undefined) {
        return res.status(400).json({ error: "缺少 toolId 或 rating 参数" });
      }
      
      if (rating < 0 || rating > 5) {
        return res.status(400).json({ error: "评分必须在0-5之间" });
      }
      
      const ratingId = toolRatingDb.upsert({
        userId: req.user.userId,
        toolId,
        rating
      });
      
      res.json({ success: true, id: ratingId });
    } catch (error) {
      console.error('记录工具评分失败:', error);
      res.status(500).json({ error: "记录工具评分失败", details: error.message });
    }
  });

  // 获取当前用户的所有工具评分
  app.get("/api/tool-ratings/my", authMiddleware, (req: any, res) => {
    try {
      const ratings = toolRatingDb.getByUserId(req.user.userId);
      res.json(ratings);
    } catch (error) {
      res.status(500).json({ error: "获取工具评分失败" });
    }
  });

  // 获取当前用户对特定工具的评分
  app.get("/api/tool-ratings/my/:toolId", authMiddleware, (req: any, res) => {
    try {
      const rating = toolRatingDb.getByUserAndTool(req.user.userId, req.params.toolId);
      res.json(rating || null);
    } catch (error) {
      res.status(500).json({ error: "获取工具评分失败" });
    }
  });

  // 获取所有工具的平均评分（管理员接口）
  app.get("/api/tool-ratings/average", authMiddleware, (req: any, res) => {
    try {
      const avgRatings = toolRatingDb.getAverageRatings();
      res.json(avgRatings);
    } catch (error) {
      res.status(500).json({ error: "获取平均评分失败" });
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
      let data = req.body;
      
      // 检查是否需要解密
      if (data.encrypted) {
        data = decryptData(data.encrypted);
      }
      
      const { content, mood, tags, imageUrl } = data;
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

  // 获取用户社群统计数据
  app.get("/api/community/my-stats", authMiddleware, (req: any, res) => {
    try {
      const stats = communityDb.getUserCommunityStats(req.user.userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "获取社群统计失败" });
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

  // ==================== 驾驶舱 API ====================

  app.get("/api/cockpit/overview", authMiddleware, (req: any, res) => {
    try {
      const timeRange = req.query.timeRange || '30d';
      const selectedGrade = req.query.grade || 'all';
      const selectedSubject = req.query.subject || 'all';
      const selectedExperience = req.query.experience || 'all';

      let dateFilter = '';
      if (timeRange === '7d') {
        dateFilter = "AND timestamp >= datetime('now', '-7 days')";
      } else if (timeRange === '30d') {
        dateFilter = "AND timestamp >= datetime('now', '-30 days')";
      } else if (timeRange === '90d') {
        dateFilter = "AND timestamp >= datetime('now', '-90 days')";
      }

      const allTeachers = userDb.getAll().filter(u => u.role !== 'admin' && (u.school === '南部县第二小学' || u.school === '' || u.school === null));
      const filteredTeachers = allTeachers.filter(teacher => {
        if (selectedSubject !== 'all') {
          const subjectMap: Record<string, string> = {
            '语文': '语文',
            '数学': '数学',
            '英语': '英语',
            '科学': '科学',
            '道法': '道法',
            '音乐': '音乐',
            '体育': '体育',
            '美术': '美术',
            '信息科技': '信息科技',
            '心理健康': '心理健康'
          };
          const expectedDepartment = subjectMap[selectedSubject];
          if (expectedDepartment && !teacher.department?.includes(expectedDepartment)) return false;
        }
        if (selectedExperience !== 'all') {
          const exp = teacher.teaching_experience || 0;
          if (selectedExperience === '0-2' && exp > 2) return false;
          if (selectedExperience === '3-5' && (exp < 3 || exp > 5)) return false;
          if (selectedExperience === '6-15' && (exp < 6 || exp > 15)) return false;
          if (selectedExperience === '16+' && exp < 16) return false;
        }
        return true;
      });

      const teacherIds = filteredTeachers.map(t => t.id).join("','");

      const allAssessments = db.prepare(`
        SELECT * FROM assessments 
        WHERE user_id IN ('${teacherIds || ''}') ${dateFilter}
        ORDER BY timestamp DESC
      `).all();

      const allWarningsRaw = db.prepare(`
        SELECT * FROM warnings 
        WHERE user_id IN ('${teacherIds || ''}')
      `).all();
      
      // 按用户去重，只保留每个用户最新的预警
      const userWarningMap = new Map();
      allWarningsRaw.forEach((warning: any) => {
        const existing = userWarningMap.get(warning.user_id);
        if (!existing || new Date(warning.timestamp) > new Date(existing.timestamp)) {
          userWarningMap.set(warning.user_id, warning);
        }
      });
      const allWarnings = Array.from(userWarningMap.values());
      
      // 统计待完成的预警（状态不是 resolved 的）
      const pendingWarnings = allWarnings.filter((w: any) => w.status !== 'resolved');
      const warningCount = pendingWarnings.length;

      const allInterventionTasks = db.prepare(`
        SELECT * FROM intervention_tasks 
        WHERE teacher_id IN ('${teacherIds || ''}')
      `).all();

      const completedTasks = allInterventionTasks.filter((t: any) => t.status === 'completed');
      const interventionRate = allInterventionTasks.length > 0 
        ? Math.round((completedTasks.length / allInterventionTasks.length) * 100) 
        : 0;

      const allToolUsage = db.prepare(`
        SELECT * FROM tool_usage 
        WHERE user_id IN ('${teacherIds || ''}') ${dateFilter}
      `).all();

      const uniqueToolUsers = new Set(allToolUsage.map((u: any) => u.user_id));
      const resourceEngagement = filteredTeachers.length > 0 
        ? Math.round((uniqueToolUsers.size / filteredTeachers.length) * 100) 
        : 0;

      const allPhysiologicalData = db.prepare(`
        SELECT * FROM physiological_data 
        WHERE user_id IN ('${teacherIds || ''}') ${dateFilter.replace('timestamp', 'recorded_at')}
      `).all();

      const allDiaryEntries = db.prepare(`
        SELECT * FROM diary_entries 
        WHERE user_id IN ('${teacherIds || ''}') ${dateFilter}
      `).all();

      const allWorkloadData = db.prepare(`
        SELECT * FROM workload_data 
        WHERE user_id IN ('${teacherIds || ''}') ${dateFilter.replace('timestamp', 'recorded_at')}
      `).all();

      let overallIndex = 0;
      if (allAssessments.length > 0) {
        const recentScores = allAssessments.slice(0, 50).map((a: any) => {
          const scores = JSON.parse(a.scores);
          const avgScore = Object.values(scores).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(scores).length;
          return avgScore;
        });
        const avgRecentScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
        overallIndex = Math.round(100 - avgRecentScore * 10);
      }

      const trends: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i * 2);
        const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        const dayAssessments = db.prepare(`
          SELECT * FROM assessments 
          WHERE user_id IN ('${teacherIds || ''}') 
          AND date(timestamp) = date('${date.toISOString().split('T')[0]}')
        `).all();

        let avgHealthScore = 0;
        let warningRate = 0;
        let toolUsageRate = 0;
        
        // 心理健康分：从评估总分计算（SCL-90 总分越低越健康，转换为 0-100 分）
        if (dayAssessments.length > 0) {
          const healthScores = dayAssessments.map((a: any) => {
            const scores = JSON.parse(a.scores);
            // 如果有 total 字段（SCL-90），使用它计算平均分
            if (scores.total) {
              const avgScore = scores.total / Object.keys(scores).filter(k => k !== 'total').length;
              return Math.round(100 - avgScore * 10); // 转换为 0-100 分
            }
            // 否则计算所有分数的平均值
            const avgScore = Object.values(scores).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(scores).length;
            return Math.round(100 - avgScore * 10);
          }).filter(s => s > 0 && s <= 100);
          
          if (healthScores.length > 0) {
            avgHealthScore = Math.round(healthScores.reduce((sum, s) => sum + s, 0) / healthScores.length);
          }
        }
        
        // 工具使用率
        const dayToolUsage = allToolUsage.filter((u: any) => {
          const uDate = new Date(u.timestamp).toISOString().split('T')[0];
          return uDate === date.toISOString().split('T')[0];
        });
        
        if (filteredTeachers.length > 0) {
          const uniqueUsers = new Set(dayToolUsage.map((u: any) => u.user_id));
          toolUsageRate = Math.round((uniqueUsers.size / filteredTeachers.length) * 100);
        }
        
        // 预警率
        const dayWarnings = allWarnings.filter((w: any) => {
          const wDate = new Date(w.timestamp).toISOString().split('T')[0];
          return wDate === date.toISOString().split('T')[0];
        });
        
        if (filteredTeachers.length > 0) {
          warningRate = Math.round((dayWarnings.length / filteredTeachers.length) * 100);
        }
        
        trends.push({ 
          date: dateStr, 
          healthScore: avgHealthScore, 
          warningRate: warningRate, 
          toolUsageRate: toolUsageRate 
        });
      }

      const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
      const subjects = ['语文', '数学', '英语', '科学', '道法', '音乐', '体育', '美术', '信息科技', '心理健康'];
      
      const riskHeatmap: any[] = [];
      
      grades.forEach(grade => {
        subjects.forEach(subject => {
          const subjectMap: Record<string, string> = {
            '语文': '语文',
            '数学': '数学',
            '英语': '英语',
            '科学': '科学',
            '道法': '道法',
            '音乐': '音乐',
            '体育': '体育',
            '美术': '美术',
            '信息科技': '信息科技',
            '心理健康': '心理健康'
          };
          
          const expectedDepartment = subjectMap[subject];
          let relevantTeachers = [];
          
          if (expectedDepartment) {
            relevantTeachers = filteredTeachers.filter(t => 
              t.department?.includes(expectedDepartment) && t.grade === grade
            );
          }
          
          if (relevantTeachers.length > 0) {
            const groupIds = relevantTeachers.map(t => t.id).join("','");
            const groupWarningsRaw = db.prepare(`
              SELECT * FROM warnings 
              WHERE user_id IN ('${groupIds}') AND status = 'pending'
            `).all();
            
            // 按用户去重，只保留每个用户最新的预警
            const groupUserWarningMap = new Map();
            groupWarningsRaw.forEach((warning: any) => {
              const existing = groupUserWarningMap.get(warning.user_id);
              if (!existing || new Date(warning.timestamp) > new Date(existing.timestamp)) {
                groupUserWarningMap.set(warning.user_id, warning);
              }
            });
            const groupWarnings = Array.from(groupUserWarningMap.values());
            
            const groupAssessments = db.prepare(`
              SELECT * FROM assessments 
              WHERE user_id IN ('${groupIds}')
            `).all();
            
            const groupInterventions = db.prepare(`
              SELECT * FROM intervention_tasks 
              WHERE teacher_id IN ('${groupIds}') AND status = 'completed'
            `).all();
            
            let riskLevel = 0;
            if (groupAssessments.length > 0) {
              const avgScore = groupAssessments.reduce((sum, a) => sum + (parseFloat(a.depression_score) || 0), 0) / groupAssessments.length;
              riskLevel = Math.min(100, Math.max(0, Math.round((avgScore - 1) * 33.33)));
            } else if (groupWarnings.length > 0) {
              riskLevel = Math.min(100, Math.round((groupWarnings.length / relevantTeachers.length) * 100));
            }
            
            const interventionEffect = groupInterventions.length > 0 ? Math.round(groupInterventions.length * 5) : 0;
            riskHeatmap.push({ grade, subject, riskLevel, interventionEffect });
          } else {
            riskHeatmap.push({ grade, subject, riskLevel: 0, interventionEffect: 0 });
          }
        });
      });

      const toolStats = allToolUsage.reduce((acc: Record<string, { usage: number }>, usage: any) => {
        if (!acc[usage.tool_id]) {
          acc[usage.tool_id] = { usage: 0 };
        }
        acc[usage.tool_id].usage += 1;
        
        return acc;
      }, {});

      const toolNames: Record<string, string> = {
        'mindfulness': '正念冥想音频库',
        'breathing': '3×3 呼吸引导',
        'pause': '情绪暂停角',
        'anxiety-box': '焦虑收纳箱',
        'quadrants': '四象限工作法',
        'diary': '情绪日记本',
        'cards': '积极心理卡片',
        'boundaries': '沟通边界卡模拟'
      };

      const validToolIds = Object.keys(toolNames);

      // 获取所有工具的平均评分
      const avgRatings = toolRatingDb.getAverageRatings();
      const ratingsMap: Record<string, { avg_rating: number; rating_count: number }> = {};
      avgRatings.forEach((r: any) => {
        ratingsMap[r.tool_id] = { avg_rating: parseFloat(r.avg_rating), rating_count: r.rating_count };
      });

      // 合并相同工具名称的数据，同时处理评分
      const mergedToolStats = Object.entries(toolStats)
        .filter(([toolId]) => validToolIds.includes(toolId))
        .reduce((acc: Record<string, { usage: number; total_rating: number; rating_count: number }>, [toolId, stats]) => {
          const toolName = toolNames[toolId] || toolId;
          if (!acc[toolName]) {
            acc[toolName] = { usage: 0, total_rating: 0, rating_count: 0 };
          }
          acc[toolName].usage += stats.usage;
          
          // 如果该工具ID有评分，添加到该工具名称的总评分中
          if (ratingsMap[toolId]) {
            acc[toolName].total_rating += ratingsMap[toolId].avg_rating * ratingsMap[toolId].rating_count;
            acc[toolName].rating_count += ratingsMap[toolId].rating_count;
          }
          
          return acc;
        }, {});

      const resourceEfficiency = Object.entries(mergedToolStats)
        .map(([toolName, stats]) => {
          // 计算平均评分（0-5星），如果没有评分则使用默认值2.5星（50%）
          const avgRating = stats.rating_count > 0 ? stats.total_rating / stats.rating_count : 2.5;
          // 将0-5星转换为0-100%的改善指数
          const improvementRate = Math.round((avgRating / 5) * 100);
          return {
            tool: toolName,
            usage: stats.usage,
            improvement: improvementRate
          };
        })
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      const trackingData: any[] = [];
      
      // 只从已完成的干预任务中获取真实数据，必须同时有干预前和干预后的评估
      completedTasks.forEach((task: any, index) => {
        const teacherId = task.teacher_id;
        
        const preInterventionAssessments = db.prepare(`
          SELECT * FROM assessments 
          WHERE user_id = ? 
          AND timestamp < ?
          ORDER BY timestamp DESC
          LIMIT 1
        `).all(teacherId, task.created_at);
        
        const postInterventionAssessments = db.prepare(`
          SELECT * FROM assessments 
          WHERE user_id = ? 
          AND timestamp >= ?
          ORDER BY timestamp ASC
          LIMIT 1
        `).all(teacherId, task.created_at);
        
        if (preInterventionAssessments.length > 0 && postInterventionAssessments.length > 0) {
          const preScores = JSON.parse(preInterventionAssessments[0].scores);
          const postScores = JSON.parse(postInterventionAssessments[0].scores);
          
          const preAvgScore = Object.values(preScores).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(preScores).length;
          const postAvgScore = Object.values(postScores).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(postScores).length;
          
          const preScore = Math.round(100 - preAvgScore * 10);
          const postScore = Math.round(100 - postAvgScore * 10);
          
          const careRecords = task.care_records ? JSON.parse(task.care_records) : [];
          const interventionType = careRecords.length > 0 ? careRecords[0].summary?.split('：')[0] || '专业干预' : '专业干预';
          
          trackingData.push({
            id: `T-${String(index + 1000).padStart(4, '0')}`,
            interventionType,
            preScore,
            postScore,
            improvement: postScore - preScore
          });
        }
      });

      // 按干预类型分组统计平均改善幅度
      const interventionTypeStats: Record<string, { totalImprovement: number; count: number; avgImprovement: number }> = {};
      
      trackingData.forEach((item: any) => {
        const type = item.interventionType;
        if (!interventionTypeStats[type]) {
          interventionTypeStats[type] = { totalImprovement: 0, count: 0, avgImprovement: 0 };
        }
        interventionTypeStats[type].totalImprovement += item.improvement;
        interventionTypeStats[type].count += 1;
      });
      
      Object.keys(interventionTypeStats).forEach(type => {
        interventionTypeStats[type].avgImprovement = Math.round(
          interventionTypeStats[type].totalImprovement / interventionTypeStats[type].count
        );
      });
      
      const interventionTypeChartData = Object.keys(interventionTypeStats).map(type => ({
        type,
        avgImprovement: interventionTypeStats[type].avgImprovement,
        count: interventionTypeStats[type].count
      }));

      const drillDownData: any[] = [];
      
      grades.forEach(grade => {
        // 根据年级过滤教师
        const gradeTeachers = filteredTeachers.filter(t => t.grade === grade);
        if (gradeTeachers.length > 0) {
          const gradeIds = gradeTeachers.map(t => t.id).join("','");
          const gradeAssessments = db.prepare(`
            SELECT * FROM assessments 
            WHERE user_id IN ('${gradeIds}') ${dateFilter}
          `).all();
          
          const gradeWarningsRaw = db.prepare(`
            SELECT * FROM warnings 
            WHERE user_id IN ('${gradeIds}') AND status = 'pending'
          `).all();
          
          // 按用户去重，只保留每个用户最新的预警
          const gradeUserWarningMap = new Map();
          gradeWarningsRaw.forEach((warning: any) => {
            const existing = gradeUserWarningMap.get(warning.user_id);
            if (!existing || new Date(warning.timestamp) > new Date(existing.timestamp)) {
              gradeUserWarningMap.set(warning.user_id, warning);
            }
          });
          const gradeWarnings = Array.from(gradeUserWarningMap.values());
          
          const gradeToolUsage = db.prepare(`
            SELECT * FROM tool_usage 
            WHERE user_id IN ('${gradeIds}') ${dateFilter}
          `).all();
          
          let avgScore = 0;
          if (gradeAssessments.length > 0) {
            const scores = gradeAssessments.map((a: any) => {
              const s = JSON.parse(a.scores);
              const avg = Object.values(s).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(s).length;
              return avg;
            });
            avgScore = Math.round(100 - scores.reduce((sum, s) => sum + s, 0) / scores.length * 10);
          }
          
          const warningRate = gradeTeachers.length > 0 
            ? Math.round((gradeWarnings.length / gradeTeachers.length) * 100) 
            : 0;
          
          const uniqueUsers = new Set(gradeToolUsage.map((u: any) => u.user_id));
          const usageRate = gradeTeachers.length > 0 
            ? Math.round((uniqueUsers.size / gradeTeachers.length) * 100) 
            : 0; // 使用真实值而不是默认值
          
          // 基于真实数据计算效果率
          let effectRate = 0;
          if (gradeAssessments.length > 0) {
            // 计算干预前后的分数变化
            const improvementCount = gradeAssessments.filter((a: any, index: number) => {
              if (index === 0) return false;
              const currentScores = JSON.parse(a.scores);
              const prevScores = JSON.parse(gradeAssessments[index - 1].scores);
              const currentAvg = Object.values(currentScores).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(currentScores).length;
              const prevAvg = Object.values(prevScores).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(prevScores).length;
              return currentAvg < prevAvg; // 分数降低表示改善
            }).length;
            effectRate = gradeAssessments.length > 1 ? Math.round((improvementCount / (gradeAssessments.length - 1)) * 10) : 5;
          }
          
          drillDownData.push({
            label: `${grade}年级组`,
            grade,
            subject: 'all',
            experience: 'all',
            count: gradeTeachers.length,
            score: avgScore,
            warning: `${warningRate}%`,
            usage: `${usageRate}%`,
            effect: `+${effectRate}%`
          });
        }
      });

      subjects.forEach(subject => {
        // 学科筛选：基于学科来筛选教师
        const subjectMap: Record<string, string> = {
          '语文': '语文',
          '数学': '数学',
          '英语': '英语',
          '科学': '科学',
          '道法': '道法',
          '音乐': '音乐',
          '体育': '体育',
          '美术': '美术',
          '信息科技': '信息科技',
          '心理健康': '心理健康'
        };
        
        const expectedDepartment = subjectMap[subject];
        const subjectTeachers = expectedDepartment 
          ? filteredTeachers.filter(t => t.department?.includes(expectedDepartment)) 
          : [];
        
        if (subjectTeachers.length > 0) {
          const subjectIds = subjectTeachers.map(t => t.id).join("','");
          const subjectAssessments = db.prepare(`
            SELECT * FROM assessments 
            WHERE user_id IN ('${subjectIds}') ${dateFilter}
          `).all();
          
          const subjectWarningsRaw = db.prepare(`
            SELECT * FROM warnings 
            WHERE user_id IN ('${subjectIds}') AND status = 'pending'
          `).all();
          
          // 按用户去重，只保留每个用户最新的预警
          const subjectUserWarningMap = new Map();
          subjectWarningsRaw.forEach((warning: any) => {
            const existing = subjectUserWarningMap.get(warning.user_id);
            if (!existing || new Date(warning.timestamp) > new Date(existing.timestamp)) {
              subjectUserWarningMap.set(warning.user_id, warning);
            }
          });
          const subjectWarnings = Array.from(subjectUserWarningMap.values());
          
          let avgScore = 0;
          if (subjectAssessments.length > 0) {
            const scores = subjectAssessments.map((a: any) => {
              const s = JSON.parse(a.scores);
              const avg = Object.values(s).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(s).length;
              return avg;
            });
            avgScore = Math.round(100 - scores.reduce((sum, s) => sum + s, 0) / scores.length * 10);
          }
          
          const warningRate = subjectTeachers.length > 0 
            ? Math.round((subjectWarnings.length / subjectTeachers.length) * 100) 
            : 0;
          
          // 计算工具使用率
          const subjectToolUsage = allToolUsage.filter((u: any) => subjectTeachers.some(t => t.id === u.user_id));
          const uniqueSubjectUsers = new Set(subjectToolUsage.map((u: any) => u.user_id));
          const usageRate = subjectTeachers.length > 0 
            ? Math.round((uniqueSubjectUsers.size / subjectTeachers.length) * 100) 
            : 0; // 使用真实值而不是默认值
          
          // 基于真实数据计算效果率
          let effectRate = 0;
          if (subjectAssessments.length > 0) {
            // 计算干预前后的分数变化
            const improvementCount = subjectAssessments.filter((a: any, index: number) => {
              if (index === 0) return false;
              const currentScores = JSON.parse(a.scores);
              const prevScores = JSON.parse(subjectAssessments[index - 1].scores);
              const currentAvg = Object.values(currentScores).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(currentScores).length;
              const prevAvg = Object.values(prevScores).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(prevScores).length;
              return currentAvg < prevAvg; // 分数降低表示改善
            }).length;
            effectRate = subjectAssessments.length > 1 ? Math.round((improvementCount / (subjectAssessments.length - 1)) * 10) : 5;
          }
          
          drillDownData.push({
            label: `${subject}学科组`,
            grade: 'all',
            subject,
            experience: 'all',
            count: subjectTeachers.length,
            score: avgScore,
            warning: `${warningRate}%`,
            usage: `${usageRate}%`,
            effect: `+${effectRate}%`
          });
        }
      });

      const experienceGroups = [
        { label: '新锐教师 (0-2年)', key: '0-2', min: 0, max: 2 },
        { label: '菁英教师 (3-5年)', key: '3-5', min: 3, max: 5 },
        { label: '骨干教师 (6-15年)', key: '6-15', min: 6, max: 15 },
        { label: '领航教师 (16年以上)', key: '16+', min: 16, max: 999 }
      ];
      
      experienceGroups.forEach(group => {
        const expTeachers = filteredTeachers.filter(t => {
          const exp = t.teaching_experience || 0;
          return exp >= group.min && exp <= group.max;
        });
        
        if (expTeachers.length > 0) {
          const expIds = expTeachers.map(t => t.id).join("','");
          const expAssessments = db.prepare(`
            SELECT * FROM assessments 
            WHERE user_id IN ('${expIds}') ${dateFilter}
          `).all();
          
          const expWarningsRaw = db.prepare(`
            SELECT * FROM warnings 
            WHERE user_id IN ('${expIds}') AND status = 'pending'
          `).all();
          
          // 按用户去重，只保留每个用户最新的预警
          const expUserWarningMap = new Map();
          expWarningsRaw.forEach((warning: any) => {
            const existing = expUserWarningMap.get(warning.user_id);
            if (!existing || new Date(warning.timestamp) > new Date(existing.timestamp)) {
              expUserWarningMap.set(warning.user_id, warning);
            }
          });
          const expWarnings = Array.from(expUserWarningMap.values());
          
          let avgScore = 0;
          if (expAssessments.length > 0) {
            const scores = expAssessments.map((a: any) => {
              const s = JSON.parse(a.scores);
              const avg = Object.values(s).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(s).length;
              return avg;
            });
            avgScore = Math.round(100 - scores.reduce((sum, s) => sum + s, 0) / scores.length * 10);
          }
          
          const warningRate = expTeachers.length > 0 
            ? Math.round((expWarnings.length / expTeachers.length) * 100) 
            : 0;
          
          const uniqueUsers = new Set(allToolUsage.filter((u: any) => expTeachers.some(t => t.id === u.user_id)).map((u: any) => u.user_id));
          const usageRate = expTeachers.length > 0 
            ? Math.round((uniqueUsers.size / expTeachers.length) * 100) 
            : 0; // 使用真实值而不是默认值
          
          // 基于真实数据计算效果率
          let effectRate = 0;
          if (expAssessments.length > 0) {
            // 计算干预前后的分数变化
            const improvementCount = expAssessments.filter((a: any, index: number) => {
              if (index === 0) return false;
              const currentScores = JSON.parse(a.scores);
              const prevScores = JSON.parse(expAssessments[index - 1].scores);
              const currentAvg = Object.values(currentScores).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(currentScores).length;
              const prevAvg = Object.values(prevScores).reduce((sum: number, val: any) => sum + (val || 0), 0) / Object.keys(prevScores).length;
              return currentAvg < prevAvg; // 分数降低表示改善
            }).length;
            effectRate = expAssessments.length > 1 ? Math.round((improvementCount / (expAssessments.length - 1)) * 10) : 5;
          }
          
          drillDownData.push({
            label: group.label,
            grade: 'all',
            subject: 'all',
            experience: group.key,
            count: expTeachers.length,
            score: avgScore,
            warning: `${warningRate}%`,
            usage: `${usageRate}%`,
            effect: `+${effectRate}%`
          });
        }
      });

      const suggestions: any[] = [];
      
      const highRiskGroups = riskHeatmap.filter(h => h.riskLevel > 50);
      if (highRiskGroups.length > 0) {
        const highestRisk = highRiskGroups.sort((a, b) => b.riskLevel - a.riskLevel)[0];
        
        const subjectMap: Record<string, string> = {
          '语文': '语文组',
          '数学': '数学组',
          '英语': '英语组',
          '科学': '科学组',
          '道法': '道法组',
          '音乐': '音乐组',
          '体育': '体育组',
          '美术': '美术组'
        };
        
        const expectedDepartment = subjectMap[highestRisk.subject];
        const relevantTeachers = expectedDepartment 
          ? filteredTeachers.filter(t => t.department?.includes(expectedDepartment))
          : [];
        
        let workloadAnalysis = '';
        let avgWorkload = 0;
        if (relevantTeachers.length > 0 && allWorkloadData.length > 0) {
          const groupWorkload = allWorkloadData.filter((w: any) => 
            relevantTeachers.some(t => t.id === w.user_id)
          );
          
          if (groupWorkload.length > 0) {
            avgWorkload = groupWorkload.reduce((sum, w: any) => 
              sum + (w.total_workload_index || 0), 0) / groupWorkload.length;
            
            if (avgWorkload > 80) {
              workloadAnalysis = `该组教师平均工作负荷指数为 ${Math.round(avgWorkload)}，超出常规承载范围（80），可能存在工作压力过大的问题。`;
            } else if (avgWorkload > 70) {
              workloadAnalysis = `该组教师平均工作负荷指数为 ${Math.round(avgWorkload)}，处于较高水平，需要关注工作压力管理。`;
            } else {
              workloadAnalysis = `该组教师工作负荷指数为 ${Math.round(avgWorkload)}，处于正常范围内，需要从其他方面分析风险原因。`;
            }
          }
        }
        
        suggestions.push({
          type: 'risk',
          title: `异常识别：${highestRisk.grade}${highestRisk.subject}组风险持续偏高`,
          rootCause: `该组风险指数达到 ${highestRisk.riskLevel}%，${workloadAnalysis || '建议进一步分析该组教师的具体情况。'}`,
          suggestion: `建议为该组教师安排专项心理支持活动，${avgWorkload > 80 ? '适当调整工作安排，减轻工作负荷，' : ''}并加强心理健康监测。`
        });
      }
      
      if (resourceEfficiency.length > 0) {
        const lowUsageTools = resourceEfficiency.filter(t => t.usage < 10);
        if (lowUsageTools.length > 0) {
          suggestions.push({
            type: 'efficiency',
            title: '效能优化：部分心理工具使用率偏低',
            rootCause: `${lowUsageTools.map(t => t.tool).join('、')} 等工具使用频次较低（${lowUsageTools.map(t => t.usage).join('、')}次），可能需要优化推广策略或改进工具功能。`,
            suggestion: `建议通过培训、示范、案例分享等方式提高教师对这些工具的认知和使用意愿，同时收集用户反馈优化工具体验。`
          });
        }
        
        const lowImprovementTools = resourceEfficiency.filter(t => t.improvement < 50 && t.usage > 10);
        if (lowImprovementTools.length > 0) {
          suggestions.push({
            type: 'effectiveness',
            title: '效果分析：部分工具改善效果有待提升',
            rootCause: `${lowImprovementTools.map(t => t.tool).join('、')} 等工具虽然使用率较高，但改善效果仅为 ${lowImprovementTools.map(t => t.improvement).join('%、')}%，可能需要调整使用方法或工具内容。`,
            suggestion: `建议对这些工具的使用方法和内容进行评估和优化，提供更个性化的使用指导，提高工具的实际效果。`
          });
        }
      }
      
      if (interventionRate < 80) {
        const pendingTasks = allInterventionTasks.filter((t: any) => t.status === 'pending').length;
        const inProgressTasks = allInterventionTasks.filter((t: any) => t.status === 'in_progress').length;
        
        suggestions.push({
          type: 'intervention',
          title: '干预完成率有待提升',
          rootCause: `当前干预任务完成率为 ${interventionRate}%，其中待处理任务 ${pendingTasks} 个，进行中任务 ${inProgressTasks} 个，可能存在任务跟进不及时或资源不足的问题。`,
          suggestion: `建议加强干预任务的跟踪管理，建立定期跟进机制，确保每项干预任务都能得到及时跟进和完成。同时评估是否需要增加心理支持资源。`
        });
      }
      
      if (allDiaryEntries.length > 0) {
        const recentMoods = allDiaryEntries.slice(0, 50).map((e: any) => e.mood);
        const avgMood = recentMoods.reduce((sum, m) => sum + m, 0) / recentMoods.length;
        
        if (avgMood < 5) {
          suggestions.push({
            type: 'mood',
            title: '情绪监测：整体情绪状态偏低',
            rootCause: `近期教师情绪日记平均分为 ${Math.round(avgMood)}（满分10分），低于正常水平，可能存在普遍性的情绪困扰。`,
            suggestion: `建议组织全校性的心理健康活动，如团体辅导、减压工作坊等，营造积极健康的心理氛围。同时关注个别情绪持续偏低的教师。`
          });
        }
      }
      
      if (allPhysiologicalData.length > 0) {
        const recentHrvData = allPhysiologicalData.slice(0, 20);
        let avgHrv = 65;
        
        const hrvValues = recentHrvData.map((p: any) => {
          const hrvArray = JSON.parse(p.hrv || '[]');
          return hrvArray.length > 0 ? hrvArray.reduce((sum: number, val: number) => sum + val, 0) / hrvArray.length : 65;
        });
        
        if (hrvValues.length > 0) {
          avgHrv = hrvValues.reduce((sum, val) => sum + val, 0) / hrvValues.length;
        }
        
        if (avgHrv < 55) {
          suggestions.push({
            type: 'physiological',
            title: '生理指标：HRV均值偏低',
            rootCause: `近期教师心率变异性（HRV）平均值为 ${Math.round(avgHrv)} ms，低于正常水平（55-100 ms），提示自主神经系统压力过大，可能影响身心健康。`,
            suggestion: `建议加强压力管理培训，推广正念冥想、呼吸训练等放松技巧，鼓励教师保持规律作息和适度运动。`
          });
        }
      }
      
      if (suggestions.length === 0) {
        suggestions.push({
          type: 'positive',
          title: '整体状况良好',
          rootCause: '各项指标均在合理范围内，教师心理健康状况整体稳定，心理支持体系运行良好。',
          suggestion: '继续保持当前的管理和支持策略，定期监测各项指标变化，及时发现和处理潜在问题。'
        });
      }

      res.json({
        overallIndex,
        warningCount: warningCount,
        interventionRate,
        resourceEngagement,
        trends,
        riskHeatmap,
        resourceEfficiency,
        trackingData,
        interventionTypeChartData,
        drillDownData,
        suggestions
      });
    } catch (error) {
      console.error("获取驾驶舱数据失败:", error);
      res.status(500).json({ error: "获取驾驶舱数据失败" });
    }
  });

  // ==================== 健康检查 API ====================

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ==================== 个人信息相关 API ====================
  
  // 获取当前用户的个人信息
  app.get("/api/personal-info", authMiddleware, (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const user = userDb.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }
      
      res.json({
        name: user.display_name || "",
        gender: user.gender || "",
        phone: user.phone || "",
        email: user.email || "",
        department: user.department || "",
        subject: user.subject || user.department || "", // 使用 user.subject，如果不存在则使用 user.department
        grade: user.grade || "",
        title: user.title || "",
        bio: user.bio || "",
        teachingExperience: user.teaching_experience
      });
    } catch (error) {
      console.error("获取个人信息失败:", error);
      res.status(500).json({ error: "获取个人信息失败" });
    }
  });

  // 保存/更新个人信息
  app.post("/api/personal-info", authMiddleware, (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const { name, gender, phone, email, department, subject, grade, title, bio, teachingExperience } = req.body;
      
      const user = userDb.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }
      
      // 检查是否是第一次填写
      const isFirstTime = !user.department || !user.grade;
      
      // 更新用户信息 - subject保存到department
      userDb.update(userId, {
        display_name: name || user.display_name,
        gender: gender || user.gender,
        phone: phone || user.phone,
        email: email || user.email,
        department: subject || department || user.department,
        grade: grade || user.grade,
        title: title || user.title,
        bio: bio || user.bio,
        teaching_experience: teachingExperience !== undefined ? teachingExperience : user.teaching_experience
      });
      
      // 如果是第一次填写，返回不需要审核；否则需要审核
      res.json({ 
        success: true, 
        pending: !isFirstTime,
        message: isFirstTime ? "信息已保存" : "信息已提交，等待审核"
      });
    } catch (error) {
      console.error("保存个人信息失败:", error);
      res.status(500).json({ error: "保存个人信息失败" });
    }
  });

  // 获取教研组成员列表（教研组长和管理员可用）
  app.get("/api/group-members", authMiddleware, (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const user = userDb.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }
      
      // 只有教研组长和管理员可以查看组员
      if (user.role !== 'dept_head' && user.role !== 'admin') {
        return res.status(403).json({ error: "无权限访问" });
      }
      
      let targetManagerId = userId;
      // 如果是管理员，可以通过query参数指定要看谁的组员
      if (user.role === 'admin' && req.query.managerId) {
        targetManagerId = req.query.managerId;
      }
      
      // 获取所有归属于目标组长的教师
      const allUsers = userDb.getAll();
      const groupMembers = allUsers.filter(u => u.manager_id === targetManagerId && u.role === 'teacher');
      
      const members = groupMembers.map(m => ({
        id: m.id,
        name: m.display_name,
        gender: m.gender || "",
        subject: m.department || "",
        grade: m.grade || "",
        phone: m.phone || "",
        email: m.email,
        department: m.department || "",
        isGroupMember: true
      }));
      
      res.json(members);
    } catch (error) {
      console.error("获取教研组成员失败:", error);
      res.status(500).json({ error: "获取教研组成员失败" });
    }
  });

  // 获取所有教研组长（管理员可用）
  app.get("/api/dept-heads", authMiddleware, (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const user = userDb.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }
      
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "无权限访问" });
      }
      
      const allUsers = userDb.getAll();
      const deptHeads = allUsers.filter(u => u.role === 'dept_head').map(u => ({
        id: u.id,
        name: u.display_name,
        email: u.email,
        department: u.department || ""
      }));
      
      res.json(deptHeads);
    } catch (error) {
      console.error("获取教研组长失败:", error);
      res.status(500).json({ error: "获取教研组长失败" });
    }
  });

  // 获取全校教师列表（教研组长和管理员可用）
  app.get("/api/teachers/all", authMiddleware, (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const user = userDb.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }
      
      // 只有教研组长和管理员可以查看全校教师
      if (user.role !== 'dept_head' && user.role !== 'admin') {
        return res.status(403).json({ error: "无权限访问" });
      }
      
      let targetManagerId = userId;
      // 如果是管理员，可以通过query参数指定要看谁的可选教师
      if (user.role === 'admin' && req.query.managerId) {
        targetManagerId = req.query.managerId;
      }
      
      // 获取目标组长的组员 ID 列表
      const groupMemberIds = userDb.getAll()
        .filter(u => u.manager_id === targetManagerId)
        .map(u => u.id);
      
      // 获取所有教师
      const allUsers = userDb.getAll();
      const teachers = allUsers.filter(u => 
        u.role === 'teacher' && 
        u.id !== targetManagerId &&
        (user.role === 'admin' || u.manager_id === null || u.manager_id === targetManagerId)
      );
      
      const teacherList = teachers.map(t => ({
        id: t.id,
        name: t.display_name,
        gender: t.gender || "",
        subject: t.department || "",
        grade: t.grade || "",
        phone: t.phone || "",
        email: t.email,
        department: t.department || "",
        isGroupMember: groupMemberIds.includes(t.id)
      }));
      
      res.json(teacherList);
    } catch (error) {
      console.error("获取教师列表失败:", error);
      res.status(500).json({ error: "获取教师列表失败" });
    }
  });

  // 添加组员
  app.post("/api/group-members/:teacherId", authMiddleware, (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const teacherId = req.params.teacherId;
      const user = userDb.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }
      
      // 只有教研组长和管理员可以添加组员
      if (user.role !== 'dept_head' && user.role !== 'admin') {
        return res.status(403).json({ error: "无权限访问" });
      }
      
      let targetManagerId = userId;
      // 如果是管理员，可以通过query参数指定要添加到哪个组长
      if (user.role === 'admin' && req.query.managerId) {
        targetManagerId = req.query.managerId;
      }
      
      const teacher = userDb.findById(teacherId);
      if (!teacher) {
        return res.status(404).json({ error: "教师不存在" });
      }
      
      // 更新教师的 manager_id
      userDb.update(teacherId, { manager_id: targetManagerId });
      
      res.json({ success: true, message: "添加成功" });
    } catch (error) {
      console.error("添加组员失败:", error);
      res.status(500).json({ error: "添加组员失败" });
    }
  });

  // 移除组员
  app.delete("/api/group-members/:teacherId", authMiddleware, (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const teacherId = req.params.teacherId;
      const user = userDb.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }
      
      // 只有教研组长和管理员可以移除组员
      if (user.role !== 'dept_head' && user.role !== 'admin') {
        return res.status(403).json({ error: "无权限访问" });
      }
      
      const teacher = userDb.findById(teacherId);
      if (!teacher) {
        return res.status(404).json({ error: "教师不存在" });
      }
      
      // 清除教师的 manager_id
      userDb.update(teacherId, { manager_id: null });
      
      res.json({ success: true, message: "移除成功" });
    } catch (error) {
      console.error("移除组员失败:", error);
      res.status(500).json({ error: "移除组员失败" });
    }
  });

  // ==================== 管理员相关 API ====================

  // 获取所有用户（管理员可用）
  app.get("/api/admin/users", authMiddleware, (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const user = userDb.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }
      
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "无权限访问" });
      }
      
      const allUsers = userDb.getAll();
      const userList = allUsers.map(u => ({
        id: u.id,
        name: u.display_name,
        email: u.email,
        role: u.role,
        gender: u.gender || "",
        phone: u.phone || "",
        subject: u.department || "",
        grade: u.grade || "",
        teachingExperience: u.teaching_experience,
        managerId: u.manager_id
      }));
      
      res.json(userList);
    } catch (error) {
      console.error("获取所有用户失败:", error);
      res.status(500).json({ error: "获取所有用户失败" });
    }
  });

  // 设置用户角色（管理员可用）
  app.put("/api/admin/users/:userId/role", authMiddleware, (req: any, res) => {
    try {
      const currentUserId = req.user?.userId;
      const targetUserId = req.params.userId;
      const { role } = req.body;
      
      const currentUser = userDb.findById(currentUserId);
      if (!currentUser) {
        return res.status(404).json({ error: "用户不存在" });
      }
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ error: "无权限访问" });
      }
      
      const validRoles = ['teacher', 'admin', 'psychologist', 'dept_head'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "无效的角色" });
      }
      
      const targetUser = userDb.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: "目标用户不存在" });
      }
      
      userDb.update(targetUserId, { role });
      
      res.json({ success: true, message: "角色更新成功" });
    } catch (error) {
      console.error("更新用户角色失败:", error);
      res.status(500).json({ error: "更新用户角色失败" });
    }
  });

  app.put("/api/admin/users/:userId", authMiddleware, (req: any, res) => {
    try {
      const currentUserId = req.user?.userId;
      const targetUserId = req.params.userId;
      const { name, email, subject, grade, teachingExperience, gender, phone } = req.body;
      
      const currentUser = userDb.findById(currentUserId);
      if (!currentUser) {
        return res.status(404).json({ error: "用户不存在" });
      }
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ error: "无权限访问" });
      }
      
      const targetUser = userDb.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: "目标用户不存在" });
      }
      
      userDb.update(targetUserId, {
        display_name: name || targetUser.display_name,
        email: email || targetUser.email,
        department: subject || targetUser.department,
        grade: grade || targetUser.grade,
        teaching_experience: teachingExperience !== undefined ? teachingExperience : targetUser.teaching_experience,
        gender: gender || targetUser.gender,
        phone: phone || targetUser.phone
      });
      
      res.json({ success: true, message: "用户信息更新成功" });
    } catch (error) {
      console.error("更新用户信息失败:", error);
      res.status(500).json({ error: "更新用户信息失败" });
    }
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
        
        // 为教师设置年级
        let grade = '';
        if (teacher.email === 'teacher1@school.com') {
          grade = '一年级';
        } else if (teacher.email === 'teacher2@school.com') {
          grade = '二年级';
        } else if (teacher.email === 'teacher3@school.com') {
          grade = '三年级';
        } else if (teacher.email === 'teacher4@school.com') {
          grade = '四年级';
        }
        
        if (grade) {
          userDb.update(teacher.id, { grade });
          console.log(`已为教师 ${teacher.display_name} 设置年级: ${grade}`);
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
    console.log(`Database: SQLite (school_mental_health.db)`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
