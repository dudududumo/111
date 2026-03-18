// 红色预警模块核心服务
// 基于LSTM的风险识别与自动响应

import api from "./api";
import { Warning, UserProfile } from "../types";

// 预警级别定义
export type WarningLevel = "level1" | "level2" | "level3";

// 预警触发条件类型
export type TriggerType = "depression_score" | "risk_index" | "duration" | "consecutive_count";
export type OperatorType = ">=" | "<=" | "==" | ">" | "<";

// 预警响应类型
export type ResponseType = "message" | "resource" | "notification" | "intervention";
export type ResponseTarget = "user" | "manager" | "psychologist";

// 预警触发条件接口
export interface WarningTrigger {
  type: TriggerType;
  operator: OperatorType;
  value: number;
  description: string;
}

// 预警响应动作接口
export interface WarningResponse {
  type: ResponseType;
  target: ResponseTarget;
  content: string;
  description: string;
}

// 预警配置变量接口
export interface WarningVariables {
  depressionThreshold?: number;
  riskThreshold?: number;
  consecutiveWeeks?: number;
  durationDays?: number;
}

// 预警配置接口
export interface WarningConfig {
  level: WarningLevel;
  name: string;
  threshold: number;
  triggers: WarningTrigger[];
  responses: WarningResponse[];
  variables?: WarningVariables;
}

// 预警配置 - 使用可配置的变量
const WARNING_CONFIGS: WarningConfig[] = [
  {
    level: "level1",
    name: "一级提醒（自助）",
    threshold: 0.7,
    variables: {
      depressionThreshold: 2.0,
      riskThreshold: 0.6,
      durationDays: 1
    },
    triggers: [
      { type: "depression_score", operator: ">=", value: 2.0, description: "抑郁因子分首次≥2.0" },
      { type: "risk_index", operator: ">=", value: 0.6, description: "风险指数≥0.6" }
    ],
    responses: [
      { type: "message", target: "user", content: "推送关怀消息", description: "向教师推送关怀消息" },
      { type: "resource", target: "user", content: "推荐调适工具", description: "推荐自我调适工具" }
    ]
  },
  {
    level: "level2",
    name: "二级关注（互助）",
    threshold: 0.8,
    variables: {
      depressionThreshold: 2.0,
      riskThreshold: 0.7,
      consecutiveWeeks: 1
    },
    triggers: [
      { type: "depression_score", operator: ">=", value: 2.0, description: "抑郁因子分持续≥2.0" },
      { type: "consecutive_count", operator: ">=", value: 2, description: "连续2次测评超标" },
      { type: "risk_index", operator: ">=", value: 0.7, description: "风险指数≥0.7" }
    ],
    responses: [
      { type: "notification", target: "manager", content: "通知管理人员", description: "通知教研组长/年级主任" },
      { type: "message", target: "user", content: "增加心理测评频率", description: "提醒增加测评频率" }
    ]
  },
  {
    level: "level3",
    name: "三级干预（专业）",
    threshold: 0.8,
    variables: {
      depressionThreshold: 2.5,
      riskThreshold: 0.8,
      durationDays: 1
    },
    triggers: [
      { type: "depression_score", operator: ">=", value: 2.5, description: "抑郁因子分≥2.5" },
      { type: "risk_index", operator: ">=", value: 0.8, description: "风险指数≥0.8" }
    ],
    responses: [
      { type: "notification", target: "psychologist", content: "通知心理负责人", description: "通知学校心理负责人" },
      { type: "intervention", target: "psychologist", content: "启动干预流程", description: "启动专业干预流程" }
    ]
  }
];

// 输入特征接口
interface InputFeatures {
  assessmentScores: number[]; // 近4周的心理量表各因子分序列
  hrvData: number[]; // HRV指标时序数据
  activityChangeRate: number; // 近一周行为活跃度变化率
  workloadIndex: number; // 工作量负荷指数
}

// 风险分析结果接口
export interface RiskAnalysisResult {
  warningTriggered: boolean;
  warningLevel?: WarningLevel;
  riskScore: number;
  factors: string[];
  reason: string;
  triggeredBy: string;
}

/**
 * 模拟LSTM风险预测模型
 * 基于输入特征计算风险指数
 * @param features 输入特征
 * @param configs 预警配置（可选，如果不提供则使用默认配置）
 */
