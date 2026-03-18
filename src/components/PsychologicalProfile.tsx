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
        
        // 计算行为数据
        const loginFrequency = calculateLoginFrequency();
        const toolUsageMinutes = calculateToolUsageMinutes(toolUsageData);
        const communityInteractions = 0; // 默认值，因为社区统计API不存在
        
        setBehavioralData({
          loginFrequency: loginFrequency,
          toolUsageMinutes: toolUsageMinutes,
          communityInteractions: communityInteractions,
          workload: workload
        });

        setAssessments(assessmentsData || []);

      } catch (err) {
        console.error("Error fetching profile data:", err);
        // 错误时使用默认数据
        setBehavioralData({
          loginFrequency: 5,
          toolUsageMinutes: 30,
          communityInteractions: 3,
          workload: {
            classHours: 12,
            meetingHours: 5,
            nonTeachingTasks: 8,
            totalWorkloadIndex: 65
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  // 计算登录频率
  const calculateLoginFrequency = () => {
    const today = new Date().toISOString().split('T')[0];
    const loginKey = `login_${today}`;
    return parseInt(localStorage.getItem(loginKey) || '0');
  };

  // 计算工具使用时长
  const calculateToolUsageMinutes = (toolUsageData: any[]) => {
    if (!toolUsageData || toolUsageData.length === 0) return 0;
    return toolUsageData.reduce((total, usage) => total + (usage.duration || 0), 0) / 60;
  };

  // 计算社区互动次数
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

  // 生成行为活跃度图谱数据
  const generateActivityMap = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days.map(day => {
      // 基于工具使用时长和社区互动生成活跃度数据
      const baseActivity = behavioralData?.toolUsageMinutes || 30;
      const communityActivity = behavioralData?.communityInteractions || 3;
      
      // 生成随机但有规律的活跃度数据
      return {
        day,
        morning: Math.min(100, Math.floor(baseActivity * 0.3 + communityActivity * 2 + Math.random() * 20)),
        afternoon: Math.min(100, Math.floor(baseActivity * 0.4 + communityActivity * 3 + Math.random() * 30)),
        evening: Math.min(100, Math.floor(baseActivity * 0.3 + communityActivity * 1 + Math.random() * 25)),
      };
    });
  };

  const activityMap = generateActivityMap();

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
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-rose-500" />
              <h3 className="text-sm font-bold text-stone-900 whitespace-nowrap">生理指标趋势</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1 text-emerald-600"><div className="h-2 w-2 rounded-full bg-emerald-500" /> HRV</span>
              <span className="flex items-center gap-1 text-rose-600"><div className="h-2 w-2 rounded-full bg-rose-500" /> 心率</span>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hrvTrend} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} width={30} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                  activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                  trigger="both"
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
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-stone-900 whitespace-nowrap">心理指标趋势</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assessmentTrend} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} width={30} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                  activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                  trigger="both"
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
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={18} className="text-blue-500" />
            <h3 className="text-sm font-bold text-stone-900 whitespace-nowrap">工作负荷分布</h3>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 11 }} width={45} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  trigger="both"
                />
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
          <div className="space-y-2">
            {assessments.map((item) => (
              <div key={item.id} className="bg-stone-50 rounded-lg p-2 hover:bg-stone-100 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-stone-900 truncate">{getScaleName(item.type)}</div>
                  </div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${
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
                  <div className="text-stone-600 font-mono font-bold">{item.scores?.total || 0} 分</div>
                </div>
              </div>
            ))}
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
