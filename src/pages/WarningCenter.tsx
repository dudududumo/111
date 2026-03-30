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
  CheckCircle as CheckCircle2,
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
import api from "../services/api";
import { Warning, UserRole, UserProfile } from "../types";
import { analyzeTeacherRisk, triggerWarning } from "../services/riskEngineService";
import { scanTeachersRisk, getWarningConfigs, RiskAnalysisResult, WarningTrigger, WarningResponse, WarningVariables } from "../services/redWarningService";
import CustomModal from "../components/CustomModal";

// 响应配置项类型
interface ResponseConfigItem {
  id: string;
  level: string;
  color: string;
  threshold: number;
  variables: WarningVariables;
  triggers: WarningTrigger[];
  responses: WarningResponse[];
}
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
  
  // CustomModal状态
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning" | "info" | "confirm";
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    showCancel?: boolean;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });

  // 从数据库加载预警数据（真正的数据库持久化）
  useEffect(() => {
    const loadWarnings = async () => {
      try {
        console.log('正在从数据库加载预警数据...');
        const response = await api.warning.getAll();
        console.log('从数据库加载预警数据成功:', response.length || 0, '条');
        console.log('数据库返回的数据:', response);
        
        // 转换数据库格式为前端格式
        const dbWarnings = (response || []).map(warning => ({
          id: warning.id,
          uid: warning.user_id,
          teacherName: warning.display_name || warning.teacher_name || '',
          level: warning.level === 'attention' ? 'level1' : 
                 warning.level === 'intervention' ? 'level2' : 'level3',
          riskScore: warning.risk_score,
          factors: Array.isArray(warning.factors) ? warning.factors : [],
          reason: warning.reason || '',
          status: warning.status || 'pending',
          timestamp: warning.created_at || new Date().toISOString()
        }));
        
        setWarnings(dbWarnings);
        console.log('转换后的预警数据:', dbWarnings.length, '条');
      } catch (error) {
        console.error('从数据库加载预警数据失败:', error);
        console.error('错误详情:', error.message || error);
        // 降级方案：使用空数组
        setWarnings([]);
      }
    };

    loadWarnings();
  }, []);
  // 重构响应配置为可动态配置的结构化数据
  const [responseConfig, setResponseConfig] = useState<ResponseConfigItem[]>([]);
  
  // 从数据库加载预警配置
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        console.log('开始从数据库加载预警配置...');
        const configs = await getWarningConfigs();
        console.log('从API获取的原始配置:', configs);
        const mappedConfigs = configs.map(config => {
          console.log('处理配置:', config.level, 'variables:', config.variables, 'triggers:', config.triggers);
          return {
            id: config.level,
            level: config.name,
            color: config.level === 'level3' ? 'bg-rose-600' : config.level === 'level2' ? 'bg-amber-500' : 'bg-blue-500',
            threshold: config.threshold,
            // 使用配置中的变量
            variables: {
              depressionThreshold: config.variables?.depressionThreshold ?? (config.level === 'level3' ? 2.5 : 2.0),
              riskThreshold: config.variables?.riskThreshold ?? (config.level === 'level3' ? 0.8 : config.level === 'level2' ? 0.7 : 0.6),
              consecutiveWeeks: config.variables?.consecutiveWeeks ?? 1,
              durationDays: config.variables?.durationDays ?? 1
            },
            // 使用配置中的triggers
            triggers: config.triggers?.map(trigger => ({
              type: trigger.type,
              operator: trigger.operator,
              value: trigger.value,
              description: trigger.description
            })) || [],
            // 使用配置中的responses
            responses: config.responses?.map(response => ({
              type: response.type,
              target: response.target,
              content: response.content,
              description: response.description
            })) || []
          };
        });
        console.log('映射后的配置:', mappedConfigs);
        setResponseConfig(mappedConfigs);
        console.log('已从数据库加载预警配置:', mappedConfigs.length, '条');
      } catch (error) {
        console.error('加载预警配置失败:', error);
        // 降级方案：使用空数组
        setResponseConfig([]);
      }
    };
    
    loadConfigs();
  }, []);

  // 保存配置到数据库
  const handleSaveConfig = async () => {
    // 权限校验：只有管理员可以保存配置
    const userRole = profile?.role || UserRole.TEACHER;
    if (userRole !== UserRole.ADMIN) {
      showModal({
        type: "error",
        title: "权限不足",
        message: "只有系统管理员可以修改预警阈值配置"
      });
      setShowConfig(false); // 强制关闭弹窗
      return;
    }
    try {
      console.log('开始保存配置到数据库...');
      console.log('当前 responseConfig 状态:', responseConfig.map(c => ({
        level: c.id,
        riskThreshold: c.variables.riskThreshold,
        depressionThreshold: c.variables.depressionThreshold,
        triggers: c.triggers.map(t => ({ type: t.type, value: t.value, desc: t.description }))
      })));
      
      // 逐个保存每个配置
      for (const config of responseConfig) {
        console.log('准备保存配置:', {
          level: config.id,
          name: config.level,
          threshold: config.threshold,
          variables: config.variables,
          triggers: config.triggers
        });
        await api.warningConfig.save({
          level: config.id,
          name: config.level,
          triggers: config.triggers,
          responses: config.responses,
          variables: config.variables
        });
        console.log('已保存配置:', config.id);
      }
      
      console.log('所有配置保存成功！');
      showModal({
        type: "success",
        title: "保存成功",
        message: "配置保存成功！"
      });
      setShowConfig(false);
      
      // 重新加载配置
      const configs = await getWarningConfigs();
      const mappedConfigs = configs.map(config => ({
        id: config.level,
        level: config.name,
        color: config.level === 'level3' ? 'bg-rose-600' : config.level === 'level2' ? 'bg-amber-500' : 'bg-blue-500',
        threshold: config.threshold,
        variables: {
          depressionThreshold: config.variables?.depressionThreshold ?? (config.level === 'level3' ? 2.5 : 2.0),
          riskThreshold: config.variables?.riskThreshold ?? (config.level === 'level3' ? 0.8 : config.level === 'level2' ? 0.7 : 0.6),
          consecutiveWeeks: config.variables?.consecutiveWeeks ?? 1,
          durationDays: config.variables?.durationDays ?? 1
        },
        triggers: config.triggers?.map(trigger => ({
          type: trigger.type,
          operator: trigger.operator,
          value: trigger.value,
          description: trigger.description
        })) || [],
        responses: config.responses?.map(response => ({
          type: response.type,
          target: response.target,
          content: response.content,
          description: response.description
        })) || []
      }));
      setResponseConfig(mappedConfigs);
      
    } catch (error) {
      console.error('保存配置失败:', error);
      showModal({
        type: "error",
        title: "保存失败",
        message: "保存配置失败，请重试！"
      });
    }
  };

  const userRole = profile?.role || UserRole.TEACHER;

  const filteredWarnings = warnings.filter(w => {
    if (filter === "all") return true;
    return w.level === filter;
  });

  const stats = {
    level3: warnings.filter(w => w.level === "level3").length,
    level2: warnings.filter(w => w.level === "level2").length,
    level1: warnings.filter(w => w.level === "level1").length,
  };

  const scatterData = warnings.map(w => ({
    x: w.riskScore * 100,
    y: 50 + (Math.sin(w.riskScore * 10) * 20), // More structured simulated secondary dimension
    z: w.level === 'level3' ? 100 : (w.level === 'level2' ? 60 : 30),
    level: w.level,
    name: (userRole === UserRole.ADMIN || userRole === UserRole.PSYCHOLOGIST || userRole === UserRole.DEPT_HEAD) ? w.teacherName : "匿名教师"
  }));

  const pieData = [
    { name: '三级干预', value: stats.level3, color: '#ef4444' },
    { name: '二级关注', value: stats.level2, color: '#f59e0b' },
    { name: '一级提醒', value: stats.level1, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const handleTriggerIntervention = async (warning: Warning) => {
    try {
      // 1. 先检查是否已存在关联的干预任务
      let existingTask = null;
      try {
        existingTask = await api.intervention.getTaskByWarningId(warning.id!);
      } catch (e) {
        // 如果没有找到，继续创建新任务
        console.log('未找到现有干预任务，将创建新任务');
      }

      if (existingTask && existingTask.id) {
        showModal({
          type: "warning",
          title: "任务已存在",
          message: "该预警已存在关联的干预任务，请前往干预任务看板查看。"
        });
        return;
      }

      // 2. 创建干预任务
      const taskData = {
        warningId: warning.id!,
        teacherId: warning.uid,
        teacherName: warning.teacherName,
        warningLevel: warning.level,
        priority: warning.level === 'level3' ? 'high' : warning.level === 'level2' ? 'medium' : 'low',
      };

      console.log("创建干预任务:", taskData);
      const result = await api.intervention.createTask(taskData);
      console.log("干预任务创建成功:", result);

      // 3. 更新预警状态为active（表示已启动干预）
      await api.warning.updateStatus(warning.id!, 'active');

      // 4. 更新本地状态
      const updatedWarnings = warnings.map(w =>
        w.id === warning.id ? { ...w, status: 'active' as const } : w
      );
      setWarnings(updatedWarnings);
      if (selectedWarning?.id === warning.id) {
        setSelectedWarning({ ...selectedWarning, status: 'active' as const });
      }

      showModal({
        type: "success",
        title: "干预已启动",
        message: "协作干预流程已启动，已为您在橙色平台创建任务并通知相关负责人。"
      });
    } catch (error) {
      console.error('Error triggering intervention:', error);
      showModal({
        type: "error",
        title: "创建失败",
        message: "创建干预任务失败，请稍后重试。"
      });
    }
  };

  const handleResolve = async (id: string) => {
    console.log("标记为已处理:", id);
    
    try {
      // 1. 更新数据库中的预警状态
      await api.warning.updateStatus(id, 'resolved');
      
      // 2. 尝试更新关联的干预任务状态（如果有）
      try {
        const task = await api.intervention.getTaskByWarningId(id);
        if (task && task.id) {
          await api.intervention.updateTaskStatus(task.id, 'completed');
          console.log(`已同步完成关联的干预任务: ${task.id}`);
        }
      } catch (e) {
        console.log('未找到关联的干预任务，无需同步');
      }

      // 3. 更新本地状态
      const updatedWarnings = warnings.map(warning => 
        warning.id === id ? { ...warning, status: 'resolved' as const } : warning
      );
      
      setWarnings(updatedWarnings);
      if (selectedWarning?.id === id) {
        setSelectedWarning({ ...selectedWarning, status: 'resolved' as const });
      }
      
      console.log("预警及关联任务已标记为已处理:", id);
    } catch (error) {
      console.error('更新预警状态失败:', error);
      // 降级方案：只更新本地状态
      const updatedWarnings = warnings.map(warning => 
        warning.id === id ? { ...warning, status: 'resolved' as const } : warning
      );
      setWarnings(updatedWarnings);
      setSelectedWarning(null);
    }
  };

  const runAnalysis = async () => {
    // 权限校验：只有管理员可以执行扫描
    const userRole = profile?.role || UserRole.TEACHER;
    if (userRole !== UserRole.ADMIN) {
      showModal({
        type: "error",
        title: "权限不足",
        message: "只有系统管理员可以启动全校风险扫描"
      });
      return;
    }
    setIsAnalyzing(true);
    try {
      // 获取所有现有干预任务，找到关联的预警ID
      const existingTasks = await api.intervention.getAllTasks();
      const warningIdsWithTasks = new Set(
        existingTasks
          .filter((task: any) => task.warningId)
          .map((task: any) => task.warningId)
      );
      console.log("发现", warningIdsWithTasks.size, "个预警有关联的干预任务，将保留这些预警");

      // 只删除没有关联干预任务的旧预警数据
      try {
        const allWarnings = await api.warning.getAll();
        const warningsToDelete = allWarnings.filter((w: any) => 
          !warningIdsWithTasks.has(w.id)
        );
        
        console.log("准备删除", warningsToDelete.length, "个无关联的旧预警");
        
        for (const warning of warningsToDelete) {
          await api.warning.delete(warning.id);
        }
        
        console.log("已清理无关联的旧预警数据");
      } catch (error) {
        console.error("清理旧预警数据失败:", error);
      }
      
      // 从数据库获取所有教师
      const teachers = await api.user.getTeachers();
      console.log("从数据库获取教师数量:", teachers.length, "条");
      
      if (teachers.length === 0) {
        console.log("数据库中没有教师数据，无法进行风险扫描");
        showModal({
          type: "warning",
          title: "缺少数据",
          message: "数据库中没有教师数据，请先添加教师信息"
        });
        return;
      }
      
      // 转换为风险扫描需要的格式
      const uniqueTeachers = teachers.map(teacher => ({
        uid: teacher.id,
        name: teacher.display_name
      }));
      
      console.log("使用以下教师数据进行风险扫描:", uniqueTeachers.length, "条");

      // 构建当前配置传递给扫描函数
      const currentConfigs = responseConfig.map(item => ({
        level: item.id as 'level1' | 'level2' | 'level3',
        name: item.level,
        threshold: item.threshold,
        variables: item.variables,
        triggers: item.triggers,
        responses: item.responses
      }));

      console.log("当前预警配置:", currentConfigs.length, "条");
      currentConfigs.forEach(config => {
        console.log(`- ${config.level}: depressionThreshold=${config.variables?.depressionThreshold}, riskThreshold=${config.variables?.riskThreshold}`);
      });

      // 使用红色预警模块的批量扫描功能，传入当前配置
      console.log("开始调用 scanTeachersRisk...");
      const results = await scanTeachersRisk(uniqueTeachers, currentConfigs);
      console.log("scanTeachersRisk 返回结果:", results);
      console.log("触发预警的数量:", results.filter(r => r.analysis.warningTriggered).length);
      
      // 将扫描结果转换为预警格式并更新到页面
      const newWarningsFromScan: Warning[] = results
        .filter(result => result.analysis.warningTriggered && result.warningId)
        .map((result, index) => ({
          id: result.warningId || `warning_${Date.now()}_${index}`,
          uid: result.teacher.uid,
          teacherName: result.teacher.name,
          level: result.analysis.warningLevel === "level1" ? "level1" : 
                 result.analysis.warningLevel === "level2" ? "level2" : "level3",
          riskScore: result.analysis.riskScore,
          factors: result.analysis.factors,
          reason: result.analysis.reason,
          status: "pending" as const,
          timestamp: new Date().toISOString()
        }));
      
      // 获取所有现有的有关联任务的预警，保留它们
      const existingWarningsWithTasks = warnings.filter(w => warningIdsWithTasks.has(w.id));
      
      // 合并新旧预警：保留有关联任务的旧预警 + 新扫描的预警
      const finalWarnings = [...existingWarningsWithTasks, ...newWarningsFromScan];
      
      // 更新预警列表
      setWarnings(finalWarnings);
      console.log("预警列表已更新，共", finalWarnings.length, "条预警（其中", existingWarningsWithTasks.length, "条是保留的有关联任务的预警）");
      
      // 将预警数据保存到数据库
      console.log("开始将预警数据保存到数据库...");
      for (const warning of newWarningsFromScan) {
        try {
          await api.warning.upsert({
            userId: warning.uid,
            teacherName: warning.teacherName,
            level: warning.level === 'level1' ? 'attention' : 
                   warning.level === 'level2' ? 'intervention' : 'emergency',
            riskScore: warning.riskScore,
            factors: warning.factors,
            reason: warning.reason,
            status: warning.status
          });
          console.log(`预警已保存: ${warning.teacherName} (${warning.level})`);
        } catch (error) {
          console.error(`保存预警失败: ${warning.teacherName}`, error);
        }
      }
    } catch (err) {
      console.error("Analysis failed:", err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 显示弹窗的辅助函数
  const showModal = (data: Omit<typeof modalData, "isOpen">) => {
    setModalData({
      ...data,
      isOpen: true
    });
  };

  // 关闭弹窗
  const closeModal = () => {
    setModalData(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-rose-50 via-rose-100 to-rose-50"
    >
      <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900 flex items-center gap-3">
                <ShieldAlert className="text-rose-600" size={24} />
                红色预警：智能预警中心
              </h1>
              <p className="text-stone-500 mt-1">基于 LSTM 算法引擎的实时风险监测与分级响应</p>
            </div>
            <div className="inline-flex bg-gradient-to-r from-rose-50 to-rose-100 rounded-xl sm:rounded-2xl p-1 shadow-lg shadow-rose-200/50 w-fit">
              <button 
                onClick={() => setViewMode("list")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${viewMode === "list" ? "bg-rose-600 text-white shadow-md" : "text-stone-500 hover:text-stone-700"}`}
              >
                预警列表
              </button>
              <button 
                onClick={() => setViewMode("map")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${viewMode === "map" ? "bg-rose-600 text-white shadow-md" : "text-stone-500 hover:text-stone-700"}`}
              >
                风险图谱
              </button>
            </div>
          </div>
          <div className="flex justify-end items-center gap-3">
            {/* 只有系统管理员可以启动风险扫描 */}
            {userRole === UserRole.ADMIN && (
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
            )}
            
            {/* 只有系统管理员可以配置响应机制 */}
            {userRole === UserRole.ADMIN && (
              <button 
                onClick={() => setShowConfig(true)}
                className="p-3 bg-white border border-stone-200 rounded-2xl text-stone-500 hover:bg-stone-50 transition-all shadow-sm"
                title="响应机制配置"
              >
                <Settings size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "三级干预（专业）", count: stats.level3, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", level: "level3" },
            { label: "二级关注（互助）", count: stats.level2, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", level: "level2" },
            { label: "一级提醒（自助）", count: stats.level1, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", level: "level1" },
          ].map((s, i) => (
            <motion.button
              key={i}
              whileHover={{ y: -4 }}
              onClick={() => setFilter(s.level)}
              className={`p-6 rounded-3xl border ${s.bg} ${s.border} text-left transition-all shadow-lg shadow-rose-100/50 ${filter === s.level ? 'ring-2 ring-stone-900' : ''}`}
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
                      className={`group bg-white p-6 rounded-3xl border transition-all cursor-pointer hover:shadow-lg hover:shadow-rose-100/50 ${selectedWarning?.id === warning.id ? 'border-rose-600 ring-1 ring-rose-300' : 'border-rose-100'}`}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                              warning.level === 'level3' ? 'bg-rose-100 text-rose-600' : 
                              warning.level === 'level2' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              <AlertTriangle size={24} />
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-bold text-stone-900 whitespace-nowrap">
                                  {(userRole === UserRole.ADMIN || userRole === UserRole.PSYCHOLOGIST || userRole === UserRole.DEPT_HEAD) ? warning.teacherName : "某匿名教师"}
                                </h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  warning.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' :
                                  warning.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-stone-100 text-stone-500'
                                }`}>
                                  {warning.status === 'resolved' ? '已处理' : warning.status === 'active' ? '进行中' : '待处理'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
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
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                            warning.level === 'level3' ? 'bg-rose-50 text-rose-600' : 
                            warning.level === 'level2' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {warning.level === 'level3' ? '三级干预' : warning.level === 'level2' ? '二级关注' : '一级提醒'}
                          </span>
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
                    className="bg-white rounded-3xl border border-rose-100 shadow-xl shadow-rose-100/50 overflow-hidden lg:sticky lg:top-24 max-lg:fixed max-lg:inset-4 max-lg:z-50 max-lg:max-h-[80vh] max-lg:overflow-y-auto"
                  >
                    <div className={`p-6 rounded-t-3xl bg-gradient-to-r ${selectedWarning.level === 'level3' ? 'from-rose-600 to-rose-700' : selectedWarning.level === 'level2' ? 'from-amber-500 to-amber-600' : 'from-blue-500 to-blue-600'} text-white`}>
                      <div className="flex justify-between items-start">
                        <h2 className="text-xl font-bold">风险详情分析</h2>
                        <button onClick={() => setSelectedWarning(null)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                          <X size={20} />
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
                            <div key={i} className="flex items-start gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100 hover:shadow-md transition-all">
                              <div className={`h-6 w-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${selectedWarning.level === 'level3' ? 'bg-rose-100 text-rose-600' : selectedWarning.level === 'level2' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                <div className="h-2 w-2 rounded-full bg-current" />
                              </div>
                              <p className="text-sm text-stone-700 font-medium leading-relaxed">{f}</p>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Response Mechanism */}
                      <section>
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">响应机制与记录</h4>
                        <div className="space-y-4">
                          <div className={`p-6 rounded-2xl border ${selectedWarning.level === 'level3' ? 'bg-rose-50 border-rose-100' : selectedWarning.level === 'level2' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${selectedWarning.level === 'level3' ? 'bg-rose-100 text-rose-600' : selectedWarning.level === 'level2' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                <Users size={20} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-stone-500">当前响应级别</p>
                                <p className="text-sm font-bold text-stone-900">
                                  {selectedWarning.level === 'level3' ? '三级干预：推送至心理负责人' : 
                                   selectedWarning.level === 'level2' ? '二级关注：推送至年级主任' : '一级提醒：推送自助资源'}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3">
                              {/* 只有二级和三级预警显示启动协作干预，且只有有权限的人可以点 */}
                              {selectedWarning.status === 'pending' && selectedWarning.level !== 'level1' && (userRole === UserRole.ADMIN || userRole === UserRole.PSYCHOLOGIST || userRole === UserRole.DEPT_HEAD) && (
                                <button 
                                  onClick={() => handleTriggerIntervention(selectedWarning)}
                                  className={`w-full py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${selectedWarning.level === 'level3' ? 'bg-rose-600 text-white shadow-rose-100 hover:bg-rose-700' : 'bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600'}`}
                                >
                                  <Play size={18} /> 启动协作干预
                                </button>
                              )}
                              
                              {/* 一级预警如果是 pending 状态，显示处理按钮 - 所有人都可以处理？或者只管理员？这里先按原逻辑，但加个提示 */}
                              {selectedWarning.status === 'pending' && selectedWarning.level === 'level1' && (
                                <button 
                                  onClick={() => handleResolve(selectedWarning.id!)}
                                  className="w-full py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                                >
                                  <CheckCircle size={18} /> 确认已读并标记处理
                                </button>
                              )}

                              {/* 二级和三级已启动的状态显示 */}
                              {selectedWarning.status === 'active' && (
                                <div className="flex items-center justify-center gap-2 py-3 bg-stone-100 text-stone-500 rounded-2xl text-sm font-bold border border-stone-200">
                                  <Clock size={18} /> 干预流程进行中
                                </div>
                              )}

                              {/* 非已处理状态显示标记已处理按钮（一级已经在上面处理了），且只有有权限的人可以点 */}
                              {selectedWarning.status !== 'resolved' && selectedWarning.level !== 'level1' && (userRole === UserRole.ADMIN || userRole === UserRole.PSYCHOLOGIST || userRole === UserRole.DEPT_HEAD) && (
                                <button 
                                  onClick={() => handleResolve(selectedWarning.id!)}
                                  className="w-full py-3 bg-white text-stone-900 rounded-2xl text-sm font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 border border-stone-200 shadow-sm"
                                >
                                  <CheckCircle size={18} /> 标记为已完成
                                </button>
                              )}

                              {selectedWarning.status === 'resolved' && (
                                <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-bold border border-emerald-100">
                                  <CheckCircle2 size={18} /> 已处理完成
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">处理日志</p>
                            {selectedWarning.responseLog?.map((log, i) => (
                              <div key={i} className="flex gap-3 pl-2 border-l-2 border-rose-100">
                                <div className="text-[10px] text-stone-400 w-16 shrink-0">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                <div className="text-xs">
                                  <span className="font-bold text-stone-700">{log.actor}: </span>
                                  <span className="text-stone-500">{log.action}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      {/* Privacy Notice */}
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex gap-3">
                        <Lock className="text-rose-400 shrink-0" size={18} />
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
                    <h3 className="text-lg font-bold text-rose-900">群体风险分布图谱</h3>
                    <p className="text-sm text-rose-600">横轴：风险指数 | 纵轴：活跃度波动</p>
                  </div>
                </div>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" />
                      <XAxis type="number" dataKey="x" name="风险指数" unit="%" axisLine={false} tickLine={false} />
                      <YAxis type="number" dataKey="y" name="活跃度" unit="%" axisLine={false} tickLine={false} />
                      <ZAxis type="number" dataKey="z" range={[100, 1000]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Scatter name="风险点" data={scatterData}>
                        {scatterData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.level === 'level3' ? '#ef4444' : (entry.level === 'level2' ? '#f59e0b' : '#3b82f6')} 
                            fillOpacity={0.6}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-lg font-bold text-rose-900 mb-8">风险等级占比</h3>
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

      {/* Config Modal - 只有管理员可见 */}
      <AnimatePresence>
        {showConfig && userRole === UserRole.ADMIN && (
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
              className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-3xl shadow-2xl shadow-rose-100/50 overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-rose-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">响应机制配置</h2>
                  <p className="text-stone-500 text-sm">自定义不同风险等级的自动化响应流程</p>
                </div>
                <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-rose-50 rounded-xl transition-colors">
                  <X size={24} className="text-rose-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                {responseConfig.map((item, i) => (
                  <div key={i} className={`flex gap-6 p-6 rounded-2xl border ${item.color === 'bg-rose-600' ? 'bg-rose-50 border-rose-100' : item.color === 'bg-amber-500' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div className={`h-12 w-12 rounded-2xl ${item.color} shrink-0 flex items-center justify-center text-white shadow-md shadow-rose-100/30`}>
                      <Bell size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-stone-900">{item.level}</h3>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">已激活</span>
                      </div>
                      <div className="space-y-4">
                        {/* 变量配置区域 */}
                        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
                          <label className="text-[10px] font-bold text-stone-400 uppercase block mb-3">阈值变量配置</label>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-stone-500 block mb-1">抑郁因子分阈值</label>
                              <input
                                type="number"
                                step="0.1"
                                value={item.variables.depressionThreshold}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  console.log(`[onChange] 抑郁因子分输入值: ${value}`);
                                  setResponseConfig(prev => {
                                    const newConfig = [...prev];
                                    newConfig[i] = { ...newConfig[i] };
                                    newConfig[i].variables = { ...newConfig[i].variables, depressionThreshold: value };
                                    // 同步更新 triggers 中的值和描述
                                    newConfig[i].triggers = newConfig[i].triggers.map(t => 
                                      t.type === 'depression_score' 
                                        ? { ...t, value, description: `抑郁因子分首次≥${value}` }
                                        : t
                                    );
                                    console.log(`[setResponseConfig] 更新后 triggers:`, newConfig[i].triggers);
                                    return newConfig;
                                  });
                                }}
                                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-100"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-stone-500 block mb-1">风险指数阈值</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                value={item.variables.riskThreshold}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  console.log(`[onChange] 风险指数输入值: ${value}`);
                                  setResponseConfig(prev => {
                                    const newConfig = [...prev];
                                    newConfig[i] = { ...newConfig[i] };
                                    newConfig[i].variables = { ...newConfig[i].variables, riskThreshold: value };
                                    // 同步更新 triggers 中的值和描述
                                    newConfig[i].triggers = newConfig[i].triggers.map(t => 
                                      t.type === 'risk_index' 
                                        ? { ...t, value, description: `风险指数≥${value}` }
                                        : t
                                    );
                                    console.log(`[setResponseConfig] 更新后 triggers:`, newConfig[i].triggers);
                                    return newConfig;
                                  });
                                }}
                                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-100"
                              />
                            </div>
                            {item.id === 'level2' && (
                              <div>
                                <label className="text-xs text-stone-500 block mb-1">连续周数</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.variables.consecutiveWeeks}
                                  onChange={(e) => {
                                    const newConfig = [...responseConfig];
                                    newConfig[i].variables.consecutiveWeeks = parseInt(e.target.value);
                                    setResponseConfig(newConfig);
                                  }}
                                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-100"
                                />
                              </div>
                            )}
                            <div>
                              <label className="text-xs text-stone-500 block mb-1">持续时间(天)</label>
                              <input
                                type="number"
                                min="1"
                                value={item.variables.durationDays}
                                onChange={(e) => {
                                  const newConfig = [...responseConfig];
                                  newConfig[i].variables.durationDays = parseInt(e.target.value);
                                  setResponseConfig(newConfig);
                                }}
                                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-100"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 触发条件只读展示 - 根据变量动态生成 */}
                        <div className={`p-4 rounded-2xl border ${item.color === 'bg-rose-600' ? 'bg-rose-50 border-rose-100' : item.color === 'bg-amber-500' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                          <label className="text-[10px] font-bold text-stone-400 uppercase block mb-3">触发条件（自动同步）</label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-stone-700 font-medium">
                              <span className={`h-2 w-2 rounded-full ${item.color === 'bg-rose-600' ? 'bg-rose-500' : item.color === 'bg-amber-500' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                              <span>抑郁因子分 ≥ {item.variables.depressionThreshold}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-stone-700 font-medium">
                              <span className={`h-2 w-2 rounded-full ${item.color === 'bg-rose-600' ? 'bg-rose-500' : item.color === 'bg-amber-500' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                              <span>风险指数 ≥ {item.variables.riskThreshold}</span>
                            </div>
                            {item.id === 'level2' && (
                              <div className="flex items-center gap-2 text-xs text-stone-700 font-medium">
                                <span className={`h-2 w-2 rounded-full ${item.color === 'bg-rose-600' ? 'bg-rose-500' : item.color === 'bg-amber-500' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                <span>连续 {item.variables.consecutiveWeeks} 周超标</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* 执行动作只读展示 */}
                        <div className={`p-4 rounded-2xl border ${item.color === 'bg-rose-600' ? 'bg-rose-50 border-rose-100' : item.color === 'bg-amber-500' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                          <label className="text-[10px] font-bold text-stone-400 uppercase block mb-3">执行动作</label>
                          <div className="space-y-2">
                            {item.responses.map((response, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-stone-700 font-medium">
                                <span className={`h-2 w-2 rounded-full ${item.color === 'bg-rose-600' ? 'bg-rose-500' : item.color === 'bg-amber-500' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                <span>{response.description}</span>
                                <span className="text-stone-400">→</span>
                                <span className="text-stone-600">
                                  {response.target === 'user' ? '教师本人' : 
                                   response.target === 'manager' ? '教研组长/年级主任' : '学校心理负责人'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-rose-50 flex justify-end gap-4">
                <button onClick={() => setShowConfig(false)} className="px-6 py-3 text-stone-500 font-bold hover:text-stone-700 transition-colors">取消</button>
                <button onClick={handleSaveConfig} className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all">保存配置</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 自定义弹窗 */}
      <CustomModal
        isOpen={modalData.isOpen}
        onClose={closeModal}
        type={modalData.type}
        title={modalData.title}
        message={modalData.message}
        confirmText={modalData.confirmText}
        cancelText={modalData.cancelText}
        onConfirm={modalData.onConfirm}
        showCancel={modalData.showCancel}
      />
    </motion.div>
  );
};

export default WarningCenter;

