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
import PsychologicalProfile from "../components/PsychologicalProfile";
import CustomModal from "../components/CustomModal";
import { 
  initPushService, 
  saveAssessmentProgress, 
  getAssessmentProgress, 
  clearAssessmentProgress, 
  hasUnfinishedAssessment,
  getPushConfig,
  savePushConfig
} from "../services/pushService";
import PageContainer from "../components/layout/PageContainer";
import { PageHeader, GlassCard, Button, Tabs } from "../components/ui";

interface AssessmentPageProps {
  profile: UserProfile | null;
  onProfileUpdate?: (profile: UserProfile) => void;
}

const AssessmentPage: React.FC<AssessmentPageProps> = ({ profile, onProfileUpdate }) => {
  const [selectedScale, setSelectedScale] = useState<Scale | null>(null);
  const [step, setStep] = useState(0); 
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; level: string; color: string; advice: string } | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [viewMode, setViewMode] = useState<"scales" | "profile">("scales");
  const [lastResults, setLastResults] = useState<Record<string, { level: string; timestamp: string; color: string }>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [irtQuestions, setIrtQuestions] = useState<Question[]>([]);
  const [showPushConfig, setShowPushConfig] = useState(false);
  const [pushConfig, setPushConfig] = useState(getPushConfig());
  const [unfinishedAssessments, setUnfinishedAssessments] = useState<Record<string, any>>({});
  const [syncFrequency, setSyncFrequency] = useState<string>(profile?.syncFrequency || 'daily');
  const [continueScale, setContinueScale] = useState<Scale | null>(null);
  const [continueProgress, setContinueProgress] = useState<{ answers: number[]; currentQuestion: number } | null>(null);
  const [irtScale, setIrtScale] = useState<Scale | null>(null);
  const [finalAnswers, setFinalAnswers] = useState<number[]>([]);
  
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning" | "info" | "confirm";
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    showCancel?: boolean;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });

  const showModal = (data: Omit<typeof modalData, "isOpen">) => {
    setModalData({ ...data, isOpen: true });
  };

  const closeModal = () => {
    setModalData(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (profile && !profile.consentAccepted && !consentGiven) {
      setShowConsent(true);
    }
    if (profile) {
      fetchLastResults();
      initPushService();
      const progress = getAssessmentProgress();
      setUnfinishedAssessments(progress);
      setSyncFrequency(profile.syncFrequency || 'daily');
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
      const response = await fetch('/api/users/' + profile.uid, {
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

  const startScale = async (scale: Scale) => {
    const progress = getAssessmentProgress();
    const scaleProgress = progress[scale.id];
    
    if (scaleProgress) {
      setContinueScale(scale);
      setContinueProgress({
        answers: scaleProgress.answers,
        currentQuestion: scaleProgress.currentQuestion
      });
      showModal({
        type: "confirm",
        title: "继续测评？",
        message: "您之前有未完成的测评，是否继续作答？",
        confirmText: "继续作答",
        cancelText: "重新开始",
        showCancel: true,
        onConfirm: confirmContinue
      });
    } else {
      setSelectedScale(scale);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setIrtQuestions(scale.questions);
      setStep(2);
    }
  };

  const confirmContinue = () => {
    if (continueScale && continueProgress) {
      setSelectedScale(continueScale);
      setAnswers(continueProgress.answers);
      setCurrentQuestionIndex(continueProgress.currentQuestion);
      setStep(2);
      closeModal();
      setContinueScale(null);
      setContinueProgress(null);
    }
  };

  const startNewAssessment = () => {
    if (continueScale) {
      clearAssessmentProgress(continueScale.id);
      setSelectedScale(continueScale);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setStep(1);
      closeModal();
      setContinueScale(null);
      setContinueProgress(null);
    }
  };

  const startIrtAssessment = async (scale: Scale, fromProgress: boolean = false) => {
    setSelectedScale(scale);
    
    const progress = getAssessmentProgress();
    const scaleProgress = progress[scale.id];
    
    if (scaleProgress && !fromProgress) {
      setIrtScale(scale);
      showModal({
        type: "confirm",
        title: "继续测评？",
        message: "您之前有未完成的测评，是否继续作答？",
        confirmText: "继续作答",
        cancelText: "重新开始",
        showCancel: true,
        onConfirm: confirmIrtContinue
      });
    } else {
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
      closeModal();
      setIrtScale(null);
    }
  };

  const cancelIrtContinue = async () => {
    if (irtScale) {
      await startIrtAssessmentInternal(irtScale, null);
      closeModal();
      setIrtScale(null);
    }
  };

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
        setFinalAnswers(newAnswers);
        showModal({
          type: "confirm",
          title: "确认提交？",
          message: "您已完成所有题目，确认提交测评结果？",
          confirmText: "确认提交",
          cancelText: "继续修改",
          showCancel: true,
          onConfirm: () => confirmSubmit(newAnswers)
        });
      }
    }
  };

  const confirmSubmit = async (answersToSubmit: number[]) => {
    if (selectedScale) {
      closeModal();
      clearAssessmentProgress(selectedScale.id);
      await submitAssessment(answersToSubmit);
    }
  };

  const submitAssessment = async (finalAnswers: number[]) => {
    if (!profile || !selectedScale) return;
    setIsSubmitting(true);
    
    try {
      const calcResult = selectedScale.calculateResult(finalAnswers);
      setResult(calcResult);
      
      let depressionScore = 2.0;
      console.log('检查量表类型:', { selectedScaleId: selectedScale?.id, isScl90: selectedScale?.id === 'scl90' });
      if (selectedScale.id === 'scl90') {
        const depressionItems = [4, 13, 14, 19, 21, 25, 28, 29, 30, 31, 53, 70, 78];
        const reverseItems = [5, 19, 43, 68, 72];
        const reverseMapping = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
        
        let sum = 0;
        let count = 0;
        
        console.log('计算抑郁因子分:', {
          depressionItems,
          finalAnswersLength: finalAnswers.length,
          finalAnswers: finalAnswers.slice(0, 10)
        });
        
        for (const index of depressionItems) {
          if (finalAnswers[index] !== undefined) {
            let score = finalAnswers[index];
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
      
      if (selectedScale.id === 'scl90' && (depressionScore === 0 || isNaN(depressionScore))) {
        depressionScore = 2.0;
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

      setStep(3);
      console.log('跳转到结果页面');
    } catch (err) {
      console.error("提交评估失败:", err);
      showModal({
        type: "error",
        title: "提交失败",
        message: "提交评估失败，请稍后重试"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = irtQuestions.length > 0 ? irtQuestions[currentQuestionIndex] : selectedScale?.questions[currentQuestionIndex];
  const totalQuestions = irtQuestions.length > 0 ? irtQuestions.length : selectedScale?.questions.length || 0;
  const answeredQuestions = answers.filter(a => a !== undefined).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  const handleExit = () => {
    showModal({
      type: "confirm",
      title: "确认退出？",
      message: "您的答题进度已自动保存，再次进入时可继续作答。",
      confirmText: "确认退出",
      cancelText: "继续答题",
      showCancel: true,
      onConfirm: () => {
        closeModal();
        setStep(0);
        setSelectedScale(null);
        setAnswers([]);
        setCurrentQuestionIndex(0);
      }
    });
  };

  const getTimeEstimate = (scale: Scale) => {
    if (scale.id === "scl90") return "15-20 分钟";
    if (scale.questions.length <= 10) return "1-3 分钟";
    if (scale.questions.length <= 30) return "3-5 分钟";
    return "5-10 分钟";
  };

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <ConsentModal isOpen={showConsent} onAccept={handleAcceptConsent} />
        <CustomModal 
          isOpen={modalData.isOpen}
          onClose={closeModal}
          type={modalData.type}
          title={modalData.title}
          message={modalData.message}
          confirmText={modalData.confirmText}
          cancelText={modalData.cancelText}
          onConfirm={modalData.onConfirm}
          showCancel={modalData.showCancel}
        />

        <PageHeader
          title="绿色测评：心理数据中心"
          subtitle="专业心理测评系统，科学评估您的心理状态"
          actions={
            <Tabs
              items={[
                { key: "scales", label: "量表测评" },
                { key: "profile", label: "心理档案" },
              ]}
              active={viewMode}
              onChange={(key) => setViewMode(key as "scales" | "profile")}
              accent="meadow"
            />
          }
        />

        {viewMode === "profile" ? (
          <PsychologicalProfile profile={profile} />
        ) : (
          <>
            {step === 0 && (
              <div className="space-y-6 sm:space-y-8">
                {Object.keys(unfinishedAssessments).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <GlassCard className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl sm:rounded-2xl shrink-0">
                          <PauseCircle className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-xl font-bold text-ink-900 mb-3 sm:mb-4">您有未完成的测评</h3>
                          <div className="space-y-3">
                            {Object.entries(unfinishedAssessments).map(([scaleId, progress]) => {
                              const scale = SCALES.find(s => s.id === scaleId);
                              if (!scale) return null;
                              return (
                                <div key={scaleId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white/70 rounded-xl sm:rounded-2xl border border-amber-100 gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-ink-900 truncate">{scale.name}</h4>
                                    <p className="text-[10px] sm:text-xs text-ink-500 mt-1">
                                      已完成 {progress.currentQuestion}/{scale.questions.length} 题
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => startIrtAssessment(scale, true)}
                                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-meadow-500 to-meadow-600 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold hover:from-meadow-600 hover:to-meadow-700 transition-all shadow-md shadow-meadow-500/20 whitespace-nowrap shrink-0"
                                  >
                                    继续测评
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassCard className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 sm:p-3 bg-gradient-to-br from-meadow-500 to-meadow-600 rounded-xl sm:rounded-2xl">
                          <Clock className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-ink-900">测评提醒设置</h3>
                          <p className="text-ink-500 text-[10px] sm:text-xs">设置您的测评提醒时间和频率</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowPushConfig(!showPushConfig)}
                        className="p-2 rounded-full hover:bg-frost-100 transition-colors"
                      >
                        <ChevronRight size={20} className={`text-ink-400 transition-transform ${showPushConfig ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                    
                    {showPushConfig && (
                      <div className="space-y-3 pt-3 border-t border-frost-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-xs font-medium text-ink-700">启用测评提醒</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pushConfig.enabled}
                              onChange={(e) => setPushConfig({ ...pushConfig, enabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-frost-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-meadow-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-meadow-600"></div>
                          </label>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] sm:text-xs font-medium text-ink-700">提醒时间</span>
                          <input
                            type="time"
                            value={pushConfig.time}
                            onChange={(e) => setPushConfig({ ...pushConfig, time: e.target.value })}
                            className="w-full p-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-meadow-500/15 focus:border-meadow-500 text-sm transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] sm:text-xs font-medium text-ink-700">提醒间隔（分钟）</span>
                          <input
                            type="number"
                            min="5"
                            max="120"
                            value={pushConfig.reminderInterval}
                            onChange={(e) => setPushConfig({ ...pushConfig, reminderInterval: parseInt(e.target.value) })}
                            className="w-full p-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-meadow-500/15 focus:border-meadow-500 text-sm transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] sm:text-xs font-medium text-ink-700">测评频率</span>
                          <select
                            value={syncFrequency}
                            onChange={async (e) => {
                              const newFrequency = e.target.value;
                              setSyncFrequency(newFrequency);
                              if (profile) {
                                try {
                                  await api.user.update(profile.uid, { syncFrequency: newFrequency });
                                  if (onProfileUpdate) {
                                    onProfileUpdate({ ...profile, syncFrequency: newFrequency as "hourly" | "daily" | "realtime" });
                                  }
                                } catch (error) {
                                  console.error('更新测评频率失败:', error);
                                }
                              }
                            }}
                            className="w-full p-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-meadow-500/15 focus:border-meadow-500 text-sm transition-all"
                          >
                            <option value="hourly">高频（每小时）</option>
                            <option value="daily">中频（每天）</option>
                            <option value="realtime">实时</option>
                          </select>
                          <p className="text-[10px] text-ink-400">系统会根据您的心理状态自动调整测评频率，您也可以手动设置。</p>
                        </div>
                        <Button
                          variant="primary"
                          className="w-full"
                          onClick={() => {
                            savePushConfig(pushConfig);
                            setShowPushConfig(false);
                          }}
                        >
                          保存设置
                        </Button>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>

                <div className="grid gap-6 sm:gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {SCALES.map((scale) => (
                    <motion.div
                      key={scale.id}
                      whileHover={{ y: -5 }}
                      className="relative group"
                    >
                      <GlassCard
                        onClick={() => startScale(scale)}
                        className="w-full h-full flex flex-col items-start p-4 sm:p-6 cursor-pointer"
                      >
                        <div className="w-full flex justify-between items-start mb-4">
                          <div className="p-3 bg-gradient-to-br from-meadow-500 to-meadow-600 rounded-xl sm:rounded-2xl group-hover:from-meadow-600 group-hover:to-meadow-700 transition-all flex items-center justify-center">
                            <ClipboardCheck size={20} className="sm:w-6 sm:h-6 text-white" />
                          </div>
                          {lastResults[scale.id] && (
                            <span className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold ${
                              lastResults[scale.id].color === 'green' ? 'bg-meadow-100 text-meadow-700' :
                              lastResults[scale.id].color === 'blue' ? 'bg-breeze-100 text-breeze-700' :
                              lastResults[scale.id].color === 'yellow' ? 'bg-amber-100 text-amber-700' :
                              lastResults[scale.id].color === 'orange' ? 'bg-terra-100 text-terra-700' :
                              'bg-coral-100 text-coral-700'
                            }`}>
                              {lastResults[scale.id].level}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-ink-900 mb-2">{scale.name}</h3>
                        <p className="text-[10px] sm:text-xs text-ink-500 mb-4 line-clamp-2">{scale.description}</p>
                        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-ink-400 mb-4">
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                            {getTimeEstimate(scale)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Info size={12} className="sm:w-3.5 sm:h-3.5" />
                            {scale.questions.length} 题
                          </span>
                        </div>
                        {lastResults[scale.id] && (
                          <p className="text-[10px] sm:text-xs text-ink-400 flex items-center gap-1.5">
                            <Calendar size={10} className="sm:w-3 sm:h-3" />
                            上次测评: {new Date(lastResults[scale.id].timestamp).toLocaleDateString('zh-CN')}
                          </p>
                        )}
                        <div className="mt-auto pt-4 border-t border-frost-100 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-xs font-bold text-ink-400 group-hover:text-ink-900 transition-colors">
                              开始测评
                            </span>
                            <ChevronRight size={14} className="text-ink-400 group-hover:text-meadow-600 transition-colors" />
                          </div>
                        </div>
                      </GlassCard>
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
                <GlassCard className="p-6 sm:p-8">
                  <Button
                    variant="ghost"
                    icon={ArrowLeft}
                    onClick={() => setStep(0)}
                    className="mb-6 sm:mb-8"
                  >
                    返回量表列表
                  </Button>

                  <div className="text-center space-y-6">
                    <div className="w-20 sm:w-24 h-20 sm:h-24 bg-gradient-to-br from-meadow-500 to-meadow-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-meadow-500/20">
                      <ClipboardCheck className="w-10 sm:w-12 h-10 sm:h-12 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-ink-900 mb-2">{selectedScale.name}</h2>
                      <p className="text-ink-500 text-[10px] sm:text-xs">{selectedScale.description}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-meadow-50 to-meadow-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-left space-y-3 sm:space-y-4">
                      <h3 className="font-semibold text-meadow-700 flex items-center gap-2 text-sm sm:text-base">
                        <Sparkles size={16} className="sm:w-4 sm:h-4" />
                        测评说明
                      </h3>
                      <ul className="space-y-2 sm:space-y-3 text-[10px] sm:text-xs text-meadow-600">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-meadow-500 mt-0.5 shrink-0" />
                          <span>请根据最近一周的实际感受作答</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-meadow-500 mt-0.5 shrink-0" />
                          <span>没有对错之分，选择最符合您情况的选项</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-meadow-500 mt-0.5 shrink-0" />
                          <span>测评结果将严格保密，仅用于生成个性化建议</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => {
                        setAnswers([]);
                        setCurrentQuestionIndex(0);
                        setIrtQuestions(selectedScale.questions);
                        setStep(2);
                      }}
                      className="w-full py-3 sm:py-4 bg-gradient-to-r from-meadow-500 to-meadow-600 text-white rounded-xl sm:rounded-2xl font-semibold hover:from-meadow-600 hover:to-meadow-700 transition-all shadow-lg shadow-meadow-500/20 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      开始测评
                      <ChevronRight size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {step === 2 && selectedScale && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-3xl mx-auto"
              >
                <GlassCard className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <Button
                      variant="ghost"
                      icon={X}
                      onClick={handleExit}
                    >
                      退出
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs text-ink-500">题目</span>
                      <span className="text-base sm:text-lg font-bold text-meadow-600">
                        {currentQuestionIndex + 1} / {totalQuestions}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-6 sm:mb-8">
                    <div className="text-[10px] sm:text-xs text-ink-500">
                      已完成 {answeredQuestions} 题
                    </div>
                    <div className="text-[10px] sm:text-xs text-ink-500">
                      进度: {Math.round(progress)}%
                    </div>
                  </div>

                  {isLoadingQuestions ? (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-20">
                      <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-meadow-100 to-meadow-200 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                        <Zap className="animate-spin w-8 sm:w-10 h-8 sm:h-10 text-meadow-600" />
                      </div>
                      <p className="text-ink-600 text-sm sm:text-base">正在根据您的情况智能调整题目...</p>
                    </div>
                  ) : currentQuestion ? (
                    <div>
                      <div className="w-full bg-frost-100 rounded-full h-1.5 sm:h-2 mb-6 sm:mb-8 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-meadow-500 to-meadow-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-ink-900 mb-6 sm:mb-8 leading-relaxed">
                        {currentQuestion.text}
                      </h3>

                      <div className="space-y-2.5 sm:space-y-3">
                        {currentQuestion.options.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleAnswer(option.value)}
                            className={`w-full p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border-2 text-left transition-all ${
                              answers[currentQuestionIndex] === option.value
                                ? "border-meadow-500 bg-gradient-to-r from-meadow-50 to-meadow-100 shadow-md"
                                : "border-frost-100 hover:border-meadow-200 hover:bg-meadow-50/40"
                            }`}
                          >
                            <span className="font-medium text-ink-900 text-sm sm:text-base">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-20">
                      <div className="w-16 sm:w-20 h-16 sm:h-20 bg-frost-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                        <Info size={32} className="sm:w-10 sm:h-10 text-ink-400" />
                      </div>
                      <p className="text-ink-600 text-sm sm:text-base">题目加载中...</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}

            {step === 3 && result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto"
              >
                <GlassCard className="p-6 sm:p-8 text-center">
                  <div className={`w-24 sm:w-28 h-24 sm:h-28 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 ${
                    result.color === 'green' ? 'bg-gradient-to-br from-meadow-100 to-meadow-200' :
                    result.color === 'blue' ? 'bg-gradient-to-br from-breeze-100 to-breeze-200' :
                    result.color === 'yellow' ? 'bg-gradient-to-br from-amber-100 to-amber-200' :
                    result.color === 'orange' ? 'bg-gradient-to-br from-terra-100 to-terra-200' :
                    'bg-gradient-to-br from-coral-100 to-coral-200'
                  }`}>
                    <ClipboardCheck className={`w-10 sm:w-14 h-10 sm:h-14 ${
                      result.color === 'green' ? 'text-meadow-600' :
                      result.color === 'blue' ? 'text-breeze-600' :
                      result.color === 'yellow' ? 'text-amber-600' :
                      result.color === 'orange' ? 'text-terra-600' :
                      'text-coral-600'
                    }`} />
                  </div>

                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-ink-900 mb-2">测评完成</h2>
                  <p className="text-ink-500 text-[10px] sm:text-xs mb-6 sm:mb-8">{selectedScale?.name}</p>

                  <div className="bg-gradient-to-br from-frost-50 to-frost-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8">
                    <p className="text-[10px] sm:text-xs text-ink-500 mb-2">测评结果</p>
                    <p className={`text-2xl sm:text-3xl md:text-4xl font-bold ${
                      result.color === 'green' ? 'text-meadow-600' :
                      result.color === 'blue' ? 'text-breeze-600' :
                      result.color === 'yellow' ? 'text-amber-600' :
                      result.color === 'orange' ? 'text-terra-600' :
                      'text-coral-600'
                    }`}>
                      {result.level}
                    </p>
                    <p className="text-[10px] sm:text-xs text-ink-400 mt-2">得分: {result.score}</p>
                  </div>

                  <div className="bg-gradient-to-br from-meadow-50 to-meadow-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 text-left">
                    <h3 className="font-semibold text-meadow-700 mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <TrendingUp size={16} className="sm:w-4 sm:h-4" />
                      建议
                    </h3>
                    <p className="text-meadow-600 leading-relaxed text-[10px] sm:text-xs">{result.advice}</p>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full text-sm sm:text-base"
                    onClick={() => {
                      setStep(0);
                      setSelectedScale(null);
                      setAnswers([]);
                      setCurrentQuestionIndex(0);
                      setResult(null);
                    }}
                  >
                    返回量表列表
                  </Button>
                </GlassCard>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </PageContainer>
  );
};

export default AssessmentPage;