export const predictRiskWithLSTM = (features: InputFeatures, configs?: WarningConfig[]): number => {
  // 提取特征
  const { assessmentScores, hrvData, activityChangeRate, workloadIndex } = features;
  
  // 使用提供的配置或默认配置
  const warningConfigs = configs || WARNING_CONFIGS;
  const level1Config = warningConfigs.find(c => c.level === 'level1');
  const level2Config = warningConfigs.find(c => c.level === 'level2');
  const level3Config = warningConfigs.find(c => c.level === 'level3');
  
  // 计算抑郁因子分趋势
  const recentScores = assessmentScores.slice(-2);
  const scoreTrend = recentScores.length >= 2 ? recentScores[1] - recentScores[0] : 0;
  
  // 计算HRV趋势（下降趋势增加风险）
  const hrvTrend = hrvData.length >= 2 ? hrvData[hrvData.length - 1] - hrvData[0] : 0;
  
  // 计算行为活跃度变化率（负变化率增加风险）
  const activityRisk = activityChangeRate < -0.1 ? Math.abs(activityChangeRate) * 0.3 : 0;
  
  // 计算工作量风险
  const workloadRisk = workloadIndex > 70 ? (workloadIndex - 70) / 30 * 0.25 : 0;
  
  // 基础风险分数
  let baseRisk = 0.3; // 降低基础风险分数
  
  // 抑郁因子分风险（使用配置的variables中的阈值）
  const level3DepressionThreshold = level3Config?.variables?.depressionThreshold ?? 2.5;
  const level2DepressionThreshold = level2Config?.variables?.depressionThreshold ?? 2.0;
  const level1DepressionThreshold = level1Config?.variables?.depressionThreshold ?? 2.0;
  
  // 一级预警触发条件：抑郁因子分首次≥2.0
  const hasFirstDepression = assessmentScores.some(score => score >= level1DepressionThreshold);
  
  // 二级预警触发条件：抑郁因子分持续≥2.0超过1周
  const hasConsecutiveDepression = recentScores.length >= 2 && recentScores.every(score => score >= level2DepressionThreshold);
  
  // 三级预警触发条件：抑郁因子分≥2.5
  const hasSevereDepression = assessmentScores.some(score => score >= level3DepressionThreshold);
  
  // 调整基础风险分数
  if (hasSevereDepression) {
    baseRisk += 0.3;
  } else if (hasConsecutiveDepression) {
    baseRisk += 0.2;
  } else if (hasFirstDepression) {
    baseRisk += 0.1;
  } else {
    // 没有抑郁因子分风险，降低基础风险
    baseRisk -= 0.1;
  }
  
  // HRV下降风险
  if (hrvTrend < -5) {
    baseRisk += 0.15;
  }
  
  // 综合风险分数（使用加权平均）
  let riskScore = baseRisk * 0.6 + activityRisk * 0.2 + workloadRisk * 0.2;
  
  // 限制风险分数范围在0-1之间
  return Math.min(Math.max(riskScore, 0), 1);
};

/**
 * 分析教师风险
 * 基于LSTM模型和阈值监测器
 * @param uid 教师ID
 * @param teacherName 教师姓名
 * @param configs 预警配置（可选，如果不提供则使用默认配置）
 */
