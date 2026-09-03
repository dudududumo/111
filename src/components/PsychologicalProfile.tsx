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
import { chartTheme, chartGradients, barRadius } from "./ui/chartTheme";

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
      
      let communityData: any = null;
      
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
        
        setBehavioralData({
          loginFrequency: loginFrequency,
          toolUsageMinutes: toolUsageMinutes,
          communityInteractions: 0,
          workload: workload
        });

        setAssessments(assessmentsData || []);
        
        setLoading(false);
        
        try {
          const communityRes = await fetch(`/api/community/my-stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          communityData = await communityRes.json();
          const communityInteractions = calculateCommunityInteractions(communityData);
          
          setBehavioralData(prev => prev ? {
            ...prev,
            communityInteractions: communityInteractions
          } : prev);
        } catch (communityErr) {
          console.log("Community stats not available yet:", communityErr);
        }

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

  const assessmentTrend = [...assessments]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(a => ({
      date: new Date(a.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      score: a.scores?.total || 0,
      type: a.type,
      typeName: getScaleName(a.type)
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
    ? [...physioData.history]
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item: any) => ({
          name: item.date ? new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '未知',
          hrv: item.hrv,
          hr: item.restingHR || 70
        })).filter((item: any) => item.hrv !== null && item.hrv !== undefined)
    : [];

  const workloadData = [
    { name: '授课', value: behavioralData?.workload.classHours || 0, color: '#9ac73b' },
    { name: '会议', value: behavioralData?.workload.meetingHours || 0, color: '#8bb335' },
    { name: '非教学', value: behavioralData?.workload.nonTeachingTasks || 0, color: '#d7e9b1' },
  ];

  const activityData = [
    { name: '工具使用', value: behavioralData?.toolUsageMinutes ? Math.min(100, Math.floor((behavioralData.toolUsageMinutes / 60) * 100)) : 0, color: '#8bb335' },
    { name: '社群参与', value: behavioralData?.communityInteractions || 0, color: '#9ac73b' },
  ];

  const sleepData = (physioData?.history && Array.isArray(physioData.history) && physioData.history.length > 0)
    ? [...physioData.history]
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item: any) => ({
          name: item.date ? new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '未知',
          sleepDuration: item.sleepDuration || 0,
          deepSleepRatio: item.deepSleepRatio || 0
        })).filter((item: any) => item.sleepDuration > 0 || item.deepSleepRatio > 0)
    : [];

  const getScaleColor = (type: string) => {
    const colors: Record<string, string> = {
      scl90: '#9ac73b', // 绿色测评
      sas: '#0095da',   // 蓝色调适
      sds: '#f08120',   // 橙色干预
      mbi: '#e84052',   // 红色预警
      phq9: '#d464a2',  // 紫色评估
      gad7: '#d464a2'
    };
    return colors[type] || '#9ca3af';
  };

  const uniqueDates = [...new Set(assessmentTrend.map(item => item.date))];
  const uniqueTypes = [...new Set(assessmentTrend.map(item => item.type))];
  
  const multiLineData = uniqueDates.map(date => {
    const dataPoint: any = { date };
    uniqueTypes.forEach(type => {
      const item = assessmentTrend.find(a => a.date === date && a.type === type);
      if (item) {
        dataPoint[type] = item.score;
      }
    });
    return dataPoint;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-meadow-500" />
            <h3 className="text-sm font-semibold text-ink-800">综合心理画像</h3>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <PolarGrid stroke={chartTheme.grid.stroke} />
                <PolarAngleAxis dataKey="subject" tick={chartTheme.axis.tick} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="当前状态"
                  dataKey="A"
                  stroke="#9ac73b"
                  strokeWidth={2}
                  fill="#9ac73b"
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
          className="lg:col-span-2 glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-meadow-600" />
              <h3 className="text-sm font-semibold text-ink-800">生理指标趋势</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-meadow-600"><div className="h-2 w-2 rounded-full bg-meadow-500" /> HRV</span>
              <span className="flex items-center gap-1 text-meadow-700"><div className="h-2 w-2 rounded-full bg-meadow-700" /> 心率</span>
            </div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hrvTrend} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                {chartGradients("colorHrv", "#9ac73b", "#9ac73b")}
                <CartesianGrid {...chartTheme.grid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={chartTheme.axis.tick} />
                <YAxis axisLine={false} tickLine={false} tick={chartTheme.axis.tick} width={35} />
                <Tooltip 
                  contentStyle={chartTheme.tooltip.contentStyle}
                  cursor={{ fill: 'rgba(154, 199, 59, 0.05)' }}
                />
                <Area type="monotone" dataKey="hrv" stroke="#9ac73b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHrv)" />
                <Area type="monotone" dataKey="hr" stroke="#8bb335" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
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
          className="lg:col-span-2 glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-meadow-500" />
              <h3 className="text-sm font-semibold text-ink-800">心理指标趋势</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold">
              {uniqueTypes.map(type => (
                <span key={type} className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getScaleColor(type) }} /> 
                  {getScaleName(type).split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={multiLineData} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid {...chartTheme.grid} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={chartTheme.axis.tick} />
                <YAxis axisLine={false} tickLine={false} tick={chartTheme.axis.tick} width={35} />
                <Tooltip 
                  contentStyle={chartTheme.tooltip.contentStyle}
                  formatter={(value: number, name: string) => [value, getScaleName(name)]}
                />
                {uniqueTypes.map(type => (
                  <Area 
                    key={type}
                    type="monotone" 
                    dataKey={type} 
                    stroke={getScaleColor(type)} 
                    strokeWidth={2.5} 
                    fill="transparent"
                    connectNulls={true}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-meadow-600" />
            <h3 className="text-sm font-semibold text-ink-800">行为活跃度</h3>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} layout="vertical" margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid {...chartTheme.grid} />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={chartTheme.axis.tick} width={35} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={chartTheme.axis.tick} width={55} />
                <Tooltip 
                  contentStyle={chartTheme.tooltip.contentStyle}
                  cursor={{ fill: 'rgba(154, 199, 59, 0.05)' }}
                />
                <Bar dataKey="value" radius={barRadius} barSize={28}>
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-meadow-600" />
              <span className="text-xs text-ink-500">工具使用</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-meadow-500" />
              <span className="text-xs text-ink-500">社群参与</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={16} className="text-meadow-600" />
            <h3 className="text-sm font-semibold text-ink-800">工作负荷分布</h3>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} layout="vertical" margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid {...chartTheme.grid} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={chartTheme.axis.tick} width={40} />
                <Tooltip 
                  contentStyle={chartTheme.tooltip.contentStyle}
                  cursor={{ fill: 'rgba(154, 199, 59, 0.05)' }}
                />
                <Bar dataKey="value" radius={barRadius} barSize={24}>
                  {workloadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 p-3 bg-frost-50 rounded-xl flex items-start gap-2">
            <Info size={14} className="text-ink-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-ink-500 leading-relaxed">
              当前工作负荷指数：<span className="font-semibold text-ink-800">
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
          className="lg:col-span-2 glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Moon size={16} className="text-meadow-600" />
              <h3 className="text-sm font-semibold text-ink-800">睡眠质量监测</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-meadow-700"><div className="h-2 w-2 rounded-full bg-meadow-700" /> 睡眠时长(h)</span>
              <span className="flex items-center gap-1 text-meadow-500"><div className="h-2 w-2 rounded-full bg-meadow-500" /> 深睡占比(%)</span>
            </div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleepData} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid {...chartTheme.grid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={chartTheme.axis.tick} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={chartTheme.axis.tick} width={35} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={chartTheme.axis.tick} width={35} />
                <Tooltip 
                  contentStyle={chartTheme.tooltip.contentStyle}
                  cursor={{ fill: 'rgba(154, 199, 59, 0.05)' }}
                />
                <Bar yAxisId="left" dataKey="sleepDuration" fill="#8bb335" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar yAxisId="right" dataKey="deepSleepRatio" fill="#9ac73b" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-meadow-500" />
            <h3 className="text-base font-semibold text-ink-800">专业测评历史</h3>
          </div>
        </div>

        {assessments.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {assessments.map((item) => (
              <div key={item.id} className="bg-frost-50 rounded-lg p-3 hover:bg-frost-100 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-ink-800 truncate">{getScaleName(item.type)}</div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                    item.risk_level === 'green' ? 'bg-meadow-50 text-meadow-600' :
                    item.risk_level === 'yellow' ? 'bg-amber-50 text-amber-600' :
                    item.risk_level === 'orange' ? 'bg-orange-50 text-orange-600' :
                    'bg-coral-50 text-coral-600'
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
                  <div className="text-ink-500">
                    {new Date(item.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-ink-600 font-mono font-semibold">{item.scores?.total || 0} 分</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-xl bg-frost-100 text-ink-400 flex items-center justify-center">
              <ClipboardCheck size={20} />
            </div>
            <p className="text-sm text-ink-400">暂无测评记录</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PsychologicalProfile;
