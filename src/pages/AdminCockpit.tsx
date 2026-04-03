import React, { useState, useMemo, useEffect } from "react";
import { UserProfile, CockpitData, DeidentifiedTracking } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Download, 
  Calendar,
  PieChart as PieChartIcon,
  Layers,
  Filter,
  ChevronDown,
  FileText,
  Activity,
  Sparkles,
  Search,
  ArrowRight,
  ShieldCheck,
  Info,
  X
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
  Legend,
  LabelList
} from "recharts";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { cockpitApi } from "../services/api";

interface AdminCockpitProps {
  profile: UserProfile | null;
}

const AdminCockpit: React.FC<AdminCockpitProps> = ({ profile }) => {
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const [showReportModal, setShowReportModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllTracking, setShowAllTracking] = useState(false);

  const [cockpitData, setCockpitData] = useState<CockpitData>({
    overallIndex: 75,
    warningCount: 0,
    interventionRate: 0,
    resourceEngagement: 0,
    trends: [],
    riskHeatmap: [],
    resourceEfficiency: [],
    drillDownData: [],
    trackingData: [],
    interventionTypeChartData: [],
    suggestions: []
  });

  // const [drillDownData, setDrillDownData] = useState<any[]>([]);
  // const [trackingData, setTrackingData] = useState<DeidentifiedTracking[]>([]);
  // const [suggestions, setSuggestions] = useState<any[]>([]);

  const grades = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];
  const subjects = ["语文", "数学", "英语", "科学", "道法", "音乐", "体育", "美术"];

  useEffect(() => {
    fetchCockpitData();
  }, [timeRange, selectedGroup, selectedSubject, selectedExperience]);

  const fetchCockpitData = async () => {
    try {
      setLoading(true);
      const data = await cockpitApi.getOverview({
        timeRange,
        grade: selectedGroup,
        subject: selectedSubject,
        experience: selectedExperience
      });
      
      setCockpitData(data);
    } catch (error) {
      console.error("获取驾驶舱数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrillDown = useMemo(() => {
    return cockpitData.drillDownData.filter(item => {
      const gradeMatch = selectedGroup === "all" || item.grade === selectedGroup || item.grade === "all";
      const subjectMatch = selectedSubject === "all" || item.subject === selectedSubject || item.subject === "all";
      const expMatch = selectedExperience === "all" || item.experience === selectedExperience || item.experience === "all";
      return gradeMatch && subjectMatch && expMatch;
    });
  }, [selectedGroup, selectedSubject, selectedExperience, cockpitData.drillDownData]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('cockpit-content');
      if (!element) throw new Error("Content not found");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
        removeContainer: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`心理健康评估报告_${new Date().toISOString().split('T')[0]}.pdf`);

      setIsGenerating(false);
      setShowReportModal(false);
    } catch (error) {
      console.error("PDF generation failed:", error);
      setIsGenerating(false);
      alert("报告生成失败，请稍后重试。错误信息：" + (error instanceof Error ? error.message : String(error)));
    }
  };

  const getHeatmapColor = (level: number) => {
    if (level < 30) return "bg-emerald-100 text-emerald-700";
    if (level < 50) return "bg-blue-100 text-blue-700";
    if (level < 70) return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-stone-500">正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto space-y-8 pb-20"
      id="cockpit-content"
    >
      {/* Header & Global Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
            <BarChart3 className="text-purple-600" size={32} />
            紫色评估：校级管理驾驶舱
          </h1>
          <p className="text-stone-500 mt-1">基于大数据可视化技术，提供多层级、多维度全校心理态势分析。</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-stone-100 shadow-sm">
            {["7d", "30d", "90d"].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${timeRange === range ? 'bg-purple-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
              >
                {range === "7d" ? "近7天" : range === "30d" ? "近30天" : "本学期"}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-stone-800 transition-all"
          >
            <FileText size={18} /> 生成分析报告
          </button>
        </div>
      </div>

      {/* Top KPI Indicators (5.1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "整体心理健康指数", value: cockpitData.overallIndex, unit: "", trend: "+2.1%", icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "预警人数 (待处理)", value: cockpitData.warningCount, unit: "人", trend: "-3", icon: Activity, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "干预任务完成率", value: cockpitData.interventionRate, unit: "%", trend: "+5.4%", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "资源活跃参与度", value: cockpitData.resourceEngagement, unit: "%", trend: "+12.8%", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`h-12 w-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                <TrendingUp size={12} className={stat.trend.startsWith('-') ? 'rotate-180' : ''} />
                {stat.trend}
              </div>
            </div>
            <p className="text-sm font-medium text-stone-500">{stat.label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold text-stone-900">{stat.value}</span>
              <span className="text-sm text-stone-400 font-medium">{stat.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Core Indicator Trends (5.1) */}
      <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-stone-900">核心指标趋势曲线</h3>
            <p className="text-sm text-stone-500 mt-1">展示平均焦虑分、平均抑郁分和工具使用率的时序变化</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500" />
              <span className="text-xs text-stone-500">平均焦虑分</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <span className="text-xs text-stone-500">平均抑郁分</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-stone-500">工具使用率</span>
            </div>
          </div>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cockpitData.trends}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#78716c'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#78716c'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="anxiety" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7' }} name="平均焦虑分" />
              <Line type="monotone" dataKey="depression" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} name="平均抑郁分" />
              <Line type="monotone" dataKey="toolUsageRate" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="工具使用率" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 群体心理态势综合分析模块 */}
      <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-stone-900">群体心理态势综合分析</h3>
            <p className="text-sm text-stone-500 mt-1">融合热力图（风险分布）与干预成效追踪（活动效果）</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-stone-400">低风险</span>
              <div className="flex gap-0.5">
                <div className="h-2 w-4 bg-emerald-100 rounded-sm" />
                <div className="h-2 w-4 bg-blue-100 rounded-sm" />
                <div className="h-2 w-4 bg-amber-100 rounded-sm" />
                <div className="h-2 w-4 bg-rose-100 rounded-sm" />
              </div>
              <span className="text-[10px] text-stone-400">高风险</span>
            </div>
            {cockpitData.trackingData.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 rounded-xl border border-stone-100 text-xs font-bold text-stone-500">
                <ShieldCheck size={14} className="text-emerald-500" /> 数据已脱敏
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 热力图 - 风险分布 */}
          <div>
            <h4 className="text-sm font-bold text-stone-700 mb-4">热力图 - 风险分布</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="w-12"></th>
                    {subjects.map(s => (
                      <th key={s} className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-2">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grades.map(g => (
                    <tr key={g}>
                      <td className="text-[10px] font-bold text-stone-600 pr-2">{g}</td>
                      {subjects.map(s => {
                        const level = cockpitData.riskHeatmap.find(h => h.grade === g && h.subject === s)?.riskLevel || 0;
                        return (
                          <td key={s} className="p-0">
                            <motion.div 
                              whileHover={{ scale: 1.05 }}
                              className={`h-12 rounded-xl flex items-center justify-center font-bold text-xs ${getHeatmapColor(level)}`}
                            >
                              {level}%
                            </motion.div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-start gap-2">
              <Info size={14} className="text-stone-400 mt-0.5" />
              <p className="text-[10px] text-stone-500 leading-relaxed">
                热力图显示风险分布情况，颜色越深表示风险越高。
              </p>
            </div>
          </div>
          
          {/* 干预成效追踪 - 活动效果 */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-stone-700">干预成效追踪 - 活动效果</h4>
            
            {/* 干预类型统计图表 */}
            {cockpitData.interventionTypeChartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cockpitData.interventionTypeChartData} layout="vertical" margin={{ left: 0, right: 40, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="type" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#78716c' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value, name, props) => {
                        if (name === '平均改善') {
                          return [`${value}分`, name];
                        }
                        if (name === '样本数') {
                          return [value, name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend verticalAlign="top" align="right" height={36}/>
                    <Bar dataKey="avgImprovement" fill="#10b981" radius={[0, 4, 4, 0]} name="平均改善 (分)" barSize={24}>
                      <LabelList dataKey="avgImprovement" position="right" fill="#78716c" fontSize={12} fontWeight={600} formatter={(value: number) => `${value}分`} />
                    </Bar>
                    <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} name="样本数" barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 bg-stone-50 rounded-2xl border border-stone-100 text-center mb-4">
                <ShieldCheck size={24} className="mx-auto text-stone-300 mb-2" />
                <p className="text-xs text-stone-400">暂无统计数据</p>
              </div>
            )}

            {/* 详细列表 - 可折叠 */}
            {cockpitData.trackingData.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-xs font-bold text-stone-500">详细记录</h5>
                  {cockpitData.trackingData.length > 3 && (
                    <button 
                      onClick={() => setShowAllTracking(!showAllTracking)}
                      className="flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      {showAllTracking ? '收起' : `查看全部 (${cockpitData.trackingData.length})`}
                      <ChevronDown size={12} className={`transition-transform ${showAllTracking ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                <div 
                  className={`space-y-3 ${!showAllTracking && cockpitData.trackingData.length > 3 ? 'max-h-[400px] overflow-y-auto pr-2' : ''}`}
                >
                  {cockpitData.trackingData.map((track, i) => (
                    <div key={track.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase">样本 ID: {track.id}</p>
                          <p className="text-xs font-bold text-stone-900 mt-1">{track.interventionType}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-stone-400 uppercase">改善幅度</p>
                          <p className={`text-lg font-bold ${track.improvement >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {track.improvement >= 0 ? '+' : ''}{track.improvement}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 uppercase">
                        <span>干预前: {track.preScore}</span>
                        <span>→</span>
                        <span>干预后: {track.postScore}</span>
                      </div>
                      <div className="mt-3 h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, track.postScore))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {cockpitData.trackingData.length === 0 && cockpitData.interventionTypeChartData.length === 0 && (
              <div className="p-8 bg-stone-50 rounded-2xl border border-stone-100 text-center">
                <ShieldCheck size={32} className="mx-auto text-stone-300 mb-3" />
                <p className="text-sm text-stone-400">暂无干预成效数据</p>
                <p className="text-xs text-stone-400 mt-1">完成干预任务后会显示效果分析</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resource Efficiency Analysis (5.1) */}
      <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-stone-900">资源效能分析</h3>
            <p className="text-sm text-stone-500 mt-1">统计热门工具使用数据与心理改善效果关联</p>
          </div>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cockpitData.resourceEfficiency}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis dataKey="tool" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#78716c'}} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#78716c'}} />
              <YAxis yAxisId="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#78716c'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value, name) => {
                  if (name === '改善指数') {
                    return [`${value}%`, name];
                  }
                  return [value, name];
                }}
              />
              <Legend verticalAlign="top" align="right" height={36}/>
              <Bar yAxisId="left" dataKey="usage" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="使用频次 (次)" />
              <Bar yAxisId="right" dataKey="improvement" fill="#10b981" radius={[4, 4, 0, 0]} name="改善指数 (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
          <h4 className="text-xs font-bold text-stone-700">算法说明</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-stone-600 leading-relaxed">
            <div>
              <span className="font-bold text-stone-800">使用频次：</span>统计该工具在选定时间范围内的总使用次数。
            </div>
            <div>
              <span className="font-bold text-stone-800">改善指数：</span>基于用户对工具的五星评分计算，计算公式：(平均评分 / 5) × 100%。平均评分取所有用户最新评分的均值。
            </div>
          </div>
        </div>
      </div>



      {/* Detailed Drill-down Analysis (5.1) */}
      <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-xl font-bold text-stone-900">多维度下钻分析</h3>
            <p className="text-sm text-stone-500 mt-1">支持按学科、教龄、年级等多维度查看详细心理指标</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="pl-10 pr-8 py-2 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="all">所有年级</option>
                <option value="一年级">一年级</option>
                <option value="二年级">二年级</option>
                <option value="三年级">三年级</option>
                <option value="四年级">四年级</option>
                <option value="五年级">五年级</option>
                <option value="六年级">六年级</option>
              </select>
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
            </div>
            <div className="relative">
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="pl-10 pr-8 py-2 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="all">所有学科</option>
                <option value="语文">语文</option>
                <option value="数学">数学</option>
                <option value="英语">英语</option>
                <option value="科学">科学</option>
                <option value="道法">道法</option>
                <option value="音乐">音乐</option>
                <option value="体育">体育</option>
                <option value="美术">美术</option>
              </select>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
            </div>
            <div className="relative">
              <select 
                value={selectedExperience}
                onChange={(e) => setSelectedExperience(e.target.value)}
                className="pl-10 pr-8 py-2 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="all">所有教龄</option>
                <option value="0-2">0-2年 (入职适应期)：新锐教师</option>
                <option value="3-5">3-5年 (专业成长期)：菁英教师</option>
                <option value="6-15">6-15年 (经验成熟期)：骨干教师</option>
                <option value="16+">16年以上 (资深发展期)：领航教师</option>
              </select>
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="pb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">分析维度</th>
                <th className="pb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">样本量</th>
                <th className="pb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">平均心理分</th>
                <th className="pb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">预警比例</th>
                <th className="pb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">资源使用率</th>
                <th className="pb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">干预成效</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredDrillDown.map((row, i) => (
                <tr key={i} className="group hover:bg-stone-50 transition-colors">
                  <td className="py-4 font-bold text-stone-900 text-sm">{row.label}</td>
                  <td className="py-4 text-stone-500 text-sm">{row.count}人</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${row.score < 70 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${row.score}%` }} />
                      </div>
                      <span className="text-sm font-bold text-stone-700">{row.score}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${parseInt(row.warning) > 15 ? 'bg-rose-50 text-rose-600' : 'bg-stone-100 text-stone-600'}`}>
                      {row.warning}
                    </span>
                  </td>
                  <td className="py-4 text-stone-600 text-sm">{row.usage}</td>
                  <td className="py-4 text-emerald-600 font-bold text-sm">{row.effect}</td>
                </tr>
              ))}
              {filteredDrillDown.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400 text-sm">暂无匹配的数据分析结果</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Support Suggestions (5.3) */}
      <div className="bg-purple-600 p-10 rounded-[48px] shadow-2xl shadow-purple-100 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start gap-12">
          <div className="h-20 w-20 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles size={40} className="text-purple-100" />
          </div>
          <div className="space-y-8 flex-1">
            <div>
              <h3 className="text-2xl font-bold mb-2">AI 决策支持建议</h3>
              <p className="text-purple-100 text-sm leading-relaxed max-w-2xl">
                基于全校多维度数据关联分析，系统自动识别出以下突出问题及根因，并提供可操作的管理建议：
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cockpitData.suggestions.map((suggestion, index) => (
                <motion.div 
                  key={index}
                  whileHover={{ y: -5 }}
                  className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-2 w-2 rounded-full ${suggestion.type === 'risk' ? 'bg-rose-400' : suggestion.type === 'efficiency' ? 'bg-blue-400' : suggestion.type === 'intervention' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <p className="text-sm font-bold">{suggestion.title}</p>
                  </div>
                  <p className="text-xs text-purple-50 leading-relaxed mb-4">
                    <span className="font-bold">根因分析：</span> {suggestion.rootCause}
                  </p>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-[10px] font-bold text-purple-200 uppercase mb-1">管理建议</p>
                    <p className="text-xs text-white">{suggestion.suggestion}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-20 -bottom-20 h-80 w-80 bg-purple-500 rounded-full blur-[100px] opacity-50" />
        <div className="absolute -left-20 -top-20 h-64 w-64 bg-indigo-500 rounded-full blur-[100px] opacity-30" />
      </div>

      {/* Report Generation Modal (5.2) */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowReportModal(false)} 
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-purple-50">
                <div>
                  <h2 className="text-2xl font-bold text-purple-900">生成阶段性心理健康报告</h2>
                  <p className="text-purple-600 text-xs mt-1">支持按时间范围、群体维度进行定制化导出</p>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-white/50 rounded-xl transition-colors">
                  <X size={24} className="text-purple-400" />
                </button>
              </div>
              
              <div className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">报告时间范围</label>
                    <div className="relative">
                      <select className="w-full pl-10 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-purple-500/20">
                        <option>2026年第一季度</option>
                        <option>2026年3月</option>
                        <option>本学期至今</option>
                      </select>
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">分析群体筛选</label>
                    <div className="relative">
                      <select className="w-full pl-10 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-purple-500/20">
                        <option>全校教师</option>
                        <option>六年级年级组</option>
                        <option>青年教师 (教龄 &lt; 3年)</option>
                      </select>
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">包含分析模块</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      "KPI 指标概览", "心理态势趋势图", "风险分布热力图", 
                      "干预成效追踪", "资源效能分析", "管理决策建议"
                    ].map(module => (
                      <label key={module} className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100 cursor-pointer hover:bg-white hover:border-purple-200 transition-all">
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded-lg border-stone-200 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm font-bold text-stone-700">{module}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-stone-50 flex justify-end gap-4">
                <button onClick={() => setShowReportModal(false)} className="px-8 py-3 text-stone-500 font-bold">取消</button>
                <button 
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="px-12 py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-200 flex items-center gap-2 hover:bg-purple-700 transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                      <Activity size={18} />
                    </motion.div>
                  ) : <Download size={18} />}
                  {isGenerating ? "正在生成报告..." : "确认导出 PDF 报告"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminCockpit;
