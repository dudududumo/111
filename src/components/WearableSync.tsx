import React, { useState } from "react";
import { Watch, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import CustomModal from "./CustomModal";

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
  const [showModal, setShowModal] = useState(false);

  const handleBrandClick = (brandId: string) => {
    setShowModal(true);
  };

  return (
    <>
      <CustomModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type="success"
        title="功能开发中"
        message="可穿戴设备数据同步功能正在开发中，敬请期待！"
        confirmText="知道了"
      />
      <div className="bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/50 p-4 sm:p-6 rounded-[32px] shadow-lg shadow-emerald-200/50 border border-emerald-100">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                <Watch size={20} className="sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-stone-900">生理数据接入</h3>
                <p className="text-stone-500 text-[10px] sm:text-xs">同步您的可穿戴设备数据</p>
              </div>
            </div>
          {currentBrand && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
              <CheckCircle2 size={14} /> 已连接
            </div>
          )}
        </div>

        {!currentBrand ? (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {BRANDS.map((brand) => (
              <button
                key={brand.id}
                onClick={() => handleBrandClick(brand.id)}
                className={`${brand.color} p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-md hover:shadow-lg`}
              >
                <div className="text-xl sm:text-2xl font-black">
                  {brand.id === "Apple" ? "" : brand.id === "Huawei" ? "华" : "Mi"}
                </div>
                <span className="text-[10px] sm:text-xs font-bold">{brand.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-br from-white to-emerald-50/30 rounded-xl sm:rounded-2xl border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl text-white flex items-center justify-center font-black">
                  {currentBrand === "Apple" ? "" : currentBrand === "Huawei" ? "华" : "Mi"}
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-stone-900">{currentBrand} 已连接</p>
                  <p className="text-[10px] sm:text-xs text-stone-400">上次同步：刚刚</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(true)}
                disabled={syncing}
                className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
              >
                <RefreshCw size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-100 shadow-sm">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">实时 HRV</p>
                <p className="text-lg sm:text-xl font-black text-stone-900">64 <span className="text-[10px] sm:text-xs font-normal text-stone-400">ms</span></p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-indigo-100 shadow-sm">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">昨晚深睡</p>
                <p className="text-lg sm:text-xl font-black text-stone-900">28 <span className="text-[10px] sm:text-xs font-normal text-stone-400">%</span></p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 sm:mt-6 flex items-start gap-2 p-3 bg-gradient-to-br from-amber-50 to-amber-100/30 rounded-xl sm:rounded-2xl border border-amber-100 text-[10px] text-amber-700 leading-relaxed">
          <AlertCircle size={14} className="shrink-0" />
          <p>数据采集遵循"最小必要"原则，仅同步脱敏后的生理指标。您可以在系统设置中随时断开连接。</p>
        </div>
      </div>
    </>
  );
};

export default WearableSync;