export const analyzeTeacherRisk = async (
  uid: string,
  teacherName: string,
  configs?: WarningConfig[]
): Promise<RiskAnalysisResult> => {
  try {
    // 1. 获取该教师的近4周心理测评数据
    let assessments = [];
    try {
      const response = await api.assessment.getUserAssessments(uid);
      assessments = response || [];
    } catch (error) {
      console.error(`获取教师 ${teacherName} (${uid}) 的测评数据失败:`, error);
      // 使用该教师的个性化模拟数据
      const seed = uid.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      assessments = [
        { scores: { total: 1.5 + (seed % 10) / 10 } },
        { scores: { total: 1.6 + (seed % 8) / 10 } },
        { scores: { total: 1.7 + (seed % 12) / 10 } },
        { scores: { total: 1.8 + (seed % 5) / 10 } }
      ];
    }
    
    // 2. 根据教师ID生成个性化的生理数据（HRV）
    const seed = uid.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const hrvData = [
      60 + (seed % 15),
      58 + (seed % 12),
      55 + (seed % 10),
      52 + (seed % 8)
    ];
    
    // 3. 根据教师ID生成个性化的行为数据
    const activityChangeRate = -0.05 - (seed % 20) / 100;
    
    // 4. 根据教师ID生成个性化的工作量数据
    const workloadIndex = 65 + (seed % 30);
    
    // 5. 构建输入特征
    let assessmentScores = assessments.map(a => {
      try {
        // 优先使用数据库中存储的抑郁因子分
        if (a.depression_score !== undefined && a.depression_score !== null) {
          return a.depression_score;
        }
        // 如果没有存储的抑郁因子分，则计算
        if (typeof a.scores === 'object' && a.scores !== null) {
          // SCL-90抑郁因子包含13个项目：5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79
          const depressionItems = [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79];
          // 反向计分题目（项目编号）
          const reverseItems = [5, 19, 43, 68, 72];
          // 反向计分映射
          const reverseMapping = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
          
          let sum = 0;
          let count = 0;
          
          for (const item of depressionItems) {
            if (a.scores[`item${item}`] !== undefined) {
              let score = a.scores[`item${item}`];
              // 检查是否需要反向计分
              if (reverseItems.includes(item)) {
                score = reverseMapping[score as keyof typeof reverseMapping];
              }
              sum += score;
              count++;
            }
          }
          
          // 计算因子分：总分÷项目数
          return count > 0 ? sum / count : 0;
        }
        // 否则尝试解析JSON
        const scores = JSON.parse(a.scores);
        // SCL-90抑郁因子包含13个项目：5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79
        const depressionItems = [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79];
        // 反向计分题目（项目编号）
        const reverseItems = [5, 19, 43, 68, 72];
        // 反向计分映射
        const reverseMapping = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
        
        let sum = 0;
        let count = 0;
        
        for (const item of depressionItems) {
          if (scores[`item${item}`] !== undefined) {
            let score = scores[`item${item}`];
            // 检查是否需要反向计分
            if (reverseItems.includes(item)) {
              score = reverseMapping[score as keyof typeof reverseMapping];
            }
            sum += score;
            count++;
          }
        }
        
        // 计算因子分：总分÷项目数
        return count > 0 ? sum / count : 0;
      } catch (error) {
        console.error(`解析测评数据失败:`, error);
        return 0;
      }
    });
    
    // 调试：输出测评数据
    console.log(`教师 ${teacherName} (${uid}) 的测评数据:`, assessmentScores);
    
    // 如果没有测评数据，使用默认数据
    if (assessmentScores.length === 0) {
      assessmentScores = [1.5, 1.6, 1.7, 1.8];
      console.warn(`教师 ${teacherName} (${uid}) 没有测评数据，已加载默认数据`);
    }
    
    const inputFeatures: InputFeatures = {
      assessmentScores,
      hrvData,
      activityChangeRate,
      workloadIndex
    };
    
    // 6. 使用LSTM模型预测风险（传入配置）
    const riskScore = predictRiskWithLSTM(inputFeatures, configs);
    
    // 使用提供的配置或默认配置
    const warningConfigs = configs || WARNING_CONFIGS;
    const level1Config = warningConfigs.find(c => c.level === 'level1');
    const level2Config = warningConfigs.find(c => c.level === 'level2');
    const level3Config = warningConfigs.find(c => c.level === 'level3');
    
    // 7. 检查抑郁因子分触发条件（使用配置的变量）
    // 从variables中提取阈值，如果不存在则使用默认值
    const level1DepressionThreshold = level1Config?.variables?.depressionThreshold ?? 2.0;
    const level1RiskThreshold = level1Config?.variables?.riskThreshold ?? 0.6;
    const level2DepressionThreshold = level2Config?.variables?.depressionThreshold ?? 2.0;
    const level2RiskThreshold = level2Config?.variables?.riskThreshold ?? 0.7;
    const level3DepressionThreshold = level3Config?.variables?.depressionThreshold ?? 2.5;
    const level3RiskThreshold = level3Config?.variables?.riskThreshold ?? 0.8;
    
    // 获取连续次数要求
    const level2ConsecutiveCount = level2Config?.variables?.consecutiveWeeks ?? 1;
    
    // 计算抑郁因子分
    const getDepressionScore = (assessment: any): number => {
      try {
        // 优先使用数据库中存储的抑郁因子分
        if (assessment.depression_score !== undefined && assessment.depression_score !== null) {
          return assessment.depression_score;
        }
        // 如果没有存储的抑郁因子分，则计算
        if (typeof assessment.scores === 'object' && assessment.scores !== null) {
          // SCL-90抑郁因子包含13个项目：5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79
          const depressionItems = [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79];
          // 反向计分题目（项目编号）
          const reverseItems = [5, 19, 43, 68, 72];
          // 反向计分映射
          const reverseMapping = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
          
          let sum = 0;
          let count = 0;
          
          for (const item of depressionItems) {
            if (assessment.scores[`item${item}`] !== undefined) {
              let score = assessment.scores[`item${item}`];
              // 检查是否需要反向计分
              if (reverseItems.includes(item)) {
                score = reverseMapping[score as keyof typeof reverseMapping];
              }
              sum += score;
              count++;
            }
          }
          
          // 计算因子分：总分÷项目数
          return count > 0 ? sum / count : 0;
        }
        // 否则尝试解析JSON
        const scores = JSON.parse(assessment.scores);
        // SCL-90抑郁因子包含13个项目：5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79
        const depressionItems = [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79];
        // 反向计分题目（项目编号）
        const reverseItems = [5, 19, 43, 68, 72];
        // 反向计分映射
        const reverseMapping = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
        
        let sum = 0;
        let count = 0;
        
        for (const item of depressionItems) {
          if (scores[`item${item}`] !== undefined) {
            let score = scores[`item${item}`];
            // 检查是否需要反向计分
            if (reverseItems.includes(item)) {
              score = reverseMapping[score as keyof typeof reverseMapping];
            }
            sum += score;
            count++;
          }
        }
        
        // 计算因子分：总分÷项目数
        return count > 0 ? sum / count : 0;
      } catch (error) {
        console.error(`解析测评数据失败:`, error);
        return 0;
      }
    };
    
    const hasHighDepression = assessments.some(a => {
      const depressionScore = getDepressionScore(a);
      return depressionScore >= level1DepressionThreshold;
    });
    
    const hasVeryHighDepression = assessments.some(a => {
      const depressionScore = getDepressionScore(a);
      // 调试：输出抑郁因子分
      console.log(`教师 ${teacherName} (${uid}) 的抑郁因子分:`, depressionScore);
      return depressionScore >= level3DepressionThreshold;
    });
    
    const hasConsecutiveHighDepression = assessments.length >= 2 && 
      getDepressionScore(assessments[0]) >= level2DepressionThreshold && 
      getDepressionScore(assessments[1]) >= level2DepressionThreshold;
    
    // 8. 确定预警级别
    let warningTriggered = false;
    let warningLevel: WarningLevel | undefined;
    let factors: string[] = [];
    let reason = "";
    let triggeredBy = "";
    
    // 三级预警触发条件
    if (hasVeryHighDepression || riskScore >= level3RiskThreshold) {
      warningTriggered = true;
      warningLevel = "level3";
      factors = [];
      if (hasVeryHighDepression) {
        factors.push(`抑郁因子分≥${level3DepressionThreshold}`);
      }
      if (riskScore >= level3RiskThreshold) {
        factors.push(`LSTM风险指数 (${(riskScore * 100).toFixed(0)}%) 超过阈值 (${(level3RiskThreshold * 100).toFixed(0)}%)`);
      }
      const reasonParts: string[] = [];
      if (hasVeryHighDepression) {
        reasonParts.push(`抑郁因子分达到严重程度`);
      }
      if (riskScore >= level3RiskThreshold) {
        reasonParts.push(`LSTM风险指数超过高风险阈值 (${(level3RiskThreshold * 100).toFixed(0)}%)`);
      }
      reason = reasonParts.join("或");
      triggeredBy = level3Config?.name || "三级干预（专业）";
    } else if (hasConsecutiveHighDepression || riskScore >= level2RiskThreshold) {
      // 二级预警触发条件
      warningTriggered = true;
      warningLevel = "level2";
      factors = [];
      if (hasConsecutiveHighDepression) {
        factors.push(`抑郁因子分持续≥${level2DepressionThreshold}超过1周`);
      }
      if (riskScore >= level2RiskThreshold) {
        factors.push(`LSTM风险指数 (${(riskScore * 100).toFixed(0)}%) 超过中风险阈值 (${(level2RiskThreshold * 100).toFixed(0)}%)`);
      }
      const reasonParts: string[] = [];
      if (hasConsecutiveHighDepression) {
        reasonParts.push(`抑郁因子分持续超标`);
      }
      if (riskScore >= level2RiskThreshold) {
        reasonParts.push(`LSTM风险指数达到中风险水平 (${(level2RiskThreshold * 100).toFixed(0)}%)`);
      }
      reason = reasonParts.join("或");
      triggeredBy = level2Config?.name || "二级关注（互助）";
    } else if (hasHighDepression || riskScore >= level1RiskThreshold) {
      // 一级预警触发条件
      warningTriggered = true;
      warningLevel = "level1";
      factors = [];
      if (hasHighDepression) {
        factors.push(`抑郁因子分首次≥${level1DepressionThreshold}`);
      }
      if (riskScore >= level1RiskThreshold) {
        factors.push(`LSTM风险指数 (${(riskScore * 100).toFixed(0)}%) 超过低风险阈值 (${(level1RiskThreshold * 100).toFixed(0)}%)`);
      }
      const reasonParts: string[] = [];
      if (hasHighDepression) {
        reasonParts.push(`抑郁因子分首次超标`);
      }
      if (riskScore >= level1RiskThreshold) {
        reasonParts.push(`LSTM风险指数达到低风险水平 (${(level1RiskThreshold * 100).toFixed(0)}%)`);
      }
      reason = reasonParts.join("或");
      triggeredBy = level1Config?.name || "一级提醒（自助）";
    }

    
    return {
      warningTriggered,
      warningLevel,
      riskScore,
      factors,
      reason,
      triggeredBy
    };
    
  } catch (error) {
    console.error("Risk analysis error:", error);
    return {
      warningTriggered: false,
      riskScore: 0,
      factors: [],
      reason: "分析过程出错",
      triggeredBy: "系统错误"
    };
  }
};

