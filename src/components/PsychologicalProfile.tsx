import React, { useEffect, useState } from "react";
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
  Bar,
  Cell
} from "recharts";
import { UserProfile, PhysiologicalData, BehavioralData } from "../types";
import { motion } from "motion/react";
import { Activity, Moon, Heart, Zap, Briefcase, Info, ClipboardCheck, TrendingUp } from "lucide-react";
import { db } from "../firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";

interface PsychologicalProfileProps {
  profile: UserProfile | null;
}

const PsychologicalProfile: React.FC<PsychologicalProfileProps> = ({ profile }) => {
  const [physioData, setPhysioData] = useState<PhysiologicalData | null>(null);
  const [behavioralData, setBehavioralData] = useState<BehavioralData | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        const [physioRes, workloadRes] = await Promise.all([
          fetch(`/api/physiological/${profile.uid}`),
          fetch(`/api/workload/${profile.uid}`)
        ]);
        
        const physio = await physioRes.json();
        const workload = await workloadRes.json();
        
        setPhysioData(physio);
        setBehavioralData({
          loginFrequency: 12,
          toolUsageMinutes: 45,
          communityInteractions: 8,
          workload: workload
        });

        // Fetch assessment history
        const q = query(
          collection(db, "assessments"),
          where("uid", "==", profile.uid),
          orderBy("timestamp", "desc"),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const history = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAssessments(history);

      } catch (err) {
        console.error("Error fetching profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  if (loading) return <div className="h-64 flex items-center justify-center">加载动态档案中...</div>;

  const getScaleName = (id: string) => {
    const names: Record<string, string> = {
      scl90: "SCL-90 症状自评",
      sas: "SAS 焦虑自评",
      sds: "SDS 抑郁自评",
      mbi: "MBI 职业倦怠",
      phq9: "PHQ-9 抑郁筛查",
      gad7: "GAD-7 焦虑量表"
    };
    return names[id] || id;
  };

  // Process assessment history for trend curves
  const assessmentTrend = [...assessments].reverse().map(a => ({
    date: new Date(a.timestamp).toLocaleDateString(),
    score: a.scores?.total || 0,
    type: getScaleName(a.type)
  }));

  const radarData = [
    { subject: '情绪状态', A: 85, fullMark: 100 },
    { subject: '压力水平', A: 65, fullMark: 100 },
    { subject: '恢复力', A: 90, fullMark: 100 },
    { subject: '社会连接', A: 70, fullMark: 100 },
    { subject: '职业成就', A: 80, fullMark: 100 },
  ];

  const hrvTrend = physioData?.hrv.map((val, i) => ({
    name: physioData.timestamps[i],
    hrv: val,
    hr: physioData.restingHR[i]
  })) || [];

  const workloadData = [
    { name: '授课', value: behavioralData?.workload.classHours || 0, color: '#10b981' },
    { name: '会议', value: behavioralData?.workload.meetingHours || 0, color: '#3b82f6' },
    { name: '非教学', value: behavioralData?.workload.nonTeachingTasks || 0, color: '#f59e0b' },
  ];

  // Mock Behavioral Activity Map (Heatmap style)
  const activityMap = [
    { day: 'Mon', morning: 80, afternoon: 60, evening: 40 },
    { day: 'Tue', morning: 70, afternoon: 90, evening: 50 },
    { day: 'Wed', morning: 90, afternoon: 70, evening: 60 },
    { day: 'Thu', morning: 60, afternoon: 80, evening: 70 },
    { day: 'Fri', morning: 50, afternoon: 60, evening: 90 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Chart: Comprehensive Profile */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <Zap size={18} className="text-amber-500" />
            <h3 className="text-sm font-bold text-stone-900">综合心理画像</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#f1f1f1" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#78716c', fontSize: 10 }} />
                <Radar
                  name="当前状态"
                  dataKey="A"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Area Chart: HRV & HR Trend */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-rose-500" />
              <h3 className="text-sm font-bold text-stone-900">生理指标趋势 (HRV/心率)</h3>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1 text-emerald-600"><div className="h-2 w-2 rounded-full bg-emerald-500" /> HRV</span>
              <span className="flex items-center gap-1 text-rose-600"><div className="h-2 w-2 rounded-full bg-rose-500" /> 心率</span>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hrvTrend}>
                <defs>
                  <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="hrv" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHrv)" />
                <Area type="monotone" dataKey="hr" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Psychological Indicator Curves */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity size={18} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-stone-900">心理指标趋势 (测评历史)</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assessmentTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Behavioral Activity Map */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1 bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-blue-500" />
            <h3 className="text-sm font-bold text-stone-900">行为活跃度图谱</h3>
          </div>
          <div className="space-y-4">
            {activityMap.map((item) => (
              <div key={item.day} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-stone-400 w-8">{item.day}</span>
                <div className="flex-1 flex gap-1">
                  <div className="h-4 flex-1 rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${item.morning / 100})` }} title={`Morning: ${item.morning}%`} />
                  <div className="h-4 flex-1 rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${item.afternoon / 100})` }} title={`Afternoon: ${item.afternoon}%`} />
                  <div className="h-4 flex-1 rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${item.evening / 100})` }} title={`Evening: ${item.evening}%`} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-between text-[10px] text-stone-400 font-bold uppercase">
            <span>上午</span>
            <span>下午</span>
            <span>晚上</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workload Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1 bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <Briefcase size={18} className="text-blue-500" />
            <h3 className="text-sm font-bold text-stone-900">工作负荷分布 (周)</h3>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} width={60} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                  {workloadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-stone-50 rounded-2xl flex items-start gap-3">
            <Info size={16} className="text-stone-400 mt-0.5" />
            <p className="text-[11px] text-stone-500 leading-relaxed">
              数据已与教务系统同步。当前工作负荷指数：<span className="font-bold text-stone-900">{behavioralData?.workload.totalWorkloadIndex}</span>。
            </p>
          </div>
        </motion.div>

        {/* Sleep Quality */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <Moon size={18} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-stone-900">睡眠质量监测</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-indigo-50 rounded-2xl">
              <span className="text-[10px] font-bold text-indigo-400 uppercase">平均时长</span>
              <div className="text-xl font-bold text-indigo-900 mt-1">7.2h</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">深睡占比</span>
              <div className="text-xl font-bold text-emerald-900 mt-1">26%</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl">
              <span className="text-[10px] font-bold text-amber-400 uppercase">入睡规律性</span>
              <div className="text-xl font-bold text-amber-900 mt-1">高</div>
            </div>
            <div className="p-4 bg-stone-50 rounded-2xl">
              <span className="text-[10px] font-bold text-stone-400 uppercase">活跃度</span>
              <div className="text-xl font-bold text-stone-900 mt-1">8.2k</div>
            </div>
          </div>
          <div className="mt-6 h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hrvTrend}>
                <Area type="stepAfter" dataKey="hrv" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>


      {/* Assessment History Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={20} className="text-emerald-500" />
            <h3 className="text-lg font-bold text-stone-900">专业测评历史</h3>
          </div>
          <span className="text-xs font-medium text-stone-400">最近 10 次记录</span>
        </div>

        {assessments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-50">
                  <th className="pb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">测评项目</th>
                  <th className="pb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">测评时间</th>
                  <th className="pb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">结果等级</th>
                  <th className="pb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">得分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {assessments.map((item) => (
                  <tr key={item.id} className="group hover:bg-stone-50 transition-colors">
                    <td className="py-4">
                      <span className="text-sm font-bold text-stone-800">{getScaleName(item.type)}</span>
                    </td>
                    <td className="py-4">
                      <span className="text-xs text-stone-500">{new Date(item.timestamp).toLocaleString()}</span>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        item.riskLevel === 'green' ? 'bg-emerald-50 text-emerald-600' :
                        item.riskLevel === 'yellow' ? 'bg-amber-50 text-amber-600' :
                        item.riskLevel === 'orange' ? 'bg-orange-50 text-orange-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {item.level}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="text-sm font-mono font-bold text-stone-600">{item.scores?.total || 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-stone-50 text-stone-300 flex items-center justify-center">
              <ClipboardCheck size={24} />
            </div>
            <p className="text-sm text-stone-400">暂无测评记录</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PsychologicalProfile;
