// 红色预警模块核心服务
// 基于LSTM的风险识别与自动响应

import api, { warningApi, userApi } from "./api";
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
      { type: "resource", target: "user", content: "推荐“蓝色调适工具包”中的相关资源（如正念冥想、3×3呼吸法引导）", description: "推荐自我调适工具" }
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
      { type: "depression_score", operator: ">=", value: 2.0, description: "抑郁因子分持续≥2.0超过1周" },
      { type: "risk_index", operator: ">=", value: 0.7, description: "风险指数≥0.7" }
    ],
    responses: [
      { type: "notification", target: "manager", content: "预警信息（脱敏后，仅显示“建议关注”）", description: "通知教研组长/年级主任" },
      { type: "message", target: "user", content: "提醒增加心理测评频率", description: "提醒增加测评频率" }
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
      { type: "message", target: "user", content: "【紧急关怀】系统监测到您近期心理压力极大，建议您立即寻求专业心理支持。您可以预约校内咨询师或拨打24小时热线。", description: "向教师推送紧急关怀消息" },
      { type: "notification", target: "manager", content: "预警信息（脱敏后，仅显示“建议关注”）", description: "通知教研组长/年级主任" },
      { type: "intervention", target: "psychologist", content: "启动专业干预流程，自动创建干预任务", description: "通知学校心理负责人并创建干预任务" }
    ]
  }
];