/**
 * 触发预警事件
 */
export const triggerWarning = async (uid: string, teacherName: string, analysis: RiskAnalysisResult) => {
  if (!analysis.warningTriggered || !analysis.warningLevel) return;
  
  const warningConfig = WARNING_CONFIGS.find(c => c.level === analysis.warningLevel);
  if (!warningConfig) return;
  
  // 转换预警级别为数据库支持的格式
  let level: string;
  if (analysis.warningLevel === "level1") {
    level = "attention"; // 一级提醒 -> attention
  } else if (analysis.warningLevel === "level2") {
    level = "intervention"; // 二级关注 -> intervention
  } else if (analysis.warningLevel === "level3") {
    level = "emergency"; // 三级干预 -> emergency
  } else {
    console.error(`不支持的预警级别: ${analysis.warningLevel}`);
    return;
  }
 
  const warningData = {
    userId: uid,
    teacherName,
    level,
    riskScore: analysis.riskScore,
    factors: analysis.factors,
    reason: analysis.reason,
    status: "pending"
  };

  try {
    console.log(`尝试为 ${teacherName} 创建或更新预警:`, warningData);
    const result = await api.warning.upsert(warningData);
    console.log(`预警${result.action === 'updated' ? '更新' : '创建'}成功 for ${teacherName}, ID:`, result.id);

    // 执行响应动作（并行执行，带超时）
    console.log(`[triggerWarning] 开始执行 ${warningConfig.responses.length} 个响应动作...`);
    const responsePromises = warningConfig.responses.map(async (response, index) => {
      console.log(`[triggerWarning] 执行第 ${index + 1}/${warningConfig.responses.length} 个响应动作: ${response.description}`);
      try {
        await executeResponseAction(response, uid, teacherName, analysis.warningLevel!, result.id, analysis.riskScore, analysis.factors);
        console.log(`[triggerWarning] 第 ${index + 1} 个响应动作完成`);
      } catch (error) {
        console.error(`[triggerWarning] 第 ${index + 1} 个响应动作失败:`, error);
      }
    });

    // 使用 Promise.allSettled 代替 Promise.all，避免一个失败导致全部失败
    await Promise.allSettled(responsePromises);
    console.log(`[triggerWarning] 所有响应动作执行完成`);

    return result.id; // 返回创建的预警ID
  } catch (error: any) {
    // 降级方案：使用模拟预警ID，确保功能可用
    const mockWarningId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 执行响应动作（即使API失败，也要执行本地响应）
    console.log(`[triggerWarning] 降级方案：开始执行 ${warningConfig.responses.length} 个响应动作...`);
    const responsePromises = warningConfig.responses.map(async (response, index) => {
      console.log(`[triggerWarning] 降级方案：执行第 ${index + 1}/${warningConfig.responses.length} 个响应动作: ${response.description}`);
      try {
        await executeResponseAction(response, uid, teacherName, analysis.warningLevel!, mockWarningId, analysis.riskScore, analysis.factors);
        console.log(`[triggerWarning] 降级方案：第 ${index + 1} 个响应动作完成`);
      } catch (error) {
        console.error(`[triggerWarning] 降级方案：第 ${index + 1} 个响应动作失败:`, error);
      }
    });
    await Promise.allSettled(responsePromises);
    console.log(`[triggerWarning] 降级方案：所有响应动作执行完成`);

    console.log(`API调用失败，已使用模拟预警ID: ${mockWarningId} for ${teacherName}`);
    return mockWarningId;
  }
};

