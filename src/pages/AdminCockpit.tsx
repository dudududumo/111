import React, { useState, useMemo, useEffect } from "react";
import { UserProfile, CockpitData, DeidentifiedTracking } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Target, 
  Layers,
  ChevronDown,
  Activity,
  ShieldCheck,
  Info
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

import { cockpitApi } from "../services/api";
import PageContainer from "../components/layout/PageContainer";
import { PageHeader, GlassCard } from "../components/ui";
import { chartTheme, chartGradients, barRadius } from "../components/ui/chartTheme";

interface AdminCockpitProps {
  profile: UserProfile | null;
}

const AdminCockpit: React.FC<AdminCockpitProps> = ({ profile }) => {
  const [selectedDimension, setSelectedDimension] = useState("grade");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAllTracking, setShowAllTracking] = useState(false);
  const [chartScrollRef, setChartScrollRef] = useState<HTMLDivElement | null>(null);

  const [cockpitData, setCockpitData] = useState<CockpitData>({
    overallIndex: 0,
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
  const subjects = ["语文", "数学", "英语", "科学", "道法", "音乐", "体育", "美术", "信息科技", "心理健康"];

  useEffect(() => {
    fetchCockpitData();
  }, []);

  useEffect(() => {
    if (chartScrollRef) {
      chartScrollRef.scrollLeft = chartScrollRef.scrollWidth;
    }
  }, [cockpitData.trends, chartScrollRef]);

  const fetchCockpitData = async () => {
    try {
      setLoading(true);
      const data = await cockpitApi.getOverview();
      setCockpitData(data);
    } catch (error) {
      console.error('获取驾驶舱数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据选择的维度过滤下钻分析数据
  const filteredDrillDown = useMemo(() => {
    if (!cockpitData.drillDownData) return [];
    
    // 根据选择的维度进行过滤
    if (selectedDimension === 'grade') {
      // 按年级维度：只显示年级数据（grade 有值，subject 和 experience 为'all'）
      return cockpitData.drillDownData.filter(item => 
        item.grade !== 'all' && item.subject === 'all' && item.experience === 'all'
      );
    } else if (selectedDimension === 'subject') {
      // 按学科维度：只显示学科数据（subject 有值，grade 和 experience 为'all'）
      return cockpitData.drillDownData.filter(item => 
        item.grade === 'all' && item.subject !== 'all' && item.experience === 'all'
      );
    } else if (selectedDimension === 'experience') {
      // 按教龄维度：只显示教龄数据（experience 有值，grade 和 subject 为'all'）
      return cockpitData.drillDownData.filter(item => 
        item.grade === 'all' && item.subject === 'all' && item.experience !== 'all'
      );
    }
    
    return cockpitData.drillDownData;
  }, [selectedDimension, cockpitData.drillDownData]);

  const getHeatmapColor = (level: number) => {
    if (level < 30) return "bg-iris-100 text-iris-700";
    if (level < 50) return "bg-iris-200 text-iris-700";
    if (level < 70) return "bg-iris-500 text-white";
    return "bg-iris-600 text-white";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iris-600 mx-auto mb-4"></div>
          <p className="text-ink-500">正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div id="cockpit-content" className="space-y-6">
          <PageHeader
            title="紫色评估：校级管理驾驶舱"
            subtitle="基于大数据可视化技术，提供多层级、多维度全校心理态势分析"
            actions={<div className="flex flex-wrap items-center gap-3"></div>}
          />

          {/* Top KPI Indicators (5.1) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: "整体心理健康指数", value: cockpitData.overallIndex, unit: "", icon: Target, bg: "from-iris-500 to-iris-600" },
              { label: "预警人数 (待完成)", value: cockpitData.warningCount, unit: "人", icon: Activity, bg: "from-coral-500 to-coral-600" },
              { label: "干预任务完成率", value: cockpitData.interventionRate, unit: "%", icon: ShieldCheck, bg: "from-ink-800 to-ink-900" },
              { label: "资源活跃参与度", value: cockpitData.resourceEngagement, unit: "%", icon: Users, bg: "from-iris-500 to-iris-600" },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="h-full"
              >
                <GlassCard className="p-4 sm:p-6 h-full">
                  <div className="mb-3 sm:mb-4">
                    <div className={`p-2 sm:p-3 bg-gradient-to-br ${stat.bg} rounded-xl sm:rounded-2xl w-fit`}>
                      <stat.icon size={16} className="sm:w-6 sm:h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-sm font-medium text-ink-500">{stat.label}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl sm:text-3xl font-bold text-ink-900">{stat.value}</span>
                    <span className="text-xs sm:text-sm text-ink-400 font-medium">{stat.unit}</span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Core Indicator Trends (5.1) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-ink-900">核心指标趋势曲线</h3>
                  <p className="text-xs sm:text-sm text-ink-500 mt-1">展示心理健康分、预警率和工具使用率的时序变化</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-2 sm:h-3 w-2 sm:w-3 rounded-full bg-iris-500" />
                    <span className="text-[10px] sm:text-xs text-ink-500">心理健康分</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-2 sm:h-3 w-2 sm:w-3 rounded-full bg-coral-500" />
                    <span className="text-[10px] sm:text-xs text-ink-500">预警率</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-2 sm:h-3 w-2 sm:w-3 rounded-full bg-ink-900" />
                    <span className="text-[10px] sm:text-xs text-ink-500">工具使用率</span>
                  </div>
                </div>
              </div>
              <div ref={setChartScrollRef} className="h-64 sm:h-80 w-full overflow-x-auto">
                <div className="min-w-[800px] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cockpitData.trends}>
                      <CartesianGrid {...chartTheme.grid} />
                      <XAxis dataKey="date" dy={10} {...chartTheme.axis} />
                      <YAxis {...chartTheme.axis} />
                      <Tooltip {...chartTheme.tooltip} />
                      <Line type="monotone" dataKey="healthScore" stroke="#d464a2" strokeWidth={3} dot={{ r: 4, fill: '#d464a2' }} name="心理健康分" />
                      <Line type="monotone" dataKey="warningRate" stroke="#e84052" strokeWidth={3} dot={{ r: 4, fill: '#e84052' }} name="预警率 (%)" />
                      <Line type="monotone" dataKey="toolUsageRate" stroke="#111827" strokeWidth={3} dot={{ r: 4, fill: '#111827' }} name="工具使用率 (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-white rounded-xl border border-iris-100 flex items-start gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-iris-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Info size={8} className="sm:w-2.5 sm:h-2.5 text-iris-600" />
                </div>
                <div className="text-[10px] sm:text-[11px] text-ink-600 leading-relaxed">
                  <p>心理健康分：基于SCL-90评估数据计算，分数越高表示心理健康状况越好（0-100分）。</p>
                  <p>预警率：每天的预警数量占教师总数的百分比。</p>
                  <p>工具使用率：每天使用工具的教师占教师总数的百分比。</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* 群体心理态势综合分析模块 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-ink-900">群体心理态势综合分析</h3>
                  <p className="text-xs sm:text-sm text-ink-500 mt-1">融合热力图（风险分布）与干预成效追踪（活动效果）</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  {cockpitData.trackingData && cockpitData.trackingData.length > 0 && (
                    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-iris-50 rounded-xl border border-iris-100 text-[10px] sm:text-xs font-bold text-iris-600">
                      <ShieldCheck size={10} className="sm:w-3.5 sm:h-3.5 text-iris-500" /> 数据已脱敏
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                {/* 热力图 - 风险分布 */}
                <div className="space-y-4 sm:space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-ink-700">热力图 - 风险分布</h4>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] sm:text-[11px] sm:text-xs text-ink-400">低风险</span>
                      <div className="flex gap-0.5">
                        <div className="h-1.5 sm:h-2 w-3 sm:w-4 bg-iris-100 rounded-sm" />
                        <div className="h-1.5 sm:h-2 w-3 sm:w-4 bg-iris-200 rounded-sm" />
                        <div className="h-1.5 sm:h-2 w-3 sm:w-4 bg-iris-500 rounded-sm" />
                        <div className="h-1.5 sm:h-2 w-3 sm:w-4 bg-iris-600 rounded-sm" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] sm:text-xs text-ink-400">高风险</span>
                    </div>
                  </div>
                  <div className="h-64 sm:h-64 mt-4 sm:mt-10">
                    <div className="w-full h-full flex items-center justify-center">
                      <table className="border-separate border-spacing-1 sm:border-spacing-2">
                        <thead>
                          <tr>
                            <th className="w-6 sm:w-10"></th>
                            {subjects.map(s => (
                              <th key={s} className="text-[10px] sm:text-[11px] font-bold text-ink-400 uppercase tracking-widest pb-1 sm:pb-2 w-7 sm:w-12">{s}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {grades.map(g => (
                            <tr key={g}>
                              <td className="text-[10px] sm:text-[11px] font-bold text-ink-600 pr-1 sm:pr-2 whitespace-nowrap">{g}</td>
                              {subjects.map(s => {
                                const level = cockpitData.riskHeatmap && cockpitData.riskHeatmap.find(h => h.grade === g && h.subject === s)?.riskLevel || 0;
                                return (
                                  <td key={s} className="p-0">
                                    <motion.div 
                                      whileHover={{ scale: 1.05 }}
                                      className={`h-6 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-[10px] sm:text-[11px] ${getHeatmapColor(level)}`}
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
                  </div>
                  <div className="mt-4 sm:mt-10 p-2.5 sm:p-4 bg-white rounded-xl border border-iris-100 flex items-start gap-2">
                    <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-iris-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Info size={7} className="sm:w-2.5 sm:h-2.5 text-iris-600" />
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-ink-600 leading-relaxed">
                      热力图显示风险分布情况，颜色越深表示风险越高。
                    </p>
                  </div>
                </div>
                
                {/* 干预成效追踪 - 活动效果 */}
                <div className="space-y-6 sm:space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-ink-700">干预成效追踪 - 活动效果</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-ink-900 rounded-sm" />
                        <span className="text-[10px] sm:text-xs text-ink-500">平均改善 (分)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-iris-500 rounded-sm" />
                        <span className="text-[10px] sm:text-xs text-ink-500">样本数</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 干预类型统计图表 */}
                  {cockpitData.interventionTypeChartData && cockpitData.interventionTypeChartData.length > 0 ? (
                    <div className="h-56 sm:h-64 w-full mt-8 sm:mt-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cockpitData.interventionTypeChartData} layout="vertical" margin={{ left: -10, right: 20, top: 10, bottom: 10 }}>
                          <CartesianGrid horizontal={false} {...chartTheme.grid} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="type" type="category" width={55} {...chartTheme.axis} />
                          <Tooltip 
                            {...chartTheme.tooltip}
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
                          <Bar dataKey="avgImprovement" fill="#111827" radius={[0, 4, 4, 0]} name="平均改善 (分)" barSize={25}>
                            <LabelList dataKey="avgImprovement" position="right" fill="#6b7280" fontSize={9} fontWeight={600} formatter={(value: number) => `${value}分`} />
                          </Bar>
                          <Bar dataKey="count" fill="#d464a2" radius={[0, 4, 4, 0]} name="样本数" barSize={25} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 sm:h-64 p-6 sm:p-8 bg-iris-50 rounded-2xl border border-iris-100 flex flex-col items-center justify-center mt-8 sm:mt-10">
                      <ShieldCheck size={24} className="sm:w-8 sm:h-8 text-iris-200 mb-3" />
                      <p className="text-xs sm:text-sm text-ink-400">暂无干预成效数据</p>
                      <p className="text-[10px] sm:text-xs text-ink-400 mt-1">完成干预任务后会显示效果分析</p>
                    </div>
                  )}
                  <div className="mt-8 sm:mt-10 p-3 sm:p-4 bg-white rounded-xl border border-iris-100 flex items-start gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-iris-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Info size={8} className="sm:w-2.5 sm:h-2.5 text-iris-600" />
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-ink-600 leading-relaxed">
                      干预成效追踪统计各类干预活动的平均改善分数和参与样本数，帮助评估干预措施的有效性。
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Resource Efficiency Analysis (5.1) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="p-4 sm:p-6 lg:p-8">
              <div className="space-y-6 sm:space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-xl font-bold text-ink-900">资源效能分析</h3>
                      <p className="text-xs sm:text-sm text-ink-500 mt-1">统计热门工具使用数据与心理改善效果关联</p>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-iris-500 rounded-full" />
                        <span className="text-[11px] sm:text-xs text-ink-500">使用频次 (次)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-ink-900 rounded-full" />
                        <span className="text-[11px] sm:text-xs text-ink-500">改善指数 (%)</span>
                      </div>
                    </div>
                  </div>
                <div className="h-64 sm:h-80 w-full mt-4 sm:mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cockpitData.resourceEfficiency} margin={{ left: 10, right: 10, top: 10, bottom: 20 }}>
                      <CartesianGrid {...chartTheme.grid} />
                      <XAxis dataKey="tool" interval={0} angle={-15} textAnchor="end" height={60} {...chartTheme.axis} />
                      <YAxis yAxisId="left" width={30} {...chartTheme.axis} />
                      <YAxis yAxisId="right" domain={[0, 100]} width={30} {...chartTheme.axis} />
                      <Tooltip 
                        {...chartTheme.tooltip}
                        formatter={(value, name) => {
                          if (name === '改善指数') {
                            return [`${value}%`, name];
                          }
                          return [value, name];
                        }}
                      />
                      <Bar yAxisId="left" dataKey="usage" fill="#d464a2" radius={barRadius} name="使用频次 (次)" barSize={50} />
                      <Bar yAxisId="right" dataKey="improvement" fill="#111827" radius={barRadius} name="改善指数 (%)" barSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white rounded-xl border border-iris-100 flex items-start gap-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-iris-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Info size={8} className="sm:w-2.5 sm:h-2.5 text-iris-600" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] sm:text-[11px] text-ink-600 leading-relaxed flex-1">
                    <p>
                      <span className="font-bold text-ink-800">使用频次：</span>统计该工具在选定时间范围内的总使用次数。
                    </p>
                    <p>
                      <span className="font-bold text-ink-800">改善指数：</span>基于用户对工具的五星评分计算，计算公式：(平均评分 / 5) × 100%。平均评分取所有用户最新评分的均值。
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>



          {/* Detailed Drill-down Analysis (5.1) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-ink-900">多维度下钻分析</h3>
                  <p className="text-xs sm:text-sm text-ink-500 mt-1">支持按学科、教龄、年级等多维度查看详细心理指标</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <select 
                      value={selectedDimension}
                      onChange={(e) => setSelectedDimension(e.target.value)}
                      className="pl-8 sm:pl-10 pr-6 sm:pr-8 py-1.5 sm:py-2 bg-white/70 border border-frost-200 rounded-xl text-[10px] sm:text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-iris-500/15 focus:border-iris-500 text-ink-800"
                    >
                      <option value="grade">按年级</option>
                      <option value="subject">按学科</option>
                      <option value="experience">按教龄</option>
                    </select>
                    <Layers className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-iris-500 sm:w-3.5 sm:h-3.5" size={12} />
                    <ChevronDown className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-iris-500 sm:w-3.5 sm:h-3.5" size={12} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-frost-200 bg-white">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gradient-to-r from-frost-50 to-frost-100 border-b border-frost-200">
                      <th className="py-2.5 sm:py-4 pl-3 sm:pl-6 pr-1.5 sm:pr-3 text-[11px] sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">{selectedDimension === 'grade' ? '年级' : selectedDimension === 'subject' ? '学科' : '教龄'}</th>
                      <th className="py-2.5 sm:py-4 px-1.5 sm:px-3 text-[11px] sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">样本量</th>
                      <th className="py-2.5 sm:py-4 px-1.5 sm:px-3 text-[11px] sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">平均心理分</th>
                      <th className="py-2.5 sm:py-4 px-1.5 sm:px-3 text-[11px] sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">预警比例</th>
                      <th className="py-2.5 sm:py-4 px-1.5 sm:px-3 text-[11px] sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">资源使用率</th>
                      <th className="py-2.5 sm:py-4 pl-1.5 sm:pl-3 pr-3 sm:pr-6 text-[11px] sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">干预成效</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-frost-100">
                    {filteredDrillDown.map((row, i) => (
                      <tr key={i} className="group hover:bg-frost-100/60 transition-colors">
                        <td className="py-2.5 sm:py-4 pl-3 sm:pl-6 pr-1.5 sm:pr-3 font-bold text-ink-900 text-[11px] sm:text-xs whitespace-nowrap">{row.label}</td>
                        <td className="py-2.5 sm:py-4 px-1.5 sm:px-3 text-ink-500 text-[11px] sm:text-xs whitespace-nowrap">{row.count}人</td>
                        <td className="py-2.5 sm:py-4 px-1.5 sm:px-3">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-10 sm:w-16 h-1.5 sm:h-2 bg-iris-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-300 ${row.score < 70 ? 'bg-gradient-to-r from-iris-200 to-iris-500' : 'bg-gradient-to-r from-iris-500 to-iris-600'}`} style={{ width: `${row.score}%` }} />
                            </div>
                            <span className="text-[11px] sm:text-xs font-bold text-iris-700">{row.score}</span>
                          </div>
                        </td>
                        <td className="py-2.5 sm:py-4 px-1.5 sm:px-3">
                          <span className={`px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold ${parseInt(row.warning) > 15 ? 'bg-gradient-to-r from-coral-50 to-coral-100 text-coral-600 border border-coral-200' : 'bg-gradient-to-r from-iris-50 to-iris-100 text-iris-600 border border-iris-200'}`}>
                            {row.warning}
                          </span>
                        </td>
                        <td className="py-2.5 sm:py-4 px-1.5 sm:px-3 text-ink-600 text-[11px] sm:text-xs whitespace-nowrap">{row.usage}</td>
                        <td className="py-2.5 sm:py-4 pl-1.5 sm:pl-3 pr-3 sm:pr-6 text-iris-600 font-bold text-[11px] sm:text-xs whitespace-nowrap">{row.effect}</td>
                      </tr>
                    ))}
                    {filteredDrillDown.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 sm:py-12 text-center text-ink-400 text-[11px] sm:text-xs">暂无匹配的数据分析结果</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-white rounded-xl border border-iris-100 flex items-start gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-iris-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Info size={8} className="sm:w-2.5 sm:h-2.5 text-iris-600" />
                </div>
                <p className="text-[10px] sm:text-[11px] text-ink-600 leading-relaxed">
                  多维度下钻分析支持按年级、学科、教龄等维度查看详细心理指标，帮助管理者精准定位问题群体。
                </p>
              </div>
            </GlassCard>
          </motion.div>

        {/* Decision Support Suggestions (5.3) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-ink-900">数据分析与管理建议</h3>
                  <p className="text-xs sm:text-sm text-ink-500 mt-1">基于全校多维度数据关联分析，识别突出问题并结合环境数据（工作量）进行根因分析</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                {cockpitData.suggestions && cockpitData.suggestions.map((suggestion, index) => (
                  <motion.div 
                    key={index}
                    whileHover={{ y: -3 }}
                    className="h-full"
                  >
                    <GlassCard className="bg-white/70 rounded-2xl border border-frost-200 p-4 sm:p-5 h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`h-2 w-2 rounded-full ${suggestion.type === 'risk' ? 'bg-coral-500' : suggestion.type === 'efficiency' ? 'bg-iris-500' : suggestion.type === 'intervention' ? 'bg-amber-500' : 'bg-ink-800'}`} />
                        <p className="text-xs sm:text-sm font-bold text-ink-800">{suggestion.title}</p>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-ink-600 leading-relaxed mb-3">
                        <span className="font-bold text-ink-700">根因分析：</span> {suggestion.rootCause}
                      </p>
                      <div className="p-3 sm:p-3.5 bg-iris-50 rounded-xl border border-iris-100">
                        <p className="text-[10px] font-bold text-iris-700 uppercase mb-1">管理建议</p>
                        <p className="text-[10px] sm:text-[11px] text-ink-700">{suggestion.suggestion}</p>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>
        </div>
      </motion.div>
    </PageContainer>
  );
};

export default AdminCockpit;
