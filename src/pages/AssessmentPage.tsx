import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  ClipboardCheck, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  ArrowLeft,
  Info,
  AlertCircle,
  Save,
  Zap,
  X,
  Bell,
  PauseCircle,
  Sparkles,
  Shield,
  TrendingUp,
  Calendar,
  BarChart3
} from "lucide-react";
import api from "../services/api";
import { SCALES, Scale, Question } from "../data/scales";
import ConsentModal from "../components/ConsentModal";
import WearableSync from "../components/WearableSync";
import PsychologicalProfile from "../components/PsychologicalProfile";
import { 
  initPushService, 
  saveAssessmentProgress, 
  getAssessmentProgress, 
  clearAssessmentProgress, 
  hasUnfinishedAssessment,
  getPushConfig,
  savePushConfig
} from "../services/pushService";

interface AssessmentPageProps {
  profile: UserProfile | null;
}

const AssessmentPage: React.FC<AssessmentPageProps> = ({ profile }) => {
  const [selectedScale, setSelectedScale] = useState<Scale | null>(null);
  const [step, setStep] = useState(0); 
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; level: string; color: string; advice: string } | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<"scales" | "profile">("scales");
  const [lastResults, setLastResults] = useState<Record<string, { level: string; timestamp: string; color: string }>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [irtQuestions, setIrtQuestions] = useState<Question[]>([]);
  const [showPushConfig, setShowPushConfig] = useState(false);
  const [pushConfig, setPushConfig] = useState(getPushConfig());
  const [unfinishedAssessments, setUnfinishedAssessments] = useState<Record<string, any>>({});

  useEffect(() => {
    if (profile && !profile.consentAccepted && !consentGiven) {
      setShowConsent(true);
    }
    if (profile) {
      fetchLastResults();
      initPushService();
      const progress = getAssessmentProgress();
      setUnfinishedAssessments(progress);
    }
  }, [profile, consentGiven]);

  useEffect(() => {
    const handleReminder = () => {
      console.log('收到测评提醒');
    };
    window.addEventListener('assessment-reminder', handleReminder);
    return () => {
      window.removeEventListener('assessment-reminder', handleReminder);
    };
  }, []);

  const fetchLastResults = async () => {
    if (!profile) return;
    try {
      const results: Record<string, any> = {};
      const assessments = await api.assessment.getMyAssessments();
      
      for (const assessment of assessments) {
        if (!results[assessment.type]) {
          let level = '';
          if (assessment.type === 'scl90') {
            // SCL-90 按照中国常模标准映射
            switch (assessment.risk_level) {
              case 'green':
                level = '正常';
                break;
              case 'yellow':
                level = '轻度症状';
                break;
              case 'orange':
                level = '中度症状';
                break;
              case 'red':
                level = '重度症状';
                break;
              default:
                level = '正常';
            }
          } else {
            // 其他量表保持原有映射
            level = assessment.risk_level === 'green' ? '正常' : 
                  assessment.risk_level === 'blue' ? '轻度' : 
                  assessment.risk_level === 'yellow' ? '中度' : 
                  assessment.risk_level === 'orange' ? '重度' : '危急';
          }
          
          results[assessment.type] = {
            level,
            timestamp: assessment.timestamp,
            color: assessment.risk_level
          };
        }
      }
      setLastResults(results);
    } catch (err) {
      console.error("Error fetching last results:", err);
    }
  };

  const handleAcceptConsent = async () => {
    if (!profile) return;
    try {
      const response = await fetch('http://localhost:3000/api/users/' + profile.uid, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ consentAccepted: true })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新失败');
      }
      
      setShowConsent(false);
      setConsentGiven(true);
    } catch (err: any) {
      console.error('更新用户同意状态失败:', err);
    }
  };

  const handleWearableSync = async (brand: string) => {
    if (!profile) return;
    try {
      await api.user.update(profile.uid, { wearableBrand: brand });
    } catch (err) {
      console.error("同步可穿戴设备失败:", err);
    }
  };

  const startScale = async (scale: Scale) => {
    // Check for existing progress
    const progress = getAssessmentProgress();
    const scaleProgress = progress[scale.id];
    
    if (scaleProgress) {
      // Show continue confirmation
      setContinueScale(scale);
      setContinueProgress({
        answers: scaleProgress.answers,
        currentQuestion: scaleProgress.currentQuestion
      });
      setShowContinueConfirm(true);
    } else {
      // Start fresh
      setSelectedScale(scale);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setStep(1);
    }
  };

  const confirmContinue = () => {
    if (continueScale && continueProgress) {
      setSelectedScale(continueScale);
      setAnswers(continueProgress.answers);
      setCurrentQuestionIndex(continueProgress.currentQuestion);
      setStep(2); // Directly go to assessment interface
      setShowContinueConfirm(false);
      setContinueScale(null);
      setContinueProgress(null);
    }
  };

  const startNewAssessment = () => {
    if (continueScale) {
      // Clear existing progress
      clearAssessmentProgress(continueScale.id);
      setSelectedScale(continueScale);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setStep(1);
      setShowContinueConfirm(false);
      setContinueScale(null);
      setContinueProgress(null);
    }
  };

  const startIrtAssessment = async (scale: Scale, fromProgress: boolean = false) => {
    setSelectedScale(scale);
    
    const progress = getAssessmentProgress();
    const scaleProgress = progress[scale.id];
    
    if (scaleProgress && !fromProgress) {
      // Show styled popup instead of window.confirm
      setIrtScale(scale);
      setShowIrtContinueConfirm(true);
    } else {
      // Directly start assessment
      await startIrtAssessmentInternal(scale, scaleProgress);
    }
  };

  const startIrtAssessmentInternal = async (scale: Scale, scaleProgress: any = null) => {
    setIsLoadingQuestions(true);
    
    try {
      if (scaleProgress) {
        setAnswers(scaleProgress.answers);
        setCurrentQuestionIndex(scaleProgress.currentQuestion);
        const response = await api.assessment.getNextQuestions(scale.id, scaleProgress.answers);
        setIrtQuestions(response.questions || scale.questions);
        setStep(2);
      } else {
        setAnswers([]);
        setCurrentQuestionIndex(0);
        const response = await api.assessment.getNextQuestions(scale.id, []);
        setIrtQuestions(response.questions || scale.questions);
        setStep(2);
      }
    } catch (error) {
      console.error("获取IRT题目失败:", error);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setIrtQuestions(scale.questions);
      setStep(2);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const confirmIrtContinue = async () => {
    if (irtScale) {
      const progress = getAssessmentProgress();
      const scaleProgress = progress[irtScale.id];
      await startIrtAssessmentInternal(irtScale, scaleProgress);
      setShowIrtContinueConfirm(false);
      setIrtScale(null);
    }
  };

  const cancelIrtContinue = async () => {
    if (irtScale) {
      await startIrtAssessmentInternal(irtScale, null);
      setShowIrtContinueConfirm(false);
      setIrtScale(null);
    }
  };

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [finalAnswers, setFinalAnswers] = useState<number[]>([]);
  const [showContinueConfirm, setShowContinueConfirm] = useState(false);
  const [continueScale, setContinueScale] = useState<Scale | null>(null);
  const [continueProgress, setContinueProgress] = useState<{ answers: number[]; currentQuestion: number } | null>(null);
  const [showIrtContinueConfirm, setShowIrtContinueConfirm] = useState(false);
  const [irtScale, setIrtScale] = useState<Scale | null>(null);

  const handleAnswer = async (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);

    if (selectedScale) {
      const answeredCount = newAnswers.filter(a => a !== undefined).length;
      const totalQuestions = irtQuestions.length > 0 ? irtQuestions.length : selectedScale.questions.length;
      
      saveAssessmentProgress({
        scaleId: selectedScale.id,
        currentQuestion: currentQuestionIndex + 1,
        answers: newAnswers,
        timestamp: Date.now()
      });

      if (answeredCount < totalQuestions) {
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < totalQuestions) {
          setCurrentQuestionIndex(nextIndex);
        }
      } else {
        // All questions answered, show submit confirmation
        setFinalAnswers(newAnswers);
        setShowSubmitConfirm(true);
      }
    }
  };

  const confirmSubmit = async () => {
    if (selectedScale) {
      setShowSubmitConfirm(false);
      clearAssessmentProgress(selectedScale.id);
      await submitAssessment(finalAnswers);
    }
  };

  const submitAssessment = async (finalAnswers: number[]) => {
    if (!profile || !selectedScale) return;
    setIsSubmitting(true);
    
    try {
      const calcResult = selectedScale.calculateResult(finalAnswers);
      setResult(calcResult);
      
      // 计算抑郁因子分（仅对SCL-90量表）
      let depressionScore = 2.0; // 设置默认值
      console.log('检查量表类型:', { selectedScaleId: selectedScale?.id, isScl90: selectedScale?.id === 'scl90' });
      if (selectedScale.id === 'scl90') {
        // SCL-90抑郁因子包含13个项目：5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79
        // 数组索引（从0开始）
        const depressionItems = [4, 13, 14, 19, 21, 25, 28, 29, 30, 31, 53, 70, 78];
        // 反向计分题目（项目编号）
        const reverseItems = [5, 19, 43, 68, 72];
        // 反向计分映射
        const reverseMapping = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
        
        let sum = 0;
        let count = 0;
        
        console.log('计算抑郁因子分:', {
          depressionItems,
          finalAnswersLength: finalAnswers.length,
          finalAnswers: finalAnswers.slice(0, 10) // 只显示前10个答案
        });
        
        for (const index of depressionItems) {
          if (finalAnswers[index] !== undefined) {
            let score = finalAnswers[index];
            // 检查是否需要反向计分（项目编号 = 索引 + 1）
            const itemNumber = index + 1;
            if (reverseItems.includes(itemNumber)) {
              score = reverseMapping[score as keyof typeof reverseMapping];
              console.log(`项目 ${itemNumber} 反向计分: ${finalAnswers[index]} -> ${score}`);
            }
            sum += score;
            count++;
            console.log(`项目 ${itemNumber} (索引 ${index}): ${score}`);
          } else {
            console.log(`项目索引 ${index} 未回答`);
          }
        }
        
        if (count > 0) {
          depressionScore = sum / count;
          console.log(`抑郁因子分计算结果: ${sum} / ${count} = ${depressionScore}`);
        } else {
          console.log('没有足够的抑郁因子项目数据，使用默认值:', depressionScore);
        }
      }
      
      // 确保抑郁因子分有效
      if (selectedScale.id === 'scl90' && (depressionScore === 0 || isNaN(depressionScore))) {
        depressionScore = 2.0; // 设置默认值
        console.log('设置默认抑郁因子分:', depressionScore);
      }
      
      console.log('开始提交评估:', {
        type: selectedScale.id,
        score: calcResult.score,
        level: calcResult.level,
        color: calcResult.color,
        depressionScore: depressionScore
      });
      
      const submissionData = {
        type: selectedScale.id,
        scores: { total: calcResult.score, ...finalAnswers.reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {}) },
        rawAnswers: finalAnswers.reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {}),
        riskLevel: calcResult.color as any,
        depressionScore: depressionScore
      };
      
      console.log('提交数据:', submissionData);
      
      await api.assessment.create(submissionData);
      
      console.log('评估提交成功');
      
      fetchLastResults();

      // 教师提交测评时不自动创建预警，预警由系统自动扫描或管理员手动创建
      // 移除自动创建预警的代码，因为教师角色没有创建预警的权限

      setStep(3);
      console.log('跳转到结果页面');
    } catch (err) {
      console.error("提交评估失败:", err);
      alert('提交评估失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = irtQuestions.length > 0 ? irtQuestions[currentQuestionIndex] : selectedScale?.questions[currentQuestionIndex];
  const totalQuestions = irtQuestions.length > 0 ? irtQuestions.length : selectedScale?.questions.length || 0;
  const answeredQuestions = answers.filter(a => a !== undefined).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  const handleExit = () => {
    setShowExitConfirm(false);
    setStep(0);
    setSelectedScale(null);
    setAnswers([]);
    setCurrentQuestionIndex(0);
  };

  const getTimeEstimate = (scale: Scale) => {
    if (scale.id === "scl90") return "15-20 分钟";
    if (scale.questions.length <= 10) return "1-3 分钟";
    if (scale.questions.length <= 30) return "3-5 分钟";
    return "5-10 分钟";
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50"
    >
      <ConsentModal isOpen={showConsent} onAccept={handleAcceptConsent} />
      
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">确认退出？</h3>
                <p className="text-stone-500">您的答题进度已自动保存，再次进入时可继续作答。</p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all"
                  >
                    继续答题
                  </button>
                  <button
                    onClick={handleExit}
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all shadow-md"
                  >
                    确认退出
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIrtContinueConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">继续测评？</h3>
                <p className="text-stone-500">您之前有未完成的测评，是否继续作答？</p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={cancelIrtContinue}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all"
                  >
                    重新开始
                  </button>
                  <button
                    onClick={confirmIrtContinue}
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all shadow-md"
                  >
                    继续作答
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContinueConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">继续测评？</h3>
                <p className="text-stone-500">您之前有未完成的测评，是否继续作答？</p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={startNewAssessment}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all"
                  >
                    重新开始
                  </button>
                  <button
                    onClick={confirmContinue}
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all shadow-md"
                  >
                    继续作答
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">确认提交？</h3>
                <p className="text-stone-500">您已完成所有题目，确认提交测评结果？</p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all"
                  >
                    继续修改
                  </button>
                  <button
                    onClick={confirmSubmit}
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all shadow-md"
                  >
                    确认提交
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900 flex items-center gap-3">
                <ClipboardCheck className="text-emerald-500" size={24} />
                绿色测评：心晴驿站
              </h1>
              <p className="text-stone-500 mt-1">专业心理测评系统，科学评估您的心理状态</p>
            </div>
            <div className="inline-flex bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl sm:rounded-2xl p-1 shadow-lg shadow-emerald-200/50 w-fit">
            <button
              onClick={() => setViewMode("scales")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${                viewMode === "scales"                  ? "bg-emerald-600 text-white shadow-md"                  : "text-stone-500 hover:text-stone-700"              }`}
            >
              量表测评
            </button>
            <button
              onClick={() => setViewMode("profile")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${                viewMode === "profile"                  ? "bg-emerald-600 text-white shadow-md"                  : "text-stone-500 hover:text-stone-700"              }`}
            >
              心理档案
            </button>
          </div>
        </div>

        {viewMode === "profile" ? (
          <PsychologicalProfile profile={profile} />
        ) : (
          <>
            {step === 0 && (
              <div className="space-y-8">


                <WearableSync currentBrand={profile?.wearableBrand || null} onSync={(brand) => handleWearableSync(brand)} />

                {Object.keys(unfinishedAssessments).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 rounded-[32px] border border-amber-200 mb-8"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-amber-200 rounded-2xl shrink-0">
                        <PauseCircle className="w-6 h-6 text-amber-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-amber-900 mb-3">您有未完成的测评</h3>
                        <div className="space-y-3">
                          {Object.entries(unfinishedAssessments).map(([scaleId, progress]) => {
                            const scale = SCALES.find(s => s.id === scaleId);
                            if (!scale) return null;
                            return (
                              <div key={scaleId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-2xl border border-amber-200 gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-stone-900 truncate">{scale.name}</h4>
                                  <p className="text-sm text-stone-500 mt-1">
                                    已完成 {progress.currentQuestion}/{scale.questions.length} 题
                                  </p>
                                </div>
                                <button
                                  onClick={() => startIrtAssessment(scale, true)}
                                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-all shadow-md whitespace-nowrap shrink-0"
                                >
                                  继续测评
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-white to-emerald-50 p-4 rounded-[32px] shadow-lg shadow-stone-100/50 mb-8"
                >
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl">
                          <Clock className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-stone-900">测评提醒设置</h3>
                          <p className="text-stone-500 text-sm">设置您的测评提醒时间</p>
                        </div>
                      </div>
                    <button
                      onClick={() => setShowPushConfig(!showPushConfig)}
                      className="p-2 rounded-full hover:bg-stone-100 transition-colors"
                    >
                      <ChevronRight size={20} className={`text-stone-400 transition-transform ${showPushConfig ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                  
                  {showPushConfig && (
                    <div className="space-y-3 pt-3 border-t border-stone-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-700">启用测评提醒</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pushConfig.enabled}
                            onChange={(e) => setPushConfig({ ...pushConfig, enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-stone-700">提醒时间</span>
                        <input
                          type="time"
                          value={pushConfig.time}
                          onChange={(e) => setPushConfig({ ...pushConfig, time: e.target.value })}
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-stone-700">提醒间隔（分钟）</span>
                        <input
                          type="number"
                          min="5"
                          max="120"
                          value={pushConfig.reminderInterval}
                          onChange={(e) => setPushConfig({ ...pushConfig, reminderInterval: parseInt(e.target.value) })}
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        onClick={() => {
                          savePushConfig(pushConfig);
                          setShowPushConfig(false);
                        }}
                        className="w-full py-2 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 transition-all shadow-md mb-1"
                      >
                        保存设置
                      </button>
                    </div>
                  )}
                </motion.div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {SCALES.map((scale) => (
                    <motion.div
                      key={scale.id}
                      whileHover={{ y: -4 }}
                      className="bg-gradient-to-br from-white to-emerald-50 rounded-[32px] p-4 shadow-lg shadow-stone-100/50 border border-emerald-100 hover:shadow-xl hover:shadow-emerald-200/30 transition-all cursor-pointer group min-h-[320px] flex flex-col"
                      onClick={() => startScale(scale)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl group-hover:from-emerald-100 group-hover:to-emerald-200 transition-all">
                          <ClipboardCheck className="w-6 h-6 text-emerald-600" />
                        </div>
                        {lastResults[scale.id] && (
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                            lastResults[scale.id].color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                            lastResults[scale.id].color === 'blue' ? 'bg-blue-100 text-blue-700' :
                            lastResults[scale.id].color === 'yellow' ? 'bg-amber-100 text-amber-700' :
                            lastResults[scale.id].color === 'orange' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {lastResults[scale.id].level}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-stone-900 mb-2">{scale.name}</h3>
                      <p className="text-sm text-stone-500 mb-4 line-clamp-2">{scale.description}</p>
                      <div className="flex items-center gap-4 text-xs text-stone-400 mb-4">
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {getTimeEstimate(scale)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Info size={14} />
                          {scale.questions.length} 题
                        </span>
                      </div>
                      {lastResults[scale.id] && (
                        <p className="text-xs text-stone-400 flex items-center gap-1.5">
                          <Calendar size={12} />
                          上次测评: {new Date(lastResults[scale.id].timestamp).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                      <div className="mt-auto pt-4 border-t border-stone-100">
                        <button className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-200/50 flex items-center justify-center gap-2">
                          开始测评
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && selectedScale && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto"
              >
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-stone-100/50 border border-stone-100">
                  <button
                    onClick={() => setStep(0)}
                    className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-8 transition-colors"
                  >
                    <ArrowLeft size={20} />
                    返回量表列表
                  </button>

                  <div className="text-center space-y-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-200">
                      <ClipboardCheck className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-2">{selectedScale.name}</h2>
                      <p className="text-stone-500">{selectedScale.description}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-6 text-left space-y-4">
                      <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
                        <Sparkles size={18} />
                        测评说明
                      </h3>
                      <ul className="space-y-3 text-sm text-emerald-800">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                          <span>请根据最近一周的实际感受作答</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                          <span>没有对错之分，选择最符合您情况的选项</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                          <span>测评结果将严格保密，仅用于生成个性化建议</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => startIrtAssessment(selectedScale)}
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2"
                    >
                      开始测评
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && selectedScale && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-3xl mx-auto"
              >
                <div className="bg-gradient-to-br from-white to-emerald-50 rounded-[32px] p-4 shadow-xl shadow-stone-100/50">
                    <div className="flex items-center justify-between mb-6">
                        <button
                          onClick={() => setShowExitConfirm(true)}
                      className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
                    >
                      <X size={20} />
                      退出
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-500">题目</span>
                      <span className="text-lg font-bold text-emerald-600">
                        {currentQuestionIndex + 1} / {totalQuestions}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-8">
                    <div className="text-sm text-stone-500">
                      已完成 {answeredQuestions} 题
                    </div>
                    <div className="text-sm text-stone-500">
                      进度: {Math.round(progress)}%
                    </div>
                  </div>

                  {isLoadingQuestions ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mb-6">
                        <Zap className="animate-spin w-10 h-10 text-emerald-600" />
                      </div>
                      <p className="text-stone-600 text-base">正在根据您的情况智能调整题目...</p>
                    </div>
                  ) : currentQuestion ? (
                    <div>
                      <div className="w-full bg-stone-100 rounded-full h-2 mb-8 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <h3 className="text-xl md:text-2xl font-semibold text-stone-900 mb-8 leading-relaxed">
                        {currentQuestion.text}
                      </h3>

                      <div className="space-y-3">
                        {currentQuestion.options.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleAnswer(option.value)}
                            className={`w-full p-4 md:p-5 rounded-2xl border-2 text-left transition-all ${
                              answers[currentQuestionIndex] === option.value
                                ? "border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100 shadow-md"
                                : "border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                            }`}
                          >
                            <span className="font-medium text-stone-900 text-base">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
                        <Info size={40} className="text-stone-300" />
                      </div>
                      <p className="text-stone-600 text-base">题目加载中...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto"
              >
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-stone-100/50 border border-stone-100 text-center">
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8 ${
                    result.color === 'green' ? 'bg-gradient-to-br from-emerald-100 to-emerald-200' :
                    result.color === 'blue' ? 'bg-gradient-to-br from-blue-100 to-blue-200' :
                    result.color === 'yellow' ? 'bg-gradient-to-br from-amber-100 to-amber-200' :
                    result.color === 'orange' ? 'bg-gradient-to-br from-orange-100 to-orange-200' :
                    'bg-gradient-to-br from-red-100 to-red-200'
                  }`}>
                    <ClipboardCheck className={`w-14 h-14 ${
                      result.color === 'green' ? 'text-emerald-600' :
                      result.color === 'blue' ? 'text-blue-600' :
                      result.color === 'yellow' ? 'text-amber-600' :
                      result.color === 'orange' ? 'text-orange-600' :
                      'text-red-600'
                    }`} />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-2">测评完成</h2>
                  <p className="text-stone-500 mb-8">{selectedScale?.name}</p>

                  <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-3xl p-6 mb-8">
                    <p className="text-sm text-stone-500 mb-2">测评结果</p>
                    <p className={`text-3xl md:text-4xl font-bold ${
                      result.color === 'green' ? 'text-emerald-600' :
                      result.color === 'blue' ? 'text-blue-600' :
                      result.color === 'yellow' ? 'text-amber-600' :
                      result.color === 'orange' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {result.level}
                    </p>
                    <p className="text-sm text-stone-400 mt-2">得分: {result.score}</p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-6 mb-8 text-left">
                    <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                      <TrendingUp size={18} />
                      建议
                    </h3>
                    <p className="text-emerald-800 leading-relaxed">{result.advice}</p>
                  </div>

                  <button
                    onClick={() => {
                      setStep(0);
                      setSelectedScale(null);
                      setAnswers([]);
                      setCurrentQuestionIndex(0);
                      setResult(null);
                    }}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-200/50"
                  >
                    返回量表列表
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default AssessmentPage;