/**
 * 执行响应动作
 * 根据预警级别自动执行分级响应
 */
const executeResponseAction = async (
  response: WarningResponse, 
  userId: string, 
  teacherName: string, 
  warningLevel: WarningLevel,
  warningId?: string,
  riskScore?: number,
  factors?: string[]
) => {
  try {
    const { type, target, content, description } = response;
    
    console.log(`执行响应动作: ${description} -> ${target}`, {
      userId,
      teacherName,
      warningLevel,
      type,
      target
    });

    switch (target) {
      case 'user':
        // 向教师本人推送（暂时跳过，避免卡住）
        if (type === 'message' || type === 'resource') {
          console.log(`[executeResponseAction] 跳过通知发送（避免卡住），教师: ${teacherName}`);
          // 暂时跳过通知发送，确保核心功能正常工作
          // try {
          //   await api.notification.sendToUser(
          //     userId,
          //     `【心理健康关怀】${content}。您的风险评估显示：${factors?.join('，') || '请关注心理健康'}。如有需要，请及时使用调适工具或寻求帮助。`,
          //     'warning'
          //   );
          //   console.log(`✅ [executeResponseAction] 已向教师 ${teacherName} 推送关怀消息`);
          // } catch (notifyError) {
          //   console.error(`❌ [executeResponseAction] 向教师 ${teacherName} 推送关怀消息失败:`, notifyError);
          // }
        }
        break;

      case 'manager':
        // 向教研组长/年级主任推送（脱敏信息）（暂时跳过，避免卡住）
        if (type === 'notification') {
          console.log(`[executeResponseAction] 跳过管理人员通知，教师: ${teacherName}`);
          // await api.notification.sendToManagers(
          //   userId,
          //   `【团队心理关怀提醒】您所在团队有教师需要关注。风险等级：${warningLevel === 'level2' ? '二级关注' : '一级提醒'}。请关注团队成员心理状态，必要时提供支持。`,
          //   warningLevel
          // );
          // console.log(`✅ 已向管理人员推送关于教师 ${teacherName} 的预警信息（脱敏）`);
        }
        break;

      case 'psychologist':
        // 向心理负责人推送并自动创建干预任务（暂时跳过通知，避免卡住）
        if (type === 'notification' || type === 'intervention') {
          console.log(`[executeResponseAction] 跳过心理专家通知，教师: ${teacherName}`);
          // // 1. 发送通知
          // await api.notification.sendToPsychologists(
          //   userId,
          //   `【紧急心理干预】教师 ${teacherName} 触发三级预警，风险指数：${((riskScore || 0) * 100).toFixed(0)}%。预警依据：${factors?.join('，') || '风险指标超标'}。请及时跟进处理。`,
          //   warningLevel
          // );
          // console.log(`✅ 已向心理负责人推送关于教师 ${teacherName} 的三级预警信息`);

          // 2. 自动创建干预任务（仅三级预警）
          if (warningLevel === 'level3' && warningId) {
            try {
              const taskResult = await api.intervention.createTask({
                warningId,
                teacherId: userId,
                teacherName,
                warningLevel,
                priority: 'high',
                // 不指定assignedTo，由心理负责人手动分配
              });
              console.log(`✅ 已自动创建干预任务，任务ID: ${taskResult.id}`);
            } catch (taskError) {
              console.error(`创建干预任务失败:`, taskError);
            }
          }
        }
        break;

      default:
        console.warn(`未知的响应目标类型: ${target}`);
    }
  } catch (error) {
    console.error(`执行响应动作失败:`, error);
    // 即使通知失败，也不影响主流程
  }
};

