import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Eye, Check } from "lucide-react";

interface ConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onAccept }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        /* 覆盖内容区（main 内容区），弹窗在内容区内居中 */
        <div className="absolute inset-0 z-[300] m-0! bg-ink-900/30 backdrop-blur-sm">
          <div className="sticky top-0 h-screen flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh_-_5rem)]"
            >
              <div className="p-5 sm:p-10 space-y-5 sm:space-y-8 flex-shrink-0">
                <div className="space-y-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-ink-900 leading-snug">数据采集知情同意书</h2>
                  <p className="text-xs sm:text-sm text-ink-500 mt-0.5">您的隐私安全是我们最核心的承诺</p>
                </div>
              </div>

                <div className="space-y-4 sm:space-y-6 bg-frost-50 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-frost-200 max-h-[45vh] sm:max-h-[400px] overflow-y-auto flex-1 min-h-0 mx-5 sm:mx-10">
                  <section className="space-y-2 sm:space-y-3">
                    <h3 className="font-bold text-ink-800 flex items-center gap-2 text-sm sm:text-base">
                      <Lock size={16} className="sm:hidden text-ink-500 flex-shrink-0" />
                      <Lock size={18} className="hidden sm:block text-ink-500 flex-shrink-0" /> 1. 采集原则与范围
                    </h3>
                    <p className="text-[13px] sm:text-sm text-ink-600 leading-relaxed">
                      本系统遵循“最小必要”原则。我们将采集您的心理量表数据、授权后的生理指标（HRV、睡眠、心率）以及系统内的行为数据。所有数据仅用于生成您的个人心理健康档案及群体匿名分析。
                    </p>
                  </section>

                  <section className="space-y-2 sm:space-y-3">
                    <h3 className="font-bold text-ink-800 flex items-center gap-2 text-sm sm:text-base">
                      <Eye size={16} className="sm:hidden text-ink-500 flex-shrink-0" />
                      <Eye size={18} className="hidden sm:block text-ink-500 flex-shrink-0" /> 2. 隐私保护与脱敏
                    </h3>
                    <p className="text-[13px] sm:text-sm text-ink-600 leading-relaxed">
                      生理数据与行为数据在传输前将进行脱敏处理。管理端仅能查看年级组、学科组等聚合后的群体数据，无法定位到个人。您的个人档案仅您本人及授权的专业心理咨询师可见。
                    </p>
                  </section>

                  <section className="space-y-2 sm:space-y-3">
                    <h3 className="font-bold text-ink-800 flex items-center gap-2 text-sm sm:text-base">
                      <Check size={16} className="sm:hidden text-ink-500 flex-shrink-0" />
                      <Check size={18} className="hidden sm:block text-ink-500 flex-shrink-0" /> 3. 您的权利
                    </h3>
                    <p className="text-[13px] sm:text-sm text-ink-600 leading-relaxed">
                      您可以随时在设置中撤回授权或更改数据采集频率。撤回授权后，系统将停止采集新数据，并可根据您的要求删除历史记录。
                    </p>
                  </section>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 px-5 sm:px-10 pb-5 sm:pb-10 pt-2 flex-shrink-0">
                  <button
                    onClick={onAccept}
                    className="flex-1 py-3.5 sm:py-4 bg-ink-900 text-white font-bold rounded-2xl shadow-lg hover:bg-ink-800 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Check size={20} /> 我已阅读并同意
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="flex-1 py-3.5 sm:py-4 bg-white/70 text-ink-700 border border-frost-200 font-bold rounded-2xl hover:bg-white transition-all text-sm sm:text-base"
                  >
                    不同意并退出
                  </button>
                </div>
              </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConsentModal;
