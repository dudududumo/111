import api from "./api";

export interface RiskAnalysisResult {
  warningTriggered: boolean;
  warningLevel?: "level1" | "level2" | "level3";
  riskScore: number;
  factors: string[];
  reason: string;
}

/**
 * Simulated LSTM-based Risk Engine
 * In a real production environment, this would call a backend ML service.
 * Here we implement the logic as described by the user.
 */
export const analyzeTeacherRisk = async (uid: string, teacherName: string): Promise<RiskAnalysisResult> => {
  try {
    // 1. Fetch last 4 weeks of assessments
    const response = await api.assessment.getMyAssessments();
    const assessments = response.assessments || [];

    // 2. Mock Physiological & Behavioral Data (In real app, fetch from respective collections)
    // For simulation, we'll generate some data based on the UID to keep it consistent
    const seed = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const mockHRV = [60 + (seed % 10), 58 + (seed % 8), 55 + (seed % 12), 52 + (seed % 5)]; // Declining trend
    const mockWorkloadIndex = 75 + (seed % 20); // High workload
    const mockSupportIndex = 30 - (seed % 10); // Low support interactions

    const factors: string[] = [];
    let riskScore = 0.5; // Base risk

    // Trigger 1: Depression factor score >= 2.0 twice consecutively
    // Note: In our current schema, we might not have 'depressionFactor' explicitly in all assessments, 
    // but we can check the 'level' or simulate the factor score.
    let consecutiveHighDepression = false;
    if (assessments.length >= 2) {
      // Assuming 'scl90' or 'phq9' assessments have depression scores
      // For simulation, let's say if level is '中度抑郁' or '重度抑郁', it counts as high factor
      const highLevels = ["中度抑郁", "重度抑郁", "中度症状", "重度症状"];
      if (highLevels.includes(assessments[0].level) && highLevels.includes(assessments[1].level)) {
        consecutiveHighDepression = true;
        factors.push("抑郁因子分连续两次达到预警阈值 (≥2.0)");
        riskScore += 0.3;
      }
    }

    // Trigger 2: LSTM Model Prediction (Simulated)
    // Logic: If HRV is declining and workload is high, LSTM risk increases
    const hrvTrend = mockHRV[0] - mockHRV[mockHRV.length - 1]; // Negative means declining
    if (hrvTrend < -5) {
      factors.push("HRV (RMSSD) 呈现显著下降趋势，提示自主神经系统压力过大");
      riskScore += 0.2;
    }

    if (mockWorkloadIndex > 80) {
      factors.push(`工作负荷指数过高 (${mockWorkloadIndex})，超出常规承载范围`);
      riskScore += 0.15;
    }

    // Trigger 3: "High Load - Low Support" Pattern
    if (mockWorkloadIndex > 70 && mockSupportIndex < 25) {
      factors.push("识别到“高负荷-低支持”复合风险模式");
      riskScore += 0.2;
    }

    // Cap risk score at 1.0
    riskScore = Math.min(riskScore, 0.98);

    // Determine Warning Level
    let warningTriggered = false;
    let warningLevel: "level1" | "level2" | "level3" | undefined;

    if (riskScore > 0.9 || consecutiveHighDepression) {
      warningTriggered = true;
      warningLevel = "level3";
    } else if (riskScore > 0.8) {
      warningTriggered = true;
      warningLevel = "level2";
    } else if (riskScore > 0.75) {
      warningTriggered = true;
      warningLevel = "level1";
    }

    return {
      warningTriggered,
      warningLevel,
      riskScore,
      factors,
      reason: consecutiveHighDepression 
        ? "抑郁因子连续超标触发紧急预警" 
        : `LSTM 综合风险指数 (${(riskScore * 100).toFixed(0)}%) 超过阈值`
    };

  } catch (error) {
    console.error("Risk analysis error:", error);
    return {
      warningTriggered: false,
      riskScore: 0,
      factors: [],
      reason: "分析过程出错"
    };
  }
};

export const triggerWarning = async (uid: string, teacherName: string, analysis: RiskAnalysisResult) => {
  if (!analysis.warningTriggered || !analysis.warningLevel) return;

 const warningData = {
    userId: uid,
    teacherName,
    level: analysis.warningLevel || "level1",
    riskScore: analysis.riskScore,
    factors: analysis.factors,
    reason: analysis.reason,
    status: "pending"
  };

  await api.warning.create(warningData);

  // 4.1 Organizational Support: Auto-create intervention task for Level 3 (Emergency)
  if (analysis.warningLevel === "level3") {
    // 这里需要调用后端API创建干预任务
    console.log("创建紧急干预任务 for user:", uid);
  }
};
