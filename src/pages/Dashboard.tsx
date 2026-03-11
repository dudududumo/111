import React, { useEffect, useState } from "react";
import { UserProfile, PhysiologicalData, BehavioralData } from "../types";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { 
  Heart, 
  Moon, 
  Activity, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  Info,
  Zap,
  Briefcase,
  ShieldCheck
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar
} from "recharts";

import { db } from "../firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";

interface DashboardProps {
  profile: UserProfile | null;
}

const Dashboard: React.FC<DashboardProps> = ({ profile }) => {
  const [physioData, setPhysioData] = useState<PhysiologicalData | null>(null);
  const [behavioralData, setBehavioralData] = useState<BehavioralData | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<any>(null);

  useEffect(() => {
    // Simulate fetching physiological data
    const mockPhysio: PhysiologicalData = {
      hrv: [62, 65, 58, 70, 68, 72, 64],
      restingHR: [72, 70, 75, 68, 69, 67, 71],
      sleepDuration: [7.2, 6.5, 5.8, 7.5, 8.0, 7.2, 6.8],
      deepSleepRatio: [25, 22, 18, 28, 30, 26, 24],
      activityLevel: [8000, 6500, 4000, 9000, 11000, 7500, 8200],
      timestamps: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    };
    setPhysioData(mockPhysio);

    // Simulate fetching behavioral data
    const mockBehavioral: BehavioralData = {
      loginFrequency: 12,
      toolUsageMinutes: 145,
      communityInteractions: 8,
      workload: {
        classHours: 18,
        meetingHours: 6,
        nonTeachingTasks: 4,
        totalWorkloadIndex: 72
      }
    };
    setBehavioralData(mockBehavioral);

    // Fetch latest assessment
    const fetchLatest = async () => {
      if (profile) {
        try {
          const q = query(
            collection(db, "assessments"),
            where("uid", "==", profile.uid),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            setLatestAssessment(snap.docs[0].data());
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, "assessments");
        }
      }
    };
    
    fetchLatest();
  }, [profile]);

  const hrvData = physioData?.hrv.map((val, i) => ({ name: physioData.timestamps[i], value: val })) || [];
  const sleepData = physioData?.sleepDuration.map((val, i) => ({ name: physioData.timestamps[i], value: val })) || [];
  
  const radarData = [
    { subject: '情绪状态', A: 85, fullMark: 100 },
    { subject: '压力水平', A: 65, fullMark: 100 },
    { subject: '心理韧性', A: 90, fullMark: 100 },
    { subject: '社会连接', A: 75, fullMark: 100 },
    { subject: '职业认同', A: 80, fullMark: 100 },
  ];

  const workloadData = behavioralData ? [
    { name: '授课', value: behavioralData.workload.classHours },
    { name: '会议', value: behavioralData.workload.meetingHours },
    { name: '非教学', value: behavioralData.workload.nonTeachingTasks },
  ] : [];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">欢迎回来, {profile?.displayName}</h1>
          <p className="text-stone-500">这是您的动态心理档案，实时关注您的身心状态。</p>
        </div>
        {latestAssessment && (
          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${
            latestAssessment.riskLevel === 'green' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
            latestAssessment.riskLevel === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-700' :
            latestAssessment.riskLevel === 'yellow' ? 'bg-amber-50 border-amber-100 text-amber-700' :
            latestAssessment.riskLevel === 'orange' ? 'bg-orange-50 border-orange-100 text-orange-700' :
            'bg-red-50 border-red-100 text-red-700'
          }`}>
            <div className={`h-3 w-3 rounded-full animate-pulse ${
              latestAssessment.riskLevel === 'green' ? 'bg-emerald-500' :
              latestAssessment.riskLevel === 'blue' ? 'bg-blue-500' :
              latestAssessment.riskLevel === 'yellow' ? 'bg-amber-500' :
              latestAssessment.riskLevel === 'orange' ? 'bg-orange-500' :
              'bg-red-500'
            }`} />
            <span className="text-sm font-bold uppercase tracking-widest">当前状态：{latestAssessment.level}</span>
          </div>
        )}
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "平均 HRV", value: "64", unit: "ms", icon: Heart, color: "text-rose-500", bg: "bg-rose-50" },
          { label: "深睡占比", value: "26", unit: "%", icon: Moon, color: "text-indigo-500", bg: "bg-indigo-50" },
          { label: "日均步数", value: "8,240", unit: "步", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "本周课时", value: "18", unit: "h", icon: Briefcase, color: "text-amber-500", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm"
          >
            <div className={`h-12 w-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-medium text-stone-500">{stat.label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-stone-900">{stat.value}</span>
              <span className="text-xs text-stone-400 font-medium">{stat.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Trend Chart */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-500" /> 生理指标趋势 (HRV)
                </h3>
                <p className="text-sm text-stone-500">过去 7 天的 HRV 变化曲线</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-stone-50 rounded-full text-[10px] font-bold text-stone-400 uppercase">最近 7 天</span>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hrvData}>
                  <defs>
                    <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHrv)" name="HRV" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Moon size={20} className="text-indigo-500" /> 睡眠时长分析
                </h3>
                <p className="text-sm text-stone-500">每日睡眠时长 (小时)</p>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sleepData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={30} name="时长" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Radar & Behavior */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h3 className="text-lg font-bold text-stone-900 mb-2 flex items-center gap-2">
              <Zap size={20} className="text-amber-500" /> 综合心理画像
            </h3>
            <p className="text-sm text-stone-500 mb-8">基于多维数据的实时评估</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontSize: 10}} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="心理画像"
                    dataKey="A"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="flex gap-3">
                <Info className="text-emerald-600 shrink-0" size={18} />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  您的“心理韧性”指标表现优秀，建议继续保持规律的体育锻炼和正念练习。
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Briefcase size={20} className="text-stone-500" /> 工作量上下文
            </h3>
            <div className="space-y-6">
              {workloadData.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-stone-500">{item.name}</span>
                    <span className="text-stone-900">{item.value}h</span>
                  </div>
                  <div className="h-2 w-full bg-stone-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-stone-200 rounded-full" 
                      style={{ width: `${(item.value / 25) * 100}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[10px] text-blue-700 leading-relaxed">
                <ShieldCheck size={14} className="inline mr-1 mb-0.5" />
                行为与环境数据已进行脱敏处理，仅用于辅助分析压力来源。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Assessments */}
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-stone-900">最近测评</h3>
            <Link to="/assessment" className="text-sm font-medium text-emerald-600 hover:underline">查看全部</Link>
          </div>
          <div className="space-y-4">
            {[
              { title: "SCL-90 症状自评", date: "2024-05-20", score: "正常", color: "bg-emerald-100 text-emerald-700" },
              { title: "MBI 职业倦怠量表", date: "2024-05-15", score: "轻度", color: "bg-blue-100 text-blue-700" },
              { title: "SAS 焦虑自评", date: "2024-05-01", score: "正常", color: "bg-emerald-100 text-emerald-700" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-stone-50 transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                    <p className="text-xs text-stone-400">{item.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.color}`}>{item.score}</span>
                  <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-emerald-600 p-8 rounded-3xl shadow-lg shadow-emerald-100 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">AI 智能关怀</h3>
            <p className="text-emerald-100 text-sm mb-6 leading-relaxed">
              基于您本周的生理指标与工作负荷，AI 助手为您生成了专属调适建议。
            </p>
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <p className="text-sm font-medium">建议：尝试 3x3 呼吸法</p>
                <p className="text-xs text-emerald-100 mt-1">监测到您今日 HRV 略有下降，深呼吸有助于激活副交感神经。</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <p className="text-sm font-medium">推荐：正念冥想音频</p>
                <p className="text-xs text-emerald-100 mt-1">“睡前舒缓冥想”适合您今晚尝试，以改善睡眠深度。</p>
              </div>
            </div>
            <button className="mt-8 bg-white text-emerald-600 px-6 py-3 rounded-2xl font-bold text-sm shadow-xl hover:bg-emerald-50 transition-colors">
              立即开始调适
            </button>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-emerald-500 rounded-full blur-3xl opacity-50" />
          <div className="absolute -left-10 -top-10 h-40 w-40 bg-emerald-400 rounded-full blur-3xl opacity-30" />
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
