import React from "react";
import { UserProfile } from "../types";
import { motion } from "motion/react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Download, 
  Calendar,
  PieChart as PieChartIcon,
  Layers
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from "recharts";

interface AdminCockpitProps {
  profile: UserProfile | null;
}

const AdminCockpit: React.FC<AdminCockpitProps> = ({ profile }) => {
  const groupData = [
    { name: "初一年级", score: 82, warnings: 2 },
    { name: "初二年级", score: 78, warnings: 5 },
    { name: "初三年级", score: 65, warnings: 12 },
    { name: "高一年级", score: 85, warnings: 1 },
    { name: "高二年级", score: 80, warnings: 3 },
    { name: "高三年级", score: 62, warnings: 15 },
  ];

  const riskDistribution = [
    { name: "绿色 (健康)", value: 65, color: "#10b981" },
    { name: "蓝色 (亚健康)", value: 20, color: "#3b82f6" },
    { name: "黄色 (轻度风险)", value: 10, color: "#eab308" },
    { name: "橙色 (中度风险)", value: 4, color: "#f97316" },
    { name: "红色 (高度风险)", value: 1, color: "#ef4444" },
  ];

  const interventionStats = [
    { name: "1月", completed: 12, pending: 2 },
    { name: "2月", completed: 15, pending: 1 },
    { name: "3月", completed: 18, pending: 4 },
    { name: "4月", completed: 22, pending: 3 },
    { name: "5月", completed: 25, pending: 2 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">紫色评估：校级管理驾驶舱</h1>
          <p className="text-stone-500">基于大数据的全校教师心理态势综合分析与决策支持。</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-stone-100 rounded-2xl font-bold text-stone-600 shadow-sm hover:bg-stone-50 transition-all">
          <Download size={20} /> 导出分析报告
        </button>
      </header>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "全校心理健康指数", value: "76.5", trend: "+2.4%", icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "本月测评参与率", value: "94.2%", trend: "+5.1%", icon: Users, iconColor: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "干预任务完成率", value: "88.5%", trend: "-1.2%", icon: TrendingUp, iconColor: "text-blue-600", bg: "bg-blue-50" },
          { label: "预警响应平均时长", value: "4.2h", trend: "-0.5h", icon: Calendar, iconColor: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`h-10 w-10 ${stat.bg} ${stat.color || stat.iconColor} rounded-xl flex items-center justify-center`}>
                <stat.icon size={20} />
              </div>
              <span className={`text-xs font-bold ${stat.trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-sm font-medium text-stone-500">{stat.label}</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Group Comparison */}
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
            <Layers size={20} className="text-purple-600" /> 年级组心理态势对比
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={80} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={24} name="心理健康分" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
            <PieChartIcon size={20} className="text-purple-600" /> 全校风险分布概览
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Decision Support */}
      <div className="bg-purple-600 p-8 rounded-3xl shadow-xl shadow-purple-100 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <BarChart3 size={32} />
          </div>
          <div className="space-y-6 flex-1">
            <div>
              <h3 className="text-xl font-bold mb-2">AI 智能管理决策建议</h3>
              <p className="text-purple-100 text-sm leading-relaxed">
                基于全校 450 名教师的动态数据建模，AI 识别出以下管理优化路径：
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20">
                <p className="text-sm font-bold mb-1">重点干预：初三年级组</p>
                <p className="text-xs text-purple-50 leading-relaxed">
                  该组教师“情感耗竭”因子分显著高于全校均值（+24%）。建议下周三下午减少教研会议，安排户外团建活动。
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20">
                <p className="text-sm font-bold mb-1">资源投放：睡眠健康</p>
                <p className="text-xs text-purple-50 leading-relaxed">
                  全校 15% 的教师存在睡眠质量预警。建议在“蓝色调适”模块中置顶“深度助眠冥想”资源，并邀请专家开展睡眠讲座。
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-20 -bottom-20 h-64 w-64 bg-purple-500 rounded-full blur-3xl opacity-50" />
      </div>
    </motion.div>
  );
};

export default AdminCockpit;
