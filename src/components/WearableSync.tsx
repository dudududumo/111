import React, { useState } from "react";
import { motion } from "motion/react";
import { Watch, Smartphone, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface WearableSyncProps {
  currentBrand: string | null;
  onSync: (brand: "Apple" | "Huawei" | "Xiaomi") => void;
}

const BRANDS = [
  { id: "Apple", name: "Apple Health", icon: "", color: "bg-stone-900 text-white" },
  { id: "Huawei", name: "华为运动健康", icon: "H", color: "bg-red-600 text-white" },
  { id: "Xiaomi", name: "小米运动健康", icon: "Mi", color: "bg-orange-500 text-white" },
];

const WearableSync: React.FC<WearableSyncProps> = ({ currentBrand, onSync }) => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = (brand: any) => {
    setSyncing(true);
    setTimeout(() => {
      onSync(brand);
      setSyncing(false);
    }, 2000);
  };

  return (
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
              onClick={() => handleSync(brand.id)}
              disabled={syncing}
              className={`${brand.color} p-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:opacity-90 transition-all disabled:opacity-50`}
            >
              <span className="text-2xl font-black">{brand.icon}</span>
              <span className="text-xs font-bold">{brand.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-black">
                {currentBrand === "Apple" ? "" : currentBrand === "Huawei" ? "H" : "Mi"}
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900">{currentBrand} 已连接</p>
                <p className="text-xs text-stone-400">上次同步：刚刚</p>
              </div>
            </div>
            <button 
              onClick={() => handleSync(currentBrand)}
              disabled={syncing}
              className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
            >
              <RefreshCw size={20} className={syncing ? "animate-spin" : ""} />
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
        <p>数据采集遵循“最小必要”原则，仅同步脱敏后的生理指标。您可以在系统设置中随时断开连接。</p>
      </div>
    </div>
  );
};

export default WearableSync;
