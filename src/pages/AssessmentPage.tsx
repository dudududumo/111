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
  LogOut,
  X
} from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, getDoc, deleteDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { SCALES, Scale, Question } from "../data/scales";
import ConsentModal from "../components/ConsentModal";
import WearableSync from "../components/WearableSync";

import PsychologicalProfile from "../components/PsychologicalProfile";

interface AssessmentPageProps {
  profile: UserProfile | null;
}

const AssessmentPage: React.FC<AssessmentPageProps> = ({ profile }) => {
  const [selectedScale, setSelectedScale] = useState<Scale | null>(null);
  const [step, setStep] = useState(0); // 0: List, 1: Intro, 2: Testing, 3: Result
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; level: string; color: string; advice: string } | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<"scales" | "profile">("scales");
  const [lastResults, setLastResults] = useState<Record<string, { level: string; timestamp: string; color: string }>>({});

  useEffect(() => {
    if (profile && !profile.consentAccepted) {
      setShowConsent(true);
    }
    if (profile) {
      fetchLastResults();
    }
  }, [profile]);

  const fetchLastResults = async () => {
    if (!profile) return;
    try {
      const results: Record<string, any> = {};
      
      for (const scale of SCALES) {
        const q = query(
          collection(db, "assessments"),
          where("uid", "==", profile.uid),
          where("type", "==", scale.id),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          results[scale.id] = {
            level: data.level,
            timestamp: data.timestamp,
            color: data.riskLevel
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
      await updateDoc(doc(db, "users", profile.uid), {
        consentAccepted: true
      });
      setShowConsent(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleWearableSync = async (brand: string) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        wearableBrand: brand
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const startScale = (scale: Scale) => {
    setSelectedScale(scale);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setStep(1);
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);

    if (selectedScale) {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < selectedScale.questions.length) {
        setCurrentQuestionIndex(nextIndex);
      }
      // Removed auto-submit to allow manual submission via button
    }
  };

  const submitAssessment = async (finalAnswers: number[]) => {
    if (!profile || !selectedScale) return;
    setIsSubmitting(true);
    
    try {
      const calcResult = selectedScale.calculateResult(finalAnswers);
      setResult(calcResult);
      
      const assessmentData = {
        uid: profile.uid,
        type: selectedScale.id,
        scores: { total: calcResult.score, answers: finalAnswers },
        timestamp: new Date().toISOString(),
        riskLevel: calcResult.color,
        level: calcResult.level
      };
      
      await addDoc(collection(db, "assessments"), assessmentData);
      
      // Refresh last results
      fetchLastResults();

      // Delete any existing progress for this scale if it existed
      try {
        await deleteDoc(doc(db, "progress", `${profile.uid}_${selectedScale.id}`));
      } catch (e) {
        // Ignore if progress didn't exist
      }

      if (calcResult.color === "red" || calcResult.color === "orange") {
        await addDoc(collection(db, "warnings"), {
          uid: profile.uid,
          level: calcResult.color === "red" ? "high" : "medium",
          reason: `教师在 ${selectedScale.name} 中评分为 ${calcResult.level}`,
          status: "pending",
          timestamp: new Date().toISOString()
        });
      }

      setStep(3);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "assessments/warnings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = selectedScale?.questions[currentQuestionIndex];
  const progress = selectedScale ? ((currentQuestionIndex + 1) / selectedScale.questions.length) * 100 : 0;

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
      className="max-w-4xl mx-auto space-y-8"
    >
      <ConsentModal isOpen={showConsent} onAccept={handleAcceptConsent} />

      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[32px] shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="mx-auto h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-stone-900">确认退出？</h3>
                <p className="text-stone-500 text-sm leading-relaxed">
                  当前测评进度将不会被保存。如果您现在退出，下次需要从头开始作答。
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all"
                >
                  继续作答
                </button>
                <button 
                  onClick={handleExit}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  确认退出
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-stone-900">心理数据中心 (绿色测评)</h1>
                <p className="text-stone-500">多模态数据采集与动态心理档案系统</p>
              </div>
              <div className="flex bg-stone-100 p-1 rounded-2xl self-start">
                <button 
                  onClick={() => setViewMode("scales")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "scales" ? "bg-white text-emerald-600 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
                >
                  专业量表
                </button>
                <button 
                  onClick={() => setViewMode("profile")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "profile" ? "bg-white text-emerald-600 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
                >
                  动态档案
                </button>
              </div>
            </header>

            {viewMode === "scales" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">专业心理量表</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {SCALES.map((scale) => (
                      <div 
                        key={scale.id}
                        onClick={() => startScale(scale)}
                        className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <ClipboardCheck size={24} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">{scale.name}</h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              <span className="flex items-center gap-1 text-[10px] font-medium text-stone-400">
                                <Clock size={12} className="text-stone-300" /> 约 {getTimeEstimate(scale)}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-medium text-stone-400">
                                <Info size={12} className="text-stone-300" /> {scale.questions.length} 题
                              </span>
                              {lastResults[scale.id] && (
                                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  lastResults[scale.id].color === 'green' ? 'bg-emerald-50 text-emerald-600' :
                                  lastResults[scale.id].color === 'yellow' ? 'bg-amber-50 text-amber-600' :
                                  lastResults[scale.id].color === 'orange' ? 'bg-orange-50 text-orange-600' :
                                  'bg-red-50 text-red-600'
                                }`}>
                                  上次结果: {lastResults[scale.id].level} ({new Date(lastResults[scale.id].timestamp).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">生理数据接入</h3>
                  <WearableSync 
                    currentBrand={profile?.wearableBrand || null} 
                    onSync={handleWearableSync} 
                  />
                </div>
              </div>
            ) : (
              <PsychologicalProfile profile={profile} />
            )}
          </motion.div>
        )}

        {step === 1 && selectedScale && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="bg-white p-10 rounded-[40px] border border-stone-100 shadow-xl text-center relative"
          >
            <button onClick={() => setStep(0)} className="absolute top-8 left-8 text-stone-400 hover:text-stone-600">
              <ArrowLeft size={24} />
            </button>
            <div className="mx-auto h-20 w-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
              <ClipboardCheck size={40} />
            </div>
            <h2 className="text-2xl font-bold text-stone-900">{selectedScale.name}</h2>
            <p className="text-stone-500 mt-2 max-w-md mx-auto">{selectedScale.description}</p>
            
            <div className="mt-8 flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <div className="h-12 w-12 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center">
                  <Info size={24} />
                </div>
                <span className="text-xs font-bold text-stone-400 mt-1">{selectedScale.questions.length} 道题目</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-12 w-12 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center">
                  <Clock size={24} />
                </div>
                <span className="text-xs font-bold text-stone-400 mt-1">预计 {getTimeEstimate(selectedScale)}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-12 w-12 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center">
                  <Zap size={24} />
                </div>
                <span className="text-xs font-bold text-stone-400 mt-1">专业算法评估</span>
              </div>
            </div>

            <div className="mt-8 p-6 bg-stone-50 rounded-3xl text-left">
              <h4 className="font-bold text-stone-700 mb-2 flex items-center gap-2">
                <AlertCircle size={18} /> 测评须知
              </h4>
              <ul className="text-sm text-stone-500 space-y-2 list-disc list-inside">
                <li>请根据您最近一周的真实感受进行作答。</li>
                <li className="text-red-500 font-medium">本次测评不支持保存进度，退出将需要重新开始。</li>
                <li>测评结果仅供参考，不作为医学诊断依据。</li>
              </ul>
            </div>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setStep(2)}
                className="w-full sm:w-auto px-10 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
              >
                开始作答
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && selectedScale && currentQuestion && (
          <motion.div 
            key="testing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-10 rounded-[40px] border border-stone-100 shadow-xl"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-bold text-stone-900">{selectedScale.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-stone-400">第 {currentQuestionIndex + 1} / {selectedScale.questions.length} 题</span>
                </div>
              </div>
              <button 
                onClick={() => setShowExitConfirm(true)} 
                className="p-3 bg-stone-50 rounded-2xl text-stone-400 hover:text-red-600 transition-all flex items-center gap-2 text-xs font-bold"
              >
                <X size={20} /> 退出
              </button>
            </div>
            
            <div className="py-12 text-center">
              <motion.p 
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-medium text-stone-800 leading-relaxed"
              >
                {currentQuestion.text}
              </motion.p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 max-w-2xl mx-auto">
                {currentQuestion.options.map((option, i) => {
                  const isSelected = answers[currentQuestionIndex] === option.value;
                  return (
                    <button 
                      key={i}
                      onClick={() => handleAnswer(option.value)}
                      className={`px-6 py-5 rounded-3xl border-2 transition-all text-left flex items-center justify-between group ${
                        isSelected 
                          ? "border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm" 
                          : "border-stone-50 text-stone-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                      }`}
                    >
                      <span>{option.label}</span>
                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-emerald-500" : "border-stone-100 group-hover:border-emerald-500"
                      }`}>
                        <div className={`h-3 w-3 rounded-full bg-emerald-500 transition-transform ${
                          isSelected ? "scale-100" : "scale-0 group-hover:scale-100"
                        }`} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {currentQuestionIndex === selectedScale.questions.length - 1 && answers[currentQuestionIndex] !== undefined && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12"
                >
                  <button 
                    onClick={() => submitAssessment(answers)}
                    disabled={isSubmitting}
                    className="w-full max-w-xs px-10 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                  >
                    {isSubmitting ? "正在提交..." : "完成并提交测评"}
                    {!isSubmitting && <ChevronRight size={20} />}
                  </button>
                </motion.div>
              )}
            </div>

            <div className="mt-12 pt-8 border-t border-stone-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">进度</span>
                <span className="text-xs font-bold text-emerald-600">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-emerald-500" 
                />
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && result && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-12 rounded-[40px] border border-stone-100 shadow-2xl text-center"
          >
            <div className={`mx-auto h-24 w-24 rounded-full flex items-center justify-center mb-8 ${
              result.color === 'green' ? 'bg-emerald-50 text-emerald-600' :
              result.color === 'yellow' ? 'bg-amber-50 text-amber-600' :
              result.color === 'orange' ? 'bg-orange-50 text-orange-600' :
              'bg-red-50 text-red-600'
            }`}>
              <CheckCircle2 size={56} />
            </div>
            <h2 className="text-3xl font-bold text-stone-900">测评完成！</h2>
            <p className="text-stone-500 mt-4">您的测评结果已生成并存入动态心理档案。</p>
            
            <div className={`mt-10 p-8 rounded-3xl border inline-block text-left max-w-md mx-auto ${
              result.color === 'green' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
              result.color === 'yellow' ? 'bg-amber-50 border-amber-100 text-amber-900' :
              result.color === 'orange' ? 'bg-orange-50 border-orange-100 text-orange-900' :
              'bg-red-50 border-red-100 text-red-900'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">测评简报：</h4>
                <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-white/50 rounded-full">
                  {result.level}
                </span>
              </div>
              <p className="text-sm leading-relaxed opacity-90">
                {result.advice}
              </p>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setStep(0)}
                className="w-full sm:w-auto px-10 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg hover:bg-emerald-700 transition-all"
              >
                返回首页
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AssessmentPage;