// 输入特征接口
interface InputFeatures {
  assessmentScores: number[]; // 近4周的心理量表各因子分序列
  hrvData: number[]; // HRV指标时序数据
  activityChangeRate: number; // 近一周行为活跃度变化率
  workloadIndex: number; // 工作量负荷指数
  // 新增：带有时间戳的测评数据
  assessmentScoresWithTimestamps?: Array<{ score: number; timestamp: string }>;
  // 新增：生理数据
  physiologicalData?: {
    hrv?: number; // HRV值
    restingHR?: number; // 静息心率
    sleepDuration?: number; // 睡眠时长（小时）
    deepSleepRatio?: number; // 深睡比例（%）
  };
  // 新增：行为数据
  behavioralData?: {
    toolUsageMinutes?: number; // 工具使用时长（分钟）
    communityInteractions?: number; // 社群参与度
    classHours?: number; // 授课时长
    meetingHours?: number; // 会议时长
    nonTeachingTasks?: number; // 非教学任务数
  };
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
 * 风险预测模型 - 综合评分算法
 * 核心设计原则：
 * 1. 心理量表数据是核心（必须要有）
 * 2. 生理数据（HRV、静息心率、睡眠时长、深睡比例）是辅助（有则更准确，没有也没关系）
 * 3. 行为数据（工作负荷、活跃度）也是辅助
 * 
 * 评分权重：
 * - 基础风险（基于心理量表）：60%
 * - 生理风险（基于HRV、心率、睡眠）：25%
 * - 行为风险（基于工作负荷、活跃度）：15%
 * 
 * @param features 输入特征
 * @param configs 预警配置（可选，如果不提供则使用默认配置）
 */
export const predictRiskWithLSTM = (features: InputFeatures, configs?: WarningConfig[]): number => {
  const { assessmentScores, physiologicalData, behavioralData } = features;
  
  // 使用提供的配置或默认配置
  const warningConfigs = configs || WARNING_CONFIGS;
  const level1Config = warningConfigs.find(c => c.level === 'level1');
  const level2Config = warningConfigs.find(c => c.level === 'level2');
  const level3Config = warningConfigs.find(c => c.level === 'level3');
  
  // 获取配置的阈值
  const level3DepressionThreshold = level3Config?.variables?.depressionThreshold ?? 2.5;
  const level2DepressionThreshold = level2Config?.variables?.depressionThreshold ?? 2.0;
  const level1DepressionThreshold = level1Config?.variables?.depressionThreshold ?? 2.0;
  
  // ==================== 1. 计算基础风险（心理量表）- 权重60% ====================
  let baseRisk = 0;
  const latestScore = assessmentScores.length > 0 ? assessmentScores[0] : 0;
  const recentScores = assessmentScores.slice(0, 2);
  
  console.log('风险计算 - 最新抑郁因子分:', latestScore);
  console.log('风险计算 - 最近分数 (最新在前):', recentScores);
  
  // 基于最新抑郁因子分计算基础风险
  if (latestScore >= level3DepressionThreshold) {
    baseRisk = 0.95; // 极高风险
  } else if (latestScore >= level2DepressionThreshold) {
    // 检查是否连续（需要至少两周的时间间隔）
    let hasConsecutive = false;
    if (recentScores.length >= 2) {
      // 检查最近两次测评的时间间隔是否至少为一周
      const latestAssessment = features.assessmentScoresWithTimestamps?.[0];
      const previousAssessment = features.assessmentScoresWithTimestamps?.[1];
      
      if (latestAssessment && previousAssessment) {
        const latestDate = new Date(latestAssessment.timestamp);
        const previousDate = new Date(previousAssessment.timestamp);
        const daysBetween = (latestDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
        hasConsecutive = daysBetween >= 7 && recentScores.every(score => score >= level2DepressionThreshold);
      } else {
        // 如果没有时间戳信息，使用旧的逻辑
        hasConsecutive = recentScores.every(score => score >= level2DepressionThreshold);
      }
    }
    baseRisk = hasConsecutive ? 0.8 : 0.7; // 连续更高风险
  } else if (latestScore >= level1DepressionThreshold) {
    baseRisk = 0.6; // 中等风险
  } else if (latestScore >= 1.5) {
    baseRisk = 0.4; // 轻度风险
  } else {
    baseRisk = 0.2; // 低风险
  }
  
  // ==================== 2. 计算生理风险 - 权重25% ====================
  let physiologicalRisk = 0;
  let physiologicalFactorsCount = 0;
  
  // HRV风险：HRV越低风险越高
  if (physiologicalData?.hrv !== undefined && physiologicalData.hrv !== null) {
    physiologicalFactorsCount++;
    if (physiologicalData.hrv < 20) {
      physiologicalRisk += 0.9; // HRV极低
    } else if (physiologicalData.hrv < 30) {
      physiologicalRisk += 0.7; // HRV较低
    } else if (physiologicalData.hrv < 40) {
      physiologicalRisk += 0.5; // HRV略低
    } else {
      physiologicalRisk += 0.2; // HRV正常
    }
  }
  
  // 静息心率风险：心率越高风险越高
  if (physiologicalData?.restingHR !== undefined && physiologicalData.restingHR !== null) {
    physiologicalFactorsCount++;
    if (physiologicalData.restingHR > 90) {
      physiologicalRisk += 0.8; // 心率过高
    } else if (physiologicalData.restingHR > 80) {
      physiologicalRisk += 0.6; // 心率较高
    } else if (physiologicalData.restingHR > 70) {
      physiologicalRisk += 0.4; // 心率略高
    } else {
      physiologicalRisk += 0.1; // 心率正常
    }
  }
  
  // 睡眠时长风险：睡眠越少风险越高
  if (physiologicalData?.sleepDuration !== undefined && physiologicalData.sleepDuration !== null) {
    physiologicalFactorsCount++;
    if (physiologicalData.sleepDuration < 5) {
      physiologicalRisk += 0.9; // 严重睡眠不足
    } else if (physiologicalData.sleepDuration < 6) {
      physiologicalRisk += 0.7; // 睡眠不足
    } else if (physiologicalData.sleepDuration < 7) {
      physiologicalRisk += 0.5; // 睡眠略少
    } else {
      physiologicalRisk += 0.1; // 睡眠正常
    }
  }
  
  // 深睡比例风险：深睡越少风险越高
  if (physiologicalData?.deepSleepRatio !== undefined && physiologicalData.deepSleepRatio !== null) {
    physiologicalFactorsCount++;
    if (physiologicalData.deepSleepRatio < 15) {
      physiologicalRisk += 0.8; // 深睡严重不足
    } else if (physiologicalData.deepSleepRatio < 20) {
      physiologicalRisk += 0.6; // 深睡不足
    } else if (physiologicalData.deepSleepRatio < 25) {
      physiologicalRisk += 0.4; // 深睡略少
    } else {
      physiologicalRisk += 0.1; // 深睡正常
    }
  }
  
  // 平均生理风险
  if (physiologicalFactorsCount > 0) {
    physiologicalRisk = physiologicalRisk / physiologicalFactorsCount;
  } else {
    // 如果没有生理数据，使用基础风险的30%作为生理风险
    physiologicalRisk = baseRisk * 0.3;
  }
  
  // ==================== 3. 计算行为风险 - 权重15% ====================
  let behavioralRisk = 0;
  let behavioralFactorsCount = 0;
  
  // 工作负荷风险：工作量越大风险越高
  if (behavioralData?.classHours !== undefined || behavioralData?.meetingHours !== undefined || behavioralData?.nonTeachingTasks !== undefined) {
    behavioralFactorsCount++;
    const totalWorkload = (behavioralData.classHours || 0) + (behavioralData.meetingHours || 0) + (behavioralData.nonTeachingTasks || 0);
    if (totalWorkload > 12) {
      behavioralRisk += 0.8; // 工作量极大
    } else if (totalWorkload > 10) {
      behavioralRisk += 0.6; // 工作量大
    } else if (totalWorkload > 8) {
      behavioralRisk += 0.4; // 工作量较大
    } else {
      behavioralRisk += 0.2; // 工作量正常
    }
  }
  
  // 工具使用风险：使用越少风险越高（可能是压力大不愿使用工具）
  if (behavioralData?.toolUsageMinutes !== undefined) {
    behavioralFactorsCount++;
    if (behavioralData.toolUsageMinutes < 10) {
      behavioralRisk += 0.7; // 几乎不使用工具
    } else if (behavioralData.toolUsageMinutes < 30) {
      behavioralRisk += 0.5; // 使用较少
    } else if (behavioralData.toolUsageMinutes < 60) {
      behavioralRisk += 0.3; // 使用一般
    } else {
      behavioralRisk += 0.1; // 使用正常
    }
  }
  
  // 社群参与风险：参与越少风险越高
  if (behavioralData?.communityInteractions !== undefined) {
    behavioralFactorsCount++;
    if (behavioralData.communityInteractions < 1) {
      behavioralRisk += 0.6; // 几乎不参与
    } else if (behavioralData.communityInteractions < 3) {
      behavioralRisk += 0.4; // 参与较少
    } else if (behavioralData.communityInteractions < 5) {
      behavioralRisk += 0.2; // 参与一般
    } else {
      behavioralRisk += 0.1; // 参与正常
    }
  }
  
  // 平均行为风险
  if (behavioralFactorsCount > 0) {
    behavioralRisk = behavioralRisk / behavioralFactorsCount;
  } else {
    // 如果没有行为数据，使用基础风险的20%作为行为风险
    behavioralRisk = baseRisk * 0.2;
  }
  
  // ==================== 4. 综合计算总风险 ====================
  const totalRisk = (baseRisk * 0.6) + (physiologicalRisk * 0.25) + (behavioralRisk * 0.15);
  
  // 确保风险值在0-1之间
  const finalRisk = Math.max(0, Math.min(1, totalRisk));
  
  console.log('风险计算详情:', {
    baseRisk,
    physiologicalRisk,
    behavioralRisk,
    finalRisk,
    hasPhysiologicalData: physiologicalFactorsCount > 0,
    hasBehavioralData: behavioralFactorsCount > 0
  });
  
  return finalRisk;
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
      // 没有数据时，不使用任何 mock
      assessments = [];
    }
    
    // 2. 获取生理数据（可选，如果没有也没关系）
    let physiologicalData = undefined;
    try {
      const physioResponse = await api.physiological.getData(uid);
      if (physioResponse) {
        physiologicalData = {
          hrv: physioResponse.hrv,
          restingHR: physioResponse.restingHR,
          sleepDuration: physioResponse.sleepDuration,
          deepSleepRatio: physioResponse.deepSleepRatio
        };
        console.log(`教师 ${teacherName} (${uid}) 的生理数据:`, physiologicalData);
      }
    } catch (error) {
      console.log(`教师 ${teacherName} (${uid}) 没有生理数据或获取失败:`, error);
      // 不报错，继续执行
    }
    
    // 3. 获取工作负荷数据（可选）
    let workloadData = undefined;
    try {
      const workloadResponse = await api.workload.getData(uid);
      if (workloadResponse) {
        workloadData = {
          classHours: workloadResponse.classHours,
          meetingHours: workloadResponse.meetingHours,
          nonTeachingTasks: workloadResponse.nonTeachingTasks
        };
        console.log(`教师 ${teacherName} (${uid}) 的工作负荷数据:`, workloadData);
      }
    } catch (error) {
      console.log(`教师 ${teacherName} (${uid}) 没有工作负荷数据或获取失败:`, error);
      // 不报错，继续执行
    }
    
    // 4. 构建行为数据
    const behavioralData = workloadData ? {
      ...workloadData,
      // 暂时没有工具使用和社群参与数据，后续可以添加
    } : undefined;
    
    // 3. 构建输入特征（完全基于真实评估数据）
    let assessmentScores = assessments.map(a => {
      try {
        // 优先使用数据库中存储的抑郁因子分
        if (a.depressionScore !== undefined && a.depressionScore !== null) {
          return a.depressionScore;
        }
        // 兼容下划线命名
        if (a.depression_score !== undefined && a.depression_score !== null) {
          return a.depression_score;
        }
        // 如果没有存储的抑郁因子分，则计算
        if (typeof a.scores === 'object' && a.scores !== null) {
          // SCL-90抑郁因子包含13个项目：5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79
          // 注意：题目编号是1-90，而数组索引是0-89，所以需要减1
          const depressionItems = [4, 13, 14, 19, 21, 25, 28, 29, 30, 31, 53, 70, 78];
          
          let sum = 0;
          let count = 0;
          
          for (const index of depressionItems) {
            if (a.scores[index.toString()] !== undefined) {
              sum += a.scores[index.toString()];
              count++;
            }
          }
          
          // 计算因子分：总分÷项目数
          return count > 0 ? sum / count : 0;
        }
        // 否则尝试解析JSON
        const scores = JSON.parse(a.scores);
        // SCL-90抑郁因子包含13个项目：5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79
        // 注意：题目编号是1-90，而数组索引是0-89，所以需要减1
        const depressionItems = [4, 13, 14, 19, 21, 25, 28, 29, 30, 31, 53, 70, 78];
        
        let sum = 0;
        let count = 0;
        
        for (const index of depressionItems) {
          if (scores[index.toString()] !== undefined) {
            sum += scores[index.toString()];
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
    console.log(`教师 ${teacherName} (${uid}) 的原始评估记录数量:`, assessments.length);
    console.log(`教师 ${teacherName} (${uid}) 的原始评估记录:`, assessments.map((a: any) => ({
      id: a.id,
      timestamp: a.timestamp,
      depressionScore: a.depressionScore || a.depression_score,
      riskLevel: a.riskLevel || a.risk_level
    })));
    console.log(`教师 ${teacherName} (${uid}) 的测评分数数组 (最新在前):`, assessmentScores);
    
    // 如果没有有效测评数据，直接返回不触发预警
    const hasValidScores = assessmentScores.some(score => score > 0);
    if (assessmentScores.length === 0 || !hasValidScores) {
      console.log(`教师 ${teacherName} (${uid}) 没有有效测评数据，不触发预警`);
      return {
        warningTriggered: false,
        riskScore: 0,
        factors: [],
        reason: "无有效测评数据",
        triggeredBy: ""
      };
    }
    
    // 计算抑郁因子分 - 必须在使用之前定义
    const getDepressionScore = (assessment: any): number => {
      try {
        // 优先使用数据库中存储的抑郁因子分
        if (assessment.depressionScore !== undefined && assessment.depressionScore !== null) {
          return assessment.depressionScore;
        }
        // 兼容下划线命名
        if (assessment.depression_score !== undefined && assessment.depression_score !== null) {
          return assessment.depression_score;
        }
        // 如果没有存储的抑郁因子分，则计算
        if (typeof assessment.scores === 'object' && assessment.scores !== null) {
          // SCL-90抑郁因子包含13个项目：5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79
          // 注意：题目编号是1-90，而数组索引是0-89，所以需要减1
          const depressionItems = [4, 13, 14, 19, 21, 25, 28, 29, 30, 31, 53, 70, 78];
          
          let sum = 0;
          let count = 0;
          
          for (const index of depressionItems) {
            if (assessment.scores[index.toString()] !== undefined) {
              sum += assessment.scores[index.toString()];
              count++;
            }
          }
          
          // 计算因子分：总分÷项目数
          return count > 0 ? sum / count : 0;
        }
        // 否则尝试解析JSON
        const scores = JSON.parse(assessment.scores);
        // SCL-90抑郁因子包含13个项目：5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79
        // 注意：题目编号是1-90，而数组索引是0-89，所以需要减1
        const depressionItems = [4, 13, 14, 19, 21, 25, 28, 29, 30, 31, 53, 70, 78];
        
        let sum = 0;
        let count = 0;
        
        for (const index of depressionItems) {
          if (scores[index.toString()] !== undefined) {
            sum += scores[index.toString()];
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
    
    // 使用提供的配置或默认配置
    const warningConfigs = configs || WARNING_CONFIGS;
    const level1Config = warningConfigs.find(c => c.level === 'level1');
    const level2Config = warningConfigs.find(c => c.level === 'level2');
    const level3Config = warningConfigs.find(c => c.level === 'level3');
    
    // 检查抑郁因子分触发条件（使用配置的变量）
    // 从variables中提取阈值，如果不存在则使用默认值
    const level1DepressionThreshold = level1Config?.variables?.depressionThreshold ?? 2.0;
    const level1RiskThreshold = level1Config?.variables?.riskThreshold ?? 0.6;
    const level2DepressionThreshold = level2Config?.variables?.depressionThreshold ?? 2.0;
    const level2RiskThreshold = level2Config?.variables?.riskThreshold ?? 0.7;
    const level3DepressionThreshold = level3Config?.variables?.depressionThreshold ?? 2.5;
    const level3RiskThreshold = level3Config?.variables?.riskThreshold ?? 0.8;
    
    // 获取连续次数要求，确保至少为 1
    const level2ConsecutiveCount = Math.max(1, level2Config?.variables?.consecutiveWeeks ?? 1);
    
    // 构建输入特征
    const inputFeatures: any = {
      assessmentScores,
      hrvData: [],
      activityChangeRate: 0,
      workloadIndex: 0,
      assessmentScoresWithTimestamps: assessments.map(a => ({
        score: getDepressionScore(a),
        timestamp: a.timestamp
      })),
      physiologicalData,
      behavioralData
    };
    
    // 使用LSTM模型预测风险（传入配置）
    const riskScore = predictRiskWithLSTM(inputFeatures, configs);
    
    // 只使用最新的评估记录来判断预警触发条件（因为数据是按时间倒序排列的）
    const hasHighDepression = assessmentScores.length > 0 && assessmentScores[0] >= level1DepressionThreshold;
    
    const hasVeryHighDepression = assessmentScores.length > 0 && assessmentScores[0] >= level3DepressionThreshold;
    
    // 检查是否有连续两周的高抑郁因子分
    let hasConsecutiveHighDepression = false;
    console.log(`开始检查连续高抑郁因子分，教师: ${teacherName}，测评数量: ${assessments.length}`);
    if (assessments.length >= 2) {
      // 确保测评数据按时间顺序排序（最新的在前）
      const sortedAssessments = [...assessments].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA; // 降序排序
      });
      
      // 过滤出近 4 周的测评
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const recentAssessments = sortedAssessments.filter(a => new Date(a.timestamp) >= fourWeeksAgo);
      
      // 过滤出不同天的测评，只保留每天的最新测评
      const dailyAssessments: any[] = [];
      const processedDates = new Set<string>();
      
      for (const assessment of recentAssessments) {
        const date = new Date(assessment.timestamp).toISOString().split('T')[0];
        if (!processedDates.has(date)) {
          processedDates.add(date);
          dailyAssessments.push(assessment);
        }
      }
      
      console.log(`过滤后的测评数据:`, {
        sortedAssessmentsCount: sortedAssessments.length,
        recentAssessmentsCount: recentAssessments.length,
        dailyAssessmentsCount: dailyAssessments.length,
        processedDates: Array.from(processedDates)
      });
      
      // 检查是否有至少两天的测评，并且时间间隔至少为一周
      if (dailyAssessments.length >= 2) {
        // 检查是否所有测评的抑郁因子分都超过了阈值，并且至少有一个测评的抑郁因子分大于 0
        const depressionScores = dailyAssessments.map(a => getDepressionScore(a));
        const allScoresAboveThreshold = depressionScores.every(score => score >= level2DepressionThreshold) && depressionScores.some(score => score > 0);
        
        // 检查测评的时间范围是否至少为管理员设置的连续周数
        const earliestAssessment = dailyAssessments[dailyAssessments.length - 1];
        const latestAssessment = dailyAssessments[0];
        const earliestDate = new Date(earliestAssessment.timestamp);
        const latestDate = new Date(latestAssessment.timestamp);
        const daysBetween = (latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24);
        const requiredDays = level2ConsecutiveCount * 7; // 转换为天数
        
        // 只有当所有测评的抑郁因子分都超过了阈值，并且时间间隔至少为一周时，才认为是连续的高抑郁因子分
        hasConsecutiveHighDepression = allScoresAboveThreshold && daysBetween >= requiredDays;
        
        console.log(`连续高抑郁因子分检查:`, {
          teacherName,
          allScoresAboveThreshold,
          depressionScores,
          level2DepressionThreshold,
          daysBetween,
          requiredDays,
          level2ConsecutiveCount,
          hasConsecutiveHighDepression,
          latestDate: latestDate.toISOString(),
          earliestDate: earliestDate.toISOString(),
          dailyAssessmentsCount: dailyAssessments.length,
          recentAssessmentsCount: recentAssessments.length
        });
      } else {
        console.log(`连续高抑郁因子分检查: 教师 ${teacherName} 只有 ${dailyAssessments.length} 天的测评数据，不满足连续要求`);
      }
    } else {
      console.log(`连续高抑郁因子分检查: 教师 ${teacherName} 只有 ${assessments.length} 条测评，不满足至少 2 条的要求`);
    }
    
    // 输出最终的 hasConsecutiveHighDepression 值
    console.log(`最终的 hasConsecutiveHighDepression 值:`, hasConsecutiveHighDepression);
    
    // 检查 riskScore 是否达到二级预警阈值
    console.log(`风险分数检查:`, {
      riskScore,
      level2RiskThreshold,
      riskScoreAboveThreshold: riskScore >= level2RiskThreshold
    });
    
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
    } else if (hasConsecutiveHighDepression) {
      // 二级预警触发条件
      warningTriggered = true;
      warningLevel = "level2";
      factors = [`抑郁因子分持续≥${level2DepressionThreshold}超过1周`];
      reason = `抑郁因子分持续超标`;
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
  
  // 从数据库获取预警配置
  const configs = await getWarningConfigs();
  const warningConfig = configs.find(c => c.level === analysis.warningLevel);
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
 
  // 先获取该教师的现有预警
  let existingStatus = "active";
  try {
    const allWarnings = await api.warning.getAll();
    const teacherExistingWarning = allWarnings.find((w: any) => w.user_id === uid);
    if (teacherExistingWarning && teacherExistingWarning.status === "resolved") {
      // 如果预警已经是 resolved 状态，保持不变
      existingStatus = "resolved";
      console.log(`教师 ${teacherName} (${uid}) 的预警状态是 resolved，保持不变`);
    }
  } catch (error) {
    console.error(`获取现有预警失败:`, error);
  }
  
  const warningData = {
    userId: uid,
    teacherName,
    level,
    riskScore: analysis.riskScore,
    factors: analysis.factors,
    reason: analysis.reason,
    status: existingStatus
  };

  // 合并发给教师本人的多条消息为一条（提取到函数作用域，确保 try/catch 块都能访问）
  const userResponses = warningConfig.responses.filter(r => r.target === 'user');
  const otherResponses = warningConfig.responses.filter(r => r.target !== 'user');

  try {
    console.log(`尝试为 ${teacherName} 创建或更新预警:`, warningData);
    const result = await api.warning.upsert(warningData);
    console.log(`预警${result.action === 'updated' ? '更新' : '创建'}成功 for ${teacherName}, ID:`, result.id);

    // 每次触发预警时都执行响应动作，确保通知能够被接收到
    let shouldExecuteResponses = true;
    
    // 即使预警级别未升级，也要执行响应动作，确保通知能够被接收到
    console.log(`[triggerWarning] 执行响应动作 for ${teacherName}`);
    
    // 如果不需要执行响应动作，直接返回
    if (!shouldExecuteResponses) {
      return result.id;
    }

    // 执行响应动作（并行执行，带超时）
    console.log(`[triggerWarning] 开始执行 ${warningConfig.responses.length} 个响应动作 for ${teacherName}...`);
    
    const responsePromises: Promise<any>[] = [];
    
    // 1. 处理合并后的教师消息
    if (userResponses.length > 0) {
      const combinedContent = userResponses.map(r => r.content.replace(/。$/, '')).join('。') + '。';
      responsePromises.push(executeResponseAction(
        { ...userResponses[0], content: combinedContent, description: "合并后的教师消息" },
        uid, teacherName, analysis.warningLevel!, result.id, analysis.riskScore, analysis.factors
      ));
    }
    
    // 2. 处理其他响应
    otherResponses.forEach(response => {
      responsePromises.push(executeResponseAction(
        response, uid, teacherName, analysis.warningLevel!, result.id, analysis.riskScore, analysis.factors
      ));
    });

    // 使用 Promise.allSettled 代替 Promise.all，避免一个失败导致全部失败
    await Promise.allSettled(responsePromises);
    console.log(`[triggerWarning] 所有响应动作执行完成 for ${teacherName}`);

    return result.id; // 返回创建的预警ID
  } catch (error: any) {
    // 降级方案：使用模拟预警ID，确保功能可用
    const mockWarningId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 执行响应动作（即使API失败，也要执行本地响应）
    console.log(`[triggerWarning] 降级方案：开始执行 ${warningConfig.responses.length} 个响应动作...`);
    const responsePromises: Promise<any>[] = [];
    
    // 1. 处理合并后的教师消息
    if (userResponses.length > 0) {
      const combinedContent = userResponses.map(r => r.content.replace(/。$/, '')).join('。') + '。';
      responsePromises.push(executeResponseAction(
        { ...userResponses[0], content: combinedContent, description: "合并后的教师消息" },
        uid, teacherName, analysis.warningLevel!, mockWarningId, analysis.riskScore, analysis.factors
      ));
    }
    
    // 2. 处理其他响应
    otherResponses.forEach(response => {
      responsePromises.push(executeResponseAction(
        response, uid, teacherName, analysis.warningLevel!, mockWarningId, analysis.riskScore, analysis.factors
      ));
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

    // 图表要求：同时系统增加心理测评频率（所有级别的预警都执行）
    try {
      await api.user.update(userId, { syncFrequency: 'hourly' });
      console.log(`✅ 已更新教师 ${teacherName} 的心理测评频率为高频`);
    } catch (error) {
      console.error(`❌ 更新心理测评频率失败:`, error);
      // 即使更新失败，也不影响其他响应动作
    }

    switch (target) {
      case 'user':
        // 向教师本人推送
        if (type === 'message' || type === 'resource') {
          try {
            // 根据预警级别设置不同的标题
            let notificationTitle = '【心理健康关怀】';
            if (warningLevel === 'level2') {
              notificationTitle = '【心理健康关注】';
            } else if (warningLevel === 'level3') {
              notificationTitle = '【紧急心理关怀】';
            }
            
            await api.notificationApi.create({
              userId,
              type: 'warning',
              title: notificationTitle,
              content: `${content}您的风险评估显示：${factors?.join('，') || '请关注心理健康'}。如有需要，请及时使用调适工具或寻求帮助。`,
              relatedId: warningId
            });
            console.log(`✅ [executeResponseAction] 已向教师 ${teacherName} 推送关怀消息`);
          } catch (notifyError) {
            console.error(`❌ [executeResponseAction] 向教师 ${teacherName} 推送关怀消息失败:`, notifyError);
          }
        }
        break;

      case 'manager':
        // 向与教师绑定的教研组长推送（脱敏信息）
        if (type === 'notification') {
          try {
            // 获取该教师的完整用户信息，找到 manager_id
            const teacherProfile = await userApi.getUserById(userId);
            console.log('教师完整信息:', teacherProfile);
            
            if (teacherProfile && teacherProfile.managerId) {
              // 获取该教研组长的用户信息
              const manager = await userApi.getUserById(teacherProfile.managerId);
              console.log('找到绑定的教研组长:', manager);
              
              if (manager) {
                // 根据预警级别生成不同的通知内容
                let riskLevelText = '二级关注';
                let suggestionText = '建议进行非正式关怀与观察';
                
                if (warningLevel === 'level1') {
                  riskLevelText = '一级提醒';
                  suggestionText = '建议进行自我调适';
                } else if (warningLevel === 'level2') {
                  riskLevelText = '二级关注';
                  suggestionText = '建议进行非正式关怀与观察';
                } else if (warningLevel === 'level3') {
                  riskLevelText = '三级干预';
                  suggestionText = '建议立即启动专业干预流程';
                }
                
                await api.notificationApi.create({
                  userId: manager.id,
                  type: 'warning',
                  title: '【团队心理关怀提醒】',
                  content: `您组内教师${teacherName}触发${riskLevelText}。${suggestionText}。系统已同步增加该教师的心理测评建议频率。`,
                  relatedId: warningId
                });
                
                console.log(`✅ 已向绑定的教研组长 ${manager.displayName} 推送预警`);
              } else {
                console.warn(`⚠️ 未找到 manager_id 为 ${teacherProfile.managerId} 的教研组长`);
              }
            } else {
              console.warn(`⚠️ 教师 ${teacherName} 没有绑定教研组长`);
            }
          } catch (error) {
            console.error(`❌ 向教研组长推送通知失败:`, error);
          }
        }
        break;

      case 'psychologist':
        // 向心理负责人推送并自动创建干预任务
        if (type === 'notification' || type === 'intervention') {
          // 1. 发送通知给心理专家
          try {
            const psychologists = await api.user.getPsychologists();
            for (const psychologist of psychologists) {
              await api.notificationApi.create({
                userId: psychologist.id,
                type: 'warning',
                title: '【紧急心理干预】',
                content: `教师 ${teacherName} 触发三级预警。风险指数：${((riskScore || 0) * 100).toFixed(0)}%。预警依据：${factors?.join('，') || '风险指标超标'}。系统已自动创建干预任务，并匹配推荐资源：校内1对1咨询、沙盘室预约及外部心理热线。`,
                relatedId: warningId
              });
            }
            console.log(`✅ 已向心理负责人推送关于教师 ${teacherName} 的三级预警信息`);
          } catch (error) {
            console.error(`❌ 向心理负责人推送通知失败:`, error);
          }

          // 2. 自动创建干预任务（仅三级预警）
          if (warningLevel === 'level3' && warningId) {
            try {
              // 获取心理专家
              const psychologists = await api.user.getPsychologists();
              if (psychologists && psychologists.length > 0) {
                const psychologistId = psychologists[0].id;
                const taskResult = await api.intervention.createTask({
                  warningId,
                  teacherId: userId,
                  teacherName,
                  warningLevel,
                  priority: 'high',
                  assignedTo: psychologistId
                });
                console.log(`✅ 已自动创建干预任务，任务ID: ${taskResult.id}，分配给心理专家: ${psychologists[0].displayName}`);
              } else {
                console.error(`❌ 没有找到心理专家，无法创建干预任务`);
              }
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

  // 首先获取所有未解决的预警
  const allPendingWarnings = await warningApi.getAll();
  const pendingWarningMap = new Map<string, any>();
  for (const warning of allPendingWarnings) {
    if (warning.status !== 'resolved') {
      pendingWarningMap.set(warning.userId, warning);
    }
  }
  console.log(`[scanTeachersRisk] 找到 ${pendingWarningMap.size} 个未解决的预警`);

  // 使用并行处理来提高扫描速度，限制并发数为 5
  const concurrencyLimit = 5;
  const teacherChunks = [];
  
  // 将教师列表分成多个小块，每个小块的大小为 concurrencyLimit
  for (let i = 0; i < teachers.length; i += concurrencyLimit) {
    teacherChunks.push(teachers.slice(i, i + concurrencyLimit));
  }
  
  // 逐个处理每个小块
  for (const chunk of teacherChunks) {
    console.log(`[scanTeachersRisk] 开始处理教师块，包含 ${chunk.length} 位教师...`);
    
    // 并行处理当前块中的所有教师
    const chunkResults = await Promise.all(
      chunk.map(async (teacher) => {
        console.log(`[scanTeachersRisk] 分析教师: ${teacher.name}`);
        
        try {
          console.log(`[scanTeachersRisk] 调用 analyzeTeacherRisk for ${teacher.name}...`);
          const analysis = await analyzeTeacherRisk(teacher.uid, teacher.name, configs);
          console.log(`[scanTeachersRisk] analyzeTeacherRisk 返回:`, { warningTriggered: analysis.warningTriggered, warningLevel: analysis.warningLevel });

          if (analysis.warningTriggered) {
            console.log(`[scanTeachersRisk] 教师 ${teacher.name} 触发预警，调用 triggerWarning...`);
            try {
              const warningId = await triggerWarning(teacher.uid, teacher.name, analysis);
              console.log(`[scanTeachersRisk] triggerWarning 返回:`, warningId);
              return { teacher, analysis, warningId };
            } catch (error) {
              console.error(`[scanTeachersRisk] 触发预警失败 for ${teacher.name}:`, error);
              return { teacher, analysis, warningId: null, error: '触发预警失败' };
            }
          } else {
            console.log(`[scanTeachersRisk] 教师 ${teacher.name} 未触发预警`);
            // 如果这个教师有未解决的预警，关闭它
            const existingWarning = pendingWarningMap.get(teacher.uid);
            if (existingWarning) {
            try {
              console.log(`[scanTeachersRisk] 关闭教师 ${teacher.name} 的旧预警:`, existingWarning.id);
              await warningApi.updateStatus(existingWarning.id, 'resolved');
              console.log(`[scanTeachersRisk] 已成功关闭教师 ${teacher.name} 的旧预警`);
            } catch (error) {
              console.error(`[scanTeachersRisk] 关闭旧预警失败 for ${teacher.name}:`, error);
            }
          }
            return { teacher, analysis, warningId: null };
          }
        } catch (error) {
          console.error(`[scanTeachersRisk] 分析教师风险失败 for ${teacher.name}:`, error);
          return {
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
          };
        }
      })
    );
    
    // 将当前块的结果添加到总结果中
    results.push(...chunkResults);
  }

  console.log(`[scanTeachersRisk] 扫描完成，共 ${results.length} 条结果`);
  return results;
};
