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
        const [physioRes, workloadRes, assessmentRes, toolUsageRes] = await Promise.all([
          fetch(`/api/physiological/${profile.uid}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch(`/api/workload/${profile.uid}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch(`/api/assessments/my`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch(`/api/tool-usage/my`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
        ]);
        
        const physio = await physioRes.json();
        const workload = await workloadRes.json();
        const assessmentsData = await assessmentRes.json();
        const toolUsageData = await toolUsageRes.json();
        
        setPhysioData(physio);
        
        const loginFrequency = calculateLoginFrequency();
        const toolUsageMinutes = calculateToolUsageMinutes(toolUsageData);
        const communityInteractions = 0;
        
        setBehavioralData({
          loginFrequency: loginFrequency,
          toolUsageMinutes: toolUsageMinutes,
          communityInteractions: communityInteractions,
          workload: workload
        });

        setAssessments(assessmentsData || []);

      } catch (err) {
        console.error("Error fetching profile data:", err);
        setBehavioralData({
          loginFrequency: 5,
          toolUsageMinutes: 30,
          communityInteractions: 3,
          workload: {
            classHours: 0,
            meetingHours: 0,
            nonTeachingTasks: 0,
            totalWorkloadIndex: 0
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const calculateLoginFrequency = () => {
    const today = new Date().toISOString().split('T')[0];
    const loginKey = `login_${today}`;
    return parseInt(localStorage.getItem(loginKey) || '0');
  };

  const calculateToolUsageMinutes = (toolUsageData: any[]) => {
    if (!toolUsageData || toolUsageData.length === 0) return 0;
    return toolUsageData.reduce((total, usage) => total + (usage.duration || 0), 0) / 60;
  };

  const calculateCommunityInteractions = (communityData: any) => {
    if (!communityData) return 0;
    return (communityData.posts || 0) + (communityData.likes || 0) + (communityData.comments || 0);
  };

  if (loading) return <div className="h-64 flex items-center justify-center">加载动态档案中...</div>;

  const getScaleName = (id: string) => {
    const names: Record<string, string> = {
      scl90: "SCL-90 症状自评量表",
      sas: "SAS 焦虑自评量表",
      sds: "SDS 抑郁自评量表",
      mbi: "MBI 教师职业倦怠量表",
      phq9: "PHQ-9 抑郁症筛查量表",
      gad7: "GAD-7 广泛性焦虑量表"
    };
    return names[id] || id;
  };

  const assessmentTrend = [...assessments].reverse().map(a => ({
    date: new Date(a.timestamp).toLocaleDateString(),
    score: a.scores?.total || 0,
    type: getScaleName(a.type)
  }));

  const calculateRadarData = () => {
    let emotionalState = 50;
    if (physioData?.hrv) {
      emotionalState = Math.min(100, Math.max(20, Math.floor((physioData.hrv / 50) * 100)));
    }
    
    let stressLevel = 50;
    if (behavioralData?.workload.totalWorkloadIndex !== null && behavioralData?.workload.totalWorkloadIndex !== undefined) {
      stressLevel = Math.min(100, Math.max(20, 100 - behavioralData.workload.totalWorkloadIndex));
    }
    
    let resilience = 50;
    if (physioData?.sleepDuration && physioData?.deepSleepRatio) {
      const sleepScore = Math.min(100, Math.max(0, (physioData.sleepDuration / 8) * 100));
      const deepSleepScore = Math.min(100, Math.max(0, (physioData.deepSleepRatio / 30) * 100));
      resilience = Math.floor((sleepScore + deepSleepScore) / 2);
    } else if (physioData?.sleepDuration) {
      resilience = Math.min(100, Math.max(0, Math.floor((physioData.sleepDuration / 8) * 100)));
    } else if (physioData?.deepSleepRatio) {
      resilience = Math.min(100, Math.max(0, Math.floor((physioData.deepSleepRatio / 30) * 100)));
    }
    
    let socialConnection = 50;
    if (behavioralData?.toolUsageMinutes) {
      socialConnection = Math.min(100, Math.max(20, Math.floor((behavioralData.toolUsageMinutes / 60) * 100)));
    }
    
    let professionalAchievement = 50;
    if (behavioralData?.loginFrequency) {
      professionalAchievement = Math.min(100, Math.max(20, Math.floor((behavioralData.loginFrequency / 7) * 100)));
    }
    
    return [
      { subject: '情绪状态', A: emotionalState, fullMark: 100 },
      { subject: '压力水平', A: stressLevel, fullMark: 100 },
      { subject: '恢复力', A: resilience, fullMark: 100 },
      { subject: '社会连接', A: socialConnection, fullMark: 100 },
      { subject: '职业成就', A: professionalAchievement, fullMark: 100 },
    ];
  };

  const radarData = calculateRadarData();

  const hrvTrend = (physioData?.history && Array.isArray(physioData.history) && physioData.history.length > 0) 
    ? physioData.history.map((item: any) => ({
        name: item.date ? new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '未知',
        hrv: item.hrv,
        hr: item.restingHR || 70
      })).filter((item: any) => item.hrv !== null && item.hrv !== undefined)
    : [];

  const workloadData = [
    { name: '授课', value: behavioralData?.workload.classHours || 0, color: '#10b981' },
    { name: '会议', value: behavioralData?.workload.meetingHours || 0, color: '#059669' },
    { name: '非教学', value: behavioralData?.workload.nonTeachingTasks || 0, color: '#34d399' },
  ];

  const activityData = [
    { name: '工具使用', value: behavioralData?.toolUsageMinutes ? Math.min(100, Math.floor((behavioralData.toolUsageMinutes / 60) * 100)) : 0, color: '#059669' },
    { name: '社群参与', value: behavioralData?.communityInteractions || 0, color: '#10b981' },
  ];

  const sleepData = (physioData?.history && Array.isArray(physioData.history) && physioData.history.length > 0)
    ? physioData.history.map((item: any) => ({
        name: item.date ? new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '未知',
        sleepDuration: item.sleepDuration || 0,
        deepSleepRatio: item.deepSleepRatio || 0
      })).filter((item: any) => item.sleepDuration > 0 || item.deepSleepRatio > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[24px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-stone-800">综合心理画像</h3>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <PolarGrid stroke="#e7e5e4" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#78716c', fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="当前状态"
                  dataKey="A"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="#10b981"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-stone-800">生理指标趋势</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-emerald-600"><div className="h-2 w-2 rounded-full bg-emerald-500" /> HRV</span>
              <span className="flex items-center gap-1 text-emerald-700"><div className="h-2 w-2 rounded-full bg-emerald-700" /> 心率</span>
            </div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hrvTrend} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} width={35} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                />
                <Area type="monotone" dataKey="hrv" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHrv)" />
                <Area type="monotone" dataKey="hr" stroke="#059669" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-stone-800">心理指标趋势</h3>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assessmentTrend} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} width={35} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(5, 150, 105, 0.05)' }}
                />
                <Area type="monotone" dataKey="score" stroke="#059669" strokeWidth={2.5} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-[24px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-stone-800">行为活跃度</h3>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} layout="vertical" margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f5f5f4" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} width={35} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 11 }} width={55} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-emerald-700" />
              <span className="text-xs text-stone-500">工具使用</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-emerald-500" />
              <span className="text-xs text-stone-500">社群参与</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-[24px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={16} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-stone-800">工作负荷分布</h3>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} layout="vertical" margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f5f5f4" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 11 }} width={40} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {workloadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 p-3 bg-stone-50 rounded-xl flex items-start gap-2">
            <Info size={14} className="text-stone-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-stone-500 leading-relaxed">
              当前工作负荷指数：<span className="font-semibold text-stone-800">
                {behavioralData?.workload.totalWorkloadIndex !== null && behavioralData?.workload.totalWorkloadIndex !== undefined 
                  ? behavioralData.workload.totalWorkloadIndex 
                  : '-'}
              </span>
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Moon size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-stone-800">睡眠质量监测</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-emerald-700"><div className="h-2 w-2 rounded-full bg-emerald-700" /> 睡眠时长(h)</span>
              <span className="flex items-center gap-1 text-emerald-500"><div className="h-2 w-2 rounded-full bg-emerald-500" /> 深睡占比(%)</span>
            </div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleepData} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} width={35} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} width={35} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                />
                <Bar yAxisId="left" dataKey="sleepDuration" fill="#059669" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar yAxisId="right" dataKey="deepSleepRatio" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white p-6 rounded-[24px] border border-stone-100 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-emerald-500" />
            <h3 className="text-base font-semibold text-stone-800">专业测评历史</h3>
          </div>
        </div>

        {assessments.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {assessments.map((item) => (
              <div key={item.id} className="bg-stone-50 rounded-lg p-3 hover:bg-stone-100 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-stone-800 truncate">{getScaleName(item.type)}</div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                    item.risk_level === 'green' ? 'bg-emerald-50 text-emerald-600' :
                    item.risk_level === 'yellow' ? 'bg-amber-50 text-amber-600' :
                    item.risk_level === 'orange' ? 'bg-orange-50 text-orange-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {item.type === 'scl90' ? (
                      item.risk_level === 'green' ? '正常' : 
                      item.risk_level === 'yellow' ? '轻度症状' : 
                      item.risk_level === 'orange' ? '中度症状' : 
                      item.risk_level === 'red' ? '重度症状' : '正常'
                    ) : (
                      item.risk_level === 'green' ? '正常' : 
                      item.risk_level === 'blue' ? '轻度' : 
                      item.risk_level === 'yellow' ? '中度' : 
                      item.risk_level === 'orange' ? '重度' : '危急'
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="text-stone-500">
                    {new Date(item.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-stone-600 font-mono font-semibold">{item.scores?.total || 0} 分</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-xl bg-stone-50 text-stone-300 flex items-center justify-center">
              <ClipboardCheck size={20} />
            </div>
            <p className="text-sm text-stone-400">暂无测评记录</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PsychologicalProfile;
