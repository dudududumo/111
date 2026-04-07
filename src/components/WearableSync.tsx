import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Watch, RefreshCw, CheckCircle2, AlertCircle, X, Clock } from "lucide-react";

interface WearableSyncProps {
  currentBrand: string | null;
  onSync: (brand: "Apple" | "Huawei" | "Xiaomi") => void;
}

const BRANDS = [
  { id: "Apple", name: "Apple Health", color: "bg-stone-900 text-white" },
  { id: "Huawei", name: "华为运动健康", color: "bg-red-600 text-white" },
  { id: "Xiaomi", name: "小米运动健康", color: "bg-orange-500 text-white" },
];

const WearableSync: React.FC<WearableSyncProps> = ({ currentBrand, onSync }) => {
  const [syncing, setSyncing] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleBrandClick = (brandId: string) => {
    setShowComingSoon(true);
  };

  return (
    <>
      <div className="bg-gradient-to-br from-white to-emerald-50 p-4 rounded-[32px] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Watch size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">生理数据接入</h3>
                <p className="text-stone-500 text-sm">同步您的可穿戴设备数据</p>
              </div>
            </div>
          {currentBrand && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
              <CheckCircle2 size={14} /> 已连接
            </div>
          )}
        </div>

        {!currentBrand ? (
          <div className="grid grid-cols-3 gap-2">
            {BRANDS.map((brand) => (
              <button
                key={brand.id}
                onClick={() => handleBrandClick(brand.id)}
                className={`${brand.color} p-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:opacity-90 transition-all`}
              >
                <div className="text-2xl font-black">
                  {brand.id === "Apple" ? "" : brand.id === "Huawei" ? "华" : "Mi"}
                </div>
                <span className="text-xs font-bold">{brand.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-black">
                  {currentBrand === "Apple" ? "" : currentBrand === "Huawei" ? "华" : "Mi"}
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">{currentBrand} 已连接</p>
                  <p className="text-xs text-stone-400">上次同步：刚刚</p>
                </div>
              </div>
              <button 
                onClick={() => setShowComingSoon(true)}
                disabled={syncing}
                className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">实时 HRV</p>
                <p className="text-xl font-black text-stone-900">64 <span className="text-xs font-normal text-stone-400">ms</span></p>
              </div>
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">昨晚深睡</p>
                <p className="text-xl font-black text-stone-900">28 <span className="text-xs font-normal text-stone-400">%</span></p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-[10px] text-amber-700 leading-relaxed">
          <AlertCircle size={14} className="shrink-0" />
          <p>数据采集遵循"最小必要"原则，仅同步脱敏后的生理指标。您可以在系统设置中随时断开连接。</p>
        </div>
      </div>

      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowComingSoon(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Clock size={32} className="text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">功能开发中</h3>
                <p className="text-stone-500 mb-6">
                  可穿戴设备数据同步功能正在开发中，敬请期待！
                </p>
                <button
                  onClick={() => setShowComingSoon(false)}
                  className="w-full py-3 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-colors"
                >
                  知道了
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WearableSync;
