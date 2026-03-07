import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Users, 
  ChevronRight, 
  Filter, 
  Search,
  Eye,
  CheckCircle,
  Clock,
  Info,
  Lock,
  BarChart3,
  Map,
  Play,
  Settings,
  Bell,
  X
} from "lucide-react";
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc,
  addDoc,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../firebase";
import { Warning, UserRole, UserProfile } from "../types";
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  Cell,
  PieChart,
  Pie,
  CartesianGrid
} from "recharts";

interface WarningCenterProps {
  profile: UserProfile | null;
}

const WarningCenter: React.FC<WarningCenterProps> = ({ profile }) => {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const userRole = profile?.role || UserRole.TEACHER;

  useEffect(() => {
    const q = query(collection(db, "warnings"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warning));
      setWarnings(data);
    });
    return () => unsubscribe();
  }, []);

  const filteredWarnings = warnings.filter(w => {
    if (filter === "all") return true;
    return w.level === filter;
  });

  const stats = {
    emergency: warnings.filter(w => w.level === "emergency").length,
    intervention: warnings.filter(w => w.level === "intervention").length,
    attention: warnings.filter(w => w.level === "attention").length,
  };

  const scatterData = warnings.map(w => ({
    x: w.riskScore * 100,
    y: Math.random() * 100, // Simulated secondary dimension
    z: w.level === 'emergency' ? 100 : (w.level === 'intervention' ? 60 : 30),
    level: w.level,
    name: userRole === UserRole.ADMIN || userRole === UserRole.PSYCHOLOGIST ? w.teacherName : "匿名教师"
  }));

  const pieData = [
    { name: '紧急', value: stats.emergency, color: '#ef4444' },
    { name: '介入', value: stats.intervention, color: '#f59e0b' },
    { name: '关注', value: stats.attention, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const handleResolve = async (id: string) => {
    const docRef = doc(db, "warnings", id);
    await updateDoc(docRef, { 
      status: "resolved",
      responseLog: [
        ...(selectedWarning?.responseLog || []),
        { action: "标记为已处理", timestamp: new Date().toISOString(), actor: profile?.displayName || "管理员" }
      ]
    });
    setSelectedWarning(null);
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate calling the risk engine for a random teacher
      const mockUids = ["teacher_001", "teacher_002", "teacher_003", "teacher_004"];
      const targetUid = mockUids[Math.floor(Math.random() * mockUids.length)];
      
      const response = await fetch(`/api/risk-engine/analyze/${targetUid}`, { method: 'POST' });
      const result = await response.json();

      if (result.warningTriggered) {
        await addDoc(collection(db, "warnings"), {
          uid: targetUid,
          teacherName: `教师 ${targetUid.split('_')[1]}`,
          level: result.warningLevel,
          riskScore: result.riskScore,
          factors: result.factors,
          reason: `LSTM 预测风险指数达 ${(result.riskScore * 100).toFixed(0)}%`,
          status: "pending",
          timestamp: new Date().toISOString(),
          responseLog: [{ action: "系统自动触发预警", timestamp: new Date().toISOString(), actor: "LSTM 引擎" }]
        });
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
              <ShieldAlert className="text-rose-600" size={32} />
              智能预警中心
            </h1>
            <p className="text-stone-500 mt-1">基于 LSTM 算法引擎的实时风险监测与分级响应</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowConfig(true)}
              className="p-3 bg-white border border-stone-200 rounded-2xl text-stone-500 hover:bg-stone-50 transition-all shadow-sm"
              title="响应机制配置"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className={`flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 transition-all hover:bg-rose-700 active:scale-95 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isAnalyzing ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                  <Activity size={20} />
                </motion.div>
              ) : <Play size={20} />}
              {isAnalyzing ? "引擎分析中..." : "启动风险扫描"}
            </button>
            <div className="flex bg-white p-1 rounded-2xl border border-stone-200 shadow-sm ml-2">
              <button 
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${viewMode === "list" ? "bg-stone-900 text-white shadow-md" : "text-stone-500 hover:bg-stone-50"}`}
              >
                <BarChart3 size={18} /> 预警列表
              </button>
              <button 
                onClick={() => setViewMode("map")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${viewMode === "map" ? "bg-stone-900 text-white shadow-md" : "text-stone-500 hover:bg-stone-50"}`}
              >
                <Map size={18} /> 风险图谱
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "紧急干预", count: stats.emergency, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", level: "emergency" },
            { label: "重点关注", count: stats.intervention, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", level: "intervention" },
            { label: "常规监测", count: stats.attention, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", level: "attention" },
          ].map((s, i) => (
            <motion.button
              key={i}
              whileHover={{ y: -4 }}
              onClick={() => setFilter(s.level)}
              className={`p-6 rounded-3xl border ${s.bg} ${s.border} text-left transition-all ${filter === s.level ? 'ring-2 ring-stone-900' : ''}`}
            >
              <p className={`text-sm font-bold uppercase tracking-wider ${s.color}`}>{s.label}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black text-stone-900">{s.count}</span>
                <span className="text-sm font-medium text-stone-500">人</span>
              </div>
            </motion.button>
          ))}
        </div>

        {viewMode === "list" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Warning List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="搜索教师姓名或预警编号..." 
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-stone-200"
                  />
                </div>
                <button 
                  onClick={() => setFilter("all")}
                  className="p-2 hover:bg-stone-100 rounded-xl text-stone-500 transition-colors"
                >
                  <Filter size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredWarnings.map((warning) => (
                    <motion.div
                      key={warning.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedWarning(warning)}
                      className={`group bg-white p-6 rounded-3xl border transition-all cursor-pointer hover:shadow-lg ${selectedWarning?.id === warning.id ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-100'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                            warning.level === 'emergency' ? 'bg-rose-100 text-rose-600' : 
                            warning.level === 'intervention' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            <AlertTriangle size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-stone-900">
                              {userRole === UserRole.ADMIN || userRole === UserRole.PSYCHOLOGIST ? warning.teacherName : "匿名教师"}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                warning.level === 'emergency' ? 'bg-rose-50 text-rose-600' : 
                                warning.level === 'intervention' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {warning.level === 'emergency' ? '三级紧急' : warning.level === 'intervention' ? '二级介入' : '一级关注'}
                              </span>
                              <span className="text-xs text-stone-400 flex items-center gap-1">
                                <Clock size={12} /> {new Date(warning.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-stone-900">{(warning.riskScore * 100).toFixed(0)}%</div>
                          <div className="text-[10px] font-bold text-stone-400 uppercase">风险指数</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredWarnings.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
                    <CheckCircle className="mx-auto text-stone-200 mb-4" size={48} />
                    <p className="text-stone-400 font-medium">暂无匹配的预警事件</p>
                  </div>
                )}
              </div>
            </div>

            {/* Warning Details Panel */}
            <div className="lg:col-span-1">
              <AnimatePresence mode="wait">
                {selectedWarning ? (
                  <motion.div
                    key={selectedWarning.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden sticky top-24"
                  >
                    <div className={`p-6 ${
                      selectedWarning.level === 'emergency' ? 'bg-rose-600' : 
                      selectedWarning.level === 'intervention' ? 'bg-amber-500' : 'bg-blue-500'
                    } text-white`}>
                      <div className="flex justify-between items-start">
                        <h2 className="text-xl font-bold">风险详情分析</h2>
                        <button onClick={() => setSelectedWarning(null)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                          <ChevronRight size={20} className="rotate-90" />
                        </button>
                      </div>
                      <p className="text-white/80 text-sm mt-1">算法引擎：LSTM 时序风险模型 v2.1</p>
                    </div>

                    <div className="p-8 space-y-8">
                      {/* XAI Section */}
                      <section>
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Info size={14} /> 预警依据 (可解释性)
                        </h4>
                        <div className="space-y-3">
                          {selectedWarning.factors.map((f, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                              <div className="h-5 w-5 rounded-full bg-white border border-stone-200 flex items-center justify-center shrink-0 mt-0.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              </div>
                              <p className="text-sm text-stone-700 font-medium leading-relaxed">{f}</p>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Response Mechanism */}
                      <section>
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">响应机制</h4>
                        <div className="p-4 bg-stone-900 rounded-2xl text-white">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center">
                              <Users size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white/60">当前响应级别</p>
                              <p className="text-sm font-bold">
                                {selectedWarning.level === 'emergency' ? '三级干预：推送至心理负责人' : 
                                 selectedWarning.level === 'intervention' ? '二级关注：推送至年级主任' : '一级提醒：推送自助资源'}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleResolve(selectedWarning.id!)}
                            className="w-full py-3 bg-white text-stone-900 rounded-xl text-sm font-bold hover:bg-stone-100 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={18} /> 标记为已处理
                          </button>
                        </div>
                      </section>

                      {/* Privacy Notice */}
                      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex gap-3">
                        <Lock className="text-stone-400 shrink-0" size={18} />
                        <p className="text-[10px] text-stone-500 leading-relaxed">
                          本预警信息仅限授权人员查看。所有访问记录将被审计，严禁将信息用于绩效考核或其他非心理健康用途。
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-dashed border-stone-200">
                    <Eye className="text-stone-200 mb-4" size={48} />
                    <h3 className="text-stone-900 font-bold">查看详情</h3>
                    <p className="text-stone-400 text-sm mt-2">点击左侧预警项查看详细的风险因子分析与响应建议</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Group Risk Map */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">群体风险分布图谱</h3>
                    <p className="text-sm text-stone-500">横轴：风险指数 | 纵轴：活跃度波动</p>
                  </div>
                </div>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" dataKey="x" name="风险指数" unit="%" axisLine={false} tickLine={false} />
                      <YAxis type="number" dataKey="y" name="活跃度" unit="%" axisLine={false} tickLine={false} />
                      <ZAxis type="number" dataKey="z" range={[100, 1000]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Scatter name="风险点" data={scatterData}>
                        {scatterData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.level === 'emergency' ? '#ef4444' : (entry.level === 'intervention' ? '#f59e0b' : '#3b82f6')} 
                            fillOpacity={0.6}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-lg font-bold text-stone-900 mb-8">风险等级占比</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-8 space-y-4">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-sm font-medium text-stone-600">{d.name}</span>
                      </div>
                      <span className="text-sm font-bold text-stone-900">{d.value} 人</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Config Modal */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfig(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-stone-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">响应机制配置</h2>
                  <p className="text-stone-500 text-sm">自定义不同风险等级的自动化响应流程</p>
                </div>
                <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors">
                  <X size={24} className="text-stone-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                {[
                  { level: "三级紧急", color: "bg-rose-600", desc: "风险指数 > 0.9 或 抑郁因子连续 ≥ 2.0", action: "即时推送至心理负责人，启动正式干预流程" },
                  { level: "二级介入", color: "bg-amber-500", desc: "风险指数 > 0.8", action: "脱敏推送至年级主任/教研组长，建议面谈关注" },
                  { level: "一级关注", color: "bg-blue-500", desc: "风险指数 > 0.75", action: "自动推送自助心理资源包至教师个人端" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className={`h-12 w-12 rounded-2xl ${item.color} shrink-0 flex items-center justify-center text-white`}>
                      <Bell size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-stone-900">{item.level}</h3>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">已激活</span>
                      </div>
                      <p className="text-xs text-stone-500 mb-4">{item.desc}</p>
                      <div className="p-3 bg-white rounded-xl border border-stone-200 text-sm font-medium text-stone-700">
                        {item.action}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-stone-50 flex justify-end gap-4">
                <button onClick={() => setShowConfig(false)} className="px-6 py-2 text-stone-500 font-bold hover:text-stone-700">取消</button>
                <button onClick={() => setShowConfig(false)} className="px-8 py-2 bg-stone-900 text-white rounded-xl font-bold shadow-lg shadow-stone-200 hover:bg-stone-800 transition-all">保存配置</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WarningCenter;