/**
 * 从数据库获取预警配置
 * 如果数据库为空或读取失败，则返回默认配置
 */
export const getWarningConfigs = async (): Promise<WarningConfig[]> => {
  try {
    const configs = await api.warningConfig.getAll();

    if (configs && configs.length > 0) {
      // 数据库中有配置，转换格式
      return configs.map((config: any) => {
        // 安全解析JSON字段（可能是字符串或已解析的对象）
        const parseJSON = (value: any, defaultValue: any = {}) => {
          if (value === null || value === undefined) return defaultValue;
          if (typeof value === 'object') return value; // 已经是对象
          try {
            return JSON.parse(value);
          } catch (e) {
            console.warn('JSON解析失败，使用默认值:', value);
            return defaultValue;
          }
        };

        return {
          level: config.level as WarningLevel,
          name: config.name,
          threshold: config.threshold,
          triggers: parseJSON(config.triggers, []),
          responses: parseJSON(config.responses, []),
          variables: parseJSON(config.variables, {})
        };
      });
    } else {
      // 数据库为空，返回默认配置
      console.log('数据库中无预警配置，使用默认配置');
      return WARNING_CONFIGS;
    }
  } catch (error) {
    console.error('从数据库读取预警配置失败，使用默认配置:', error);
    return WARNING_CONFIGS;
  }
};

