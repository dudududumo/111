import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Lock, Eye, Check } from "lucide-react";

interface ConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onAccept }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">数据采集知情同意书</h2>
                  <p className="text-stone-500 text-sm">您的隐私安全是我们最核心的承诺</p>
                </div>
              </div>

              <div className="space-y-6 bg-stone-50 p-8 rounded-3xl border border-stone-100 max-h-[400px] overflow-y-auto">
                <section className="space-y-3">
                  <h3 className="font-bold text-stone-800 flex items-center gap-2">
                    <Lock size={18} className="text-emerald-600" /> 1. 采集原则与范围
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    本系统遵循“最小必要”原则。我们将采集您的心理量表数据、授权后的生理指标（HRV、睡眠、心率）以及系统内的行为数据。所有数据仅用于生成您的个人心理健康档案及群体匿名分析。
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="font-bold text-stone-800 flex items-center gap-2">
                    <Eye size={18} className="text-emerald-600" /> 2. 隐私保护与脱敏
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    生理数据与行为数据在传输前将进行脱敏处理。管理端仅能查看年级组、学科组等聚合后的群体数据，无法定位到个人。您的个人档案仅您本人及授权的专业心理咨询师可见。
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="font-bold text-stone-800 flex items-center gap-2">
                    <Check size={18} className="text-emerald-600" /> 3. 您的权利
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    您可以随时在设置中撤回授权或更改数据采集频率。撤回授权后，系统将停止采集新数据，并可根据您的要求删除历史记录。
                  </p>
                </section>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onAccept}
                  className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={20} /> 我已阅读并同意
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="flex-1 py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200 transition-all"
                >
                  不同意并退出
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConsentModal;
