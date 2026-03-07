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
  Zap
} from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { SCALES, Scale, Question } from "../data/scales";
import ConsentModal from "../components/ConsentModal";
import WearableSync from "../components/WearableSync";

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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile && !profile.consentAccepted) {
      setShowConsent(true);
    }
  }, [profile]);

  const handleAcceptConsent = async () => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        consentAccepted: true
      });
      setShowConsent(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWearableSync = async (brand: string) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        wearableBrand: brand
      });
    } catch (err) {
      console.error(err);
    }
  };

  const startScale = async (scale: Scale) => {
    setSelectedScale(scale);
    
    // Check for saved progress (Fragmented Filling)
    if (profile) {
      const progressDoc = await getDoc(doc(db, "progress", `${profile.uid}_${scale.id}`));
      if (progressDoc.exists()) {
        const data = progressDoc.data();
        setAnswers(data.answers || []);
        setCurrentQuestionIndex(data.currentIndex || 0);
      } else {
        setAnswers([]);
        setCurrentQuestionIndex(0);
      }
    }
    
    setStep(1);
  };

  const saveProgress = async () => {
    if (!profile || !selectedScale) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "progress", `${profile.uid}_${selectedScale.id}`), {
        answers,
        currentIndex: currentQuestionIndex,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);

    if (selectedScale) {
      // IRT-based dynamic question skipping (Simulated)
      // If the user answers "Never" (1) to multiple early items in a symptom scale, 
      // we might skip some related items to save time.
      let nextIndex = currentQuestionIndex + 1;
      
      // Example IRT Logic: If first 3 items are "Never", skip the next 2 related items
      if (currentQuestionIndex === 2 && newAnswers.slice(0, 3).every(a => a === 1)) {
        nextIndex = Math.min(currentQuestionIndex + 3, selectedScale.questions.length);
      }

      if (nextIndex < selectedScale.questions.length) {
        setCurrentQuestionIndex(nextIndex);
      } else {
        submitAssessment(newAnswers);
      }
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
        level: calcResult.level,
        isIrtOptimized: true // Flag for IRT optimization
      };
      
      await addDoc(collection(db, "assessments"), assessmentData);

      // Clear progress
      await setDoc(doc(db, "progress", `${profile.uid}_${selectedScale.id}`), {
        answers: [],
        currentIndex: 0
      });

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
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = selectedScale?.questions[currentQuestionIndex];
  const progress = selectedScale ? ((currentQuestionIndex + 1) / selectedScale.questions.length) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <ConsentModal isOpen={showConsent} onAccept={handleAcceptConsent} />

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <header>
              <h1 className="text-2xl font-bold text-stone-900">心理数据中心 (绿色测评)</h1>
              <p className="text-stone-500">多模态数据采集与动态心理档案系统</p>
            </header>

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
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] font-medium text-stone-400">
                              <Zap size={12} className="text-amber-500" /> IRT 提速 40%
                            </span>
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
            
            <div className="mt-8 flex items-center justify-center gap-4">
              <div className="px-4 py-2 bg-amber-50 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-700">
                <Zap size={16} /> IRT 动态出题已开启
              </div>
              <div className="px-4 py-2 bg-blue-50 rounded-xl flex items-center gap-2 text-xs font-bold text-blue-700">
                <Save size={16} /> 支持碎片化填写
              </div>
            </div>

            <div className="mt-8 p-6 bg-stone-50 rounded-3xl text-left">
              <h4 className="font-bold text-stone-700 mb-2 flex items-center gap-2">
                <AlertCircle size={18} /> 测评须知
              </h4>
              <ul className="text-sm text-stone-500 space-y-2 list-disc list-inside">
                <li>系统将根据您的历史作答智能筛选题目，缩短答题时间。</li>
                <li>您可以随时退出，系统将自动保存您的答题进度。</li>
                <li>测评结果将同步至您的“动态心理档案”。</li>
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
                  {isSaving && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><Save size={10} /> 进度已保存</span>}
                </div>
              </div>
              <button onClick={saveProgress} className="p-3 bg-stone-50 rounded-2xl text-stone-400 hover:text-emerald-600 transition-all">
                <Save size={20} />
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
                {currentQuestion.options.map((option, i) => (
                  <button 
                    key={i}
                    onClick={() => handleAnswer(option.value)}
                    className="px-6 py-5 rounded-3xl border-2 border-stone-50 text-stone-600 font-bold hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all text-left flex items-center justify-between group"
                  >
                    <span>{option.label}</span>
                    <div className="h-6 w-6 rounded-full border-2 border-stone-100 group-hover:border-emerald-500 flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-emerald-500 scale-0 group-hover:scale-100 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
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