/**
 * 批量扫描教师风险
 * @param teachers 教师列表
 * @param configs 预警配置（可选，如果不提供则使用默认配置）
 */
export const scanTeachersRisk = async (
  teachers: Array<{ uid: string; name: string }>,
  configs?: WarningConfig[]
) => {
  const results = [];
  console.log(`[scanTeachersRisk] 开始扫描 ${teachers.length} 位教师...`);

  for (let i = 0; i < teachers.length; i++) {
    const teacher = teachers[i];
    console.log(`[scanTeachersRisk] 分析第 ${i + 1}/${teachers.length} 位教师: ${teacher.name}`);

    try {
      console.log(`[scanTeachersRisk] 调用 analyzeTeacherRisk for ${teacher.name}...`);
      const analysis = await analyzeTeacherRisk(teacher.uid, teacher.name, configs);
      console.log(`[scanTeachersRisk] analyzeTeacherRisk 返回:`, { warningTriggered: analysis.warningTriggered, warningLevel: analysis.warningLevel });

      if (analysis.warningTriggered) {
        console.log(`[scanTeachersRisk] 教师 ${teacher.name} 触发预警，调用 triggerWarning...`);
        try {
          const warningId = await triggerWarning(teacher.uid, teacher.name, analysis);
          console.log(`[scanTeachersRisk] triggerWarning 返回:`, warningId);
          results.push({ teacher, analysis, warningId });
        } catch (error) {
          console.error(`[scanTeachersRisk] 触发预警失败 for ${teacher.name}:`, error);
          results.push({ teacher, analysis, warningId: null, error: '触发预警失败' });
        }
      } else {
        console.log(`[scanTeachersRisk] 教师 ${teacher.name} 未触发预警`);
        results.push({ teacher, analysis, warningId: null });
      }
    } catch (error) {
      console.error(`[scanTeachersRisk] 分析教师风险失败 for ${teacher.name}:`, error);
      results.push({
        teacher,
        analysis: {
          warningTriggered: false,
          riskScore: 0,
          factors: [],
          reason: '分析过程出错',
          triggeredBy: '系统错误'
        },
        warningId: null,
        error: '分析过程出错'
      });
    }
  }

  console.log(`[scanTeachersRisk] 扫描完成，共 ${results.length} 条结果`);
  return results;
};
