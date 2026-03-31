import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Building2, 
  Globe, 
  Sparkles, 
  Plus, 
  Calendar, 
  MapPin, 
  MessageSquare, 
  CheckCircle2, 
  Play,
  Clock, 
  ChevronRight,
  ExternalLink,
  Phone,
  Search,
  Filter,
  X,
  Info,
  Tag,
  BookOpen,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  UserProfile, 
  UserRole, 
  InterventionTask, 
  GroupActivity, 
  MentalResource 
} from "../types";
import CustomModal from "../components/CustomModal";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

const apiCall = async (endpoint: string, options?: RequestInit) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`http://localhost:3000${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
};

interface InterventionProps {
  profile: UserProfile | null;
}

const Intervention: React.FC<InterventionProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'network' | 'matching'>('network');
  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [resources, setResources] = useState<MentalResource[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showResourceAdmin, setShowResourceAdmin] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelActivityId, setCancelActivityId] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({
    title: "",
    type: "tea" as any,
    description: "",
    date: "",
    location: ""
  });
  const [showResourceShare, setShowResourceShare] = useState(false);
  const [newResource, setNewResource] = useState({
    title: "",
    type: "article" as any,
    url: "",
    description: ""
  });
  const [teamResources, setTeamResources] = useState<any[]>([]);
  const [interventionTasks, setInterventionTasks] = useState<InterventionTask[]>([]);
  const [users, setUsers] = useState<Record<string, { displayName: string }>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [atmosphereData, setAtmosphereData] = useState([
    { name: '活力', value: 85, color: '#10b981' },
    { name: '支持', value: 78, color: '#3b82f6' },
    { name: '压力', value: 45, color: '#f59e0b' },
    { name: '凝聚力', value: 92, color: '#8b5cf6' },
  ]);
  
  const [showAddCareRecord, setShowAddCareRecord] = useState(false);
  const [selectedTaskForRecord, setSelectedTaskForRecord] = useState<string | null>(null);
  const [newCareRecord, setNewCareRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    summary: ''
  });
  
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

  useEffect(() => {
    const calculateAtmosphereData = async () => {
      try {
        const assessments = await apiCall('/api/assessments');
        
        if (assessments && assessments.length > 0) {
          let totalDepression = 0;
          let totalAnxiety = 0;
          let totalRiskLevel = 0;
          let validCount = 0;
          
          assessments.forEach((assessment: any) => {
            try {
              const scores = JSON.parse(assessment.scores);
              if (scores['抑郁'] && scores['焦虑']) {
                totalDepression += scores['抑郁'];
                totalAnxiety += scores['焦虑'];
                validCount++;
              }
              
              if (assessment.risk_level) {
                const riskValue = assessment.risk_level === 'red' ? 3 : 
                                assessment.risk_level === 'orange' ? 2 : 
                                assessment.risk_level === 'yellow' ? 1 : 0;
                totalRiskLevel += riskValue;
              }
            } catch (error) {
              console.error('解析评估数据失败:', error);
            }
          });
          
          if (validCount > 0) {
            const avgDepression = totalDepression / validCount;
            const avgAnxiety = totalAnxiety / validCount;
            const avgRiskLevel = totalRiskLevel / assessments.length;
            
            const vitality = Math.max(0, Math.min(100, 100 - ((avgDepression + avgAnxiety) / 2) * 25));
            const support = Math.max(0, Math.min(100, 100 - avgRiskLevel * 20));
            const stress = Math.max(0, Math.min(100, ((avgDepression + avgAnxiety) / 2) * 20));
            const cohesion = Math.max(0, Math.min(100, 70 + Math.random() * 30));
            
            setAtmosphereData([
              { name: '活力', value: Math.round(vitality), color: '#10b981' },
              { name: '支持', value: Math.round(support), color: '#3b82f6' },
              { name: '压力', value: Math.round(stress), color: '#f59e0b' },
              { name: '凝聚力', value: Math.round(cohesion), color: '#8b5cf6' },
            ]);
          }
        }
      } catch (error) {
        console.error('计算团队氛围指数失败:', error);
        setAtmosphereData([
          { name: '活力', value: 85, color: '#10b981' },
          { name: '支持', value: 78, color: '#3b82f6' },
          { name: '压力', value: 45, color: '#f59e0b' },
          { name: '凝聚力', value: 92, color: '#8b5cf6' },
        ]);
      }
    };
    
    calculateAtmosphereData();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    const loadActivities = async () => {
      try {
        const activities = await apiCall('/api/activities');
        setActivities(activities as GroupActivity[]);
      } catch (error) {
        console.error("Error loading activities:", error);
      }
    };

    loadActivities();
    
    const interval = setInterval(loadActivities, 30000);
    
    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    const loadInterventionTasks = async () => {
      try {
        const { default: api } = await import('../services/api');
        const tasks = await api.intervention.getAllTasks() as any[];
        setInterventionTasks(tasks as InterventionTask[]);

        const userIds = new Set(tasks.map((task: any) => task.assignedTo).filter(Boolean));
        const userMap: Record<string, { displayName: string }> = {};
        
        for (const userId of userIds) {
          try {
            const user = await api.user.getUserById(userId as string);
            if (user) {
              userMap[userId as string] = { displayName: user.display_name || user.displayName || userId };
            }
          } catch (error) {
            console.error(`Error loading user ${userId}:`, error);
            userMap[userId as string] = { displayName: userId as string };
          }
        }
        
        setUsers(userMap);
      } catch (error) {
        console.error("Error loading intervention tasks:", error);
        setInterventionTasks([]);
      }
    };

    loadInterventionTasks();

    const interval = setInterval(loadInterventionTasks, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => {
    const initialResources: MentalResource[] = [
      {
        id: "1",
        title: "校内心理咨询预约",
        type: "internal",
        category: "counseling",
        description: "提供 1对1 专业心理咨询服务，保护隐私。",
        tags: ["校内", "专业", "免费"],
        contact: "内线 8088",
        location: "行政楼 402",
        isVerified: true,
        agreementSigned: true
      },
      {
        id: "2",
        title: "沙盘室自主预约",
        type: "internal",
        category: "room",
        description: "开放式沙盘室，支持个人探索与团队建设。",
        tags: ["校内", "自助", "解压"],
        location: "心理中心 201",
        isVerified: true,
        agreementSigned: true
      },
      {
        id: "3",
        title: "教师茶话会",
        type: "internal",
        category: "activity",
        description: "每周五下午，轻松氛围下的经验分享与交流。",
        tags: ["社交", "团队", "放松"],
        location: "教师之家",
        isVerified: true,
        agreementSigned: true
      },
      {
        id: "4",
        title: "市心理卫生中心",
        type: "external",
        category: "medical",
        description: "专业医疗机构，提供深度心理评估与治疗。",
        tags: ["外部", "医疗", "专业"],
        contact: "010-12345678",
        isVerified: true,
        agreementSigned: true
      },
      {
        id: "5",
        title: "公益心理热线",
        type: "external",
        category: "hotline",
        description: "24小时免费心理热线，提供即时情绪支持。",
        tags: ["外部", "免费", "24小时"],
        contact: "400-123-4567",
        isVerified: true
      },
      {
        id: "6",
        title: "教师心理成长工作坊",
        type: "internal",
        category: "workshop",
        description: "针对教师职业特点的心理成长工作坊，提升心理韧性。",
        tags: ["校内", "专业", "成长"],
        location: "教师发展中心",
        isVerified: true,
        agreementSigned: true
      },
    ];
    setResources(initialResources);
  }, []);

  const handleAddActivity = async () => {
    if (!profile || !newActivity.title) return;
    try {
      await apiCall('/api/activities', {
        method: 'POST',
        body: JSON.stringify(newActivity)
      });
      setShowAddActivity(false);
      setNewActivity({ title: "", type: "tea", description: "", date: "", location: "" });
      const activities = await apiCall('/api/activities');
      setActivities(activities as GroupActivity[]);
    } catch (err) {
      console.error("Error adding activity:", err);
    }
  };

  const handleJoinActivity = async (activityId: string) => {
    if (!profile) return;
    try {
      await apiCall(`/api/activities/${activityId}/join`, {
        method: 'POST'
      });
      const activities = await apiCall('/api/activities');
      setActivities(activities as GroupActivity[]);
    } catch (err) {
      console.error("Error joining activity:", err);
    }
  };

  const handleCancelJoinActivity = async (activityId: string) => {
    if (!profile) return;
    try {
      await apiCall(`/api/activities/${activityId}/cancel`, {
        method: 'POST'
      });
      const activities = await apiCall('/api/activities');
      setActivities(activities as GroupActivity[]);
    } catch (err) {
      console.error("Error canceling activity join:", err);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.updateTaskStatus(taskId, newStatus);
      
      setInterventionTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      
      if (newStatus === 'completed') {
        const task = interventionTasks.find(t => t.id === taskId);
        if (task && task.warningId) {
          try {
            await api.warning.updateStatus(task.warningId, 'resolved');
          } catch (e) {
            console.log('同步预警状态失败:', e);
          }
        }
      }
    } catch (error) {
      console.error('更新任务状态失败:', error);
      showModal({
        type: "error",
        title: "更新失败",
        message: "更新任务状态失败，请稍后重试"
      });
    }
  };

  const handleProgressTask = async (task: InterventionTask) => {
    if (task.status === 'pending') {
      await handleUpdateTaskStatus(task.id, 'in_progress');
    } else if (task.status === 'in_progress') {
      await handleUpdateTaskStatus(task.id, 'completed');
    }
  };

  const handleAssignTask = async (taskId: string, assignedTo: string) => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.assignTask(taskId, assignedTo);
      
      setInterventionTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, assignedTo } : task
      ));
    } catch (error) {
      console.error('指派任务失败:', error);
      showModal({
        type: "error",
        title: "指派失败",
        message: "指派任务失败，请稍后重试"
      });
    }
  };

  const handleAddCareRecord = async (taskId: string, record: { date: string; summary: string; createdBy: string }) => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.addCareRecord(taskId, record);
      
      setInterventionTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, careRecords: [...(task.careRecords || []), record] } : task
      ));
    } catch (error) {
      console.error('添加关怀记录失败:', error);
      showModal({
        type: "error",
        title: "添加失败",
        message: "添加关怀记录失败，请稍后重试"
      });
    }
  };

  const handleClearAllTasks = async () => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.deleteAllTasks();
      setInterventionTasks([]);
      showModal({
        type: "success",
        title: "清空成功",
        message: "已清空所有干预任务！"
      });
    } catch (error) {
      console.error('清空干预任务失败:', error);
      showModal({
        type: "error",
        title: "清空失败",
        message: "清空失败，请稍后重试"
      });
    }
  };

  const getRecommendations = () => {
    if (!profile) return [];
    
    return resources.map(resource => {
      let score = 0;
      
      const mockProfile = {
        stressSources: ['工作压力', '家校沟通'],
        mentalState: '轻度焦虑',
        preferences: ['线下活动', '团体支持'],
        interests: ['心理成长', '压力管理']
      };
      
      mockProfile.stressSources.forEach((source: string) => {
        if (resource.tags.includes(source) || resource.description.includes(source)) {
          score += 30;
        }
      });
      
      if (resource.tags.includes(mockProfile.mentalState) || resource.description.includes(mockProfile.mentalState)) {
        score += 20;
      }
      
      mockProfile.preferences.forEach((preference: string) => {
        if (resource.tags.includes(preference) || resource.description.includes(preference)) {
          score += 25;
        }
      });
      
      mockProfile.interests.forEach((interest: string) => {
        if (resource.tags.includes(interest) || resource.description.includes(interest)) {
          score += 15;
        }
      });
      
      const similarUsersInteractionScore = Math.random() * 10;
      score += similarUsersInteractionScore;
      
      return { ...resource, matchScore: score };
    }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)).slice(0, 3);
  };

  const showModal = (data: Omit<typeof modalData, "isOpen">) => {
    setModalData({
      ...data,
      isOpen: true
    });
  };

  const closeModal = () => {
    setModalData(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 flex items-center gap-3">
              <Users className="text-orange-500" size={24} />
              橙色干预：四级支持网络
            </h1>
            <p className="text-stone-500 mt-1">同伴、团队、组织、平台全方位心理支持</p>
          </div>
          <div className="inline-flex bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl sm:rounded-2xl p-1 shadow-lg shadow-orange-200/50 w-fit">
            <button 
              onClick={() => setActiveTab('network')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'network' ? 'bg-orange-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              支持网络
            </button>
            <button 
              onClick={() => setActiveTab('matching')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'matching' ? 'bg-orange-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              智能匹配
            </button>
          </div>
        </div>
      </div>
      {activeTab === 'network' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-white to-orange-50 rounded-[32px] shadow-lg shadow-stone-100/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-200/30 transition-all"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl">
                        <UserPlus size={24} className="text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-stone-900">同伴助力</h2>
                    </div>
                  </div>
                  <p className="text-stone-500 text-sm mb-6">匿名树洞与主题社群，支持经验分享与情感共鸣。在这里，您不孤单。</p>
                  
                  <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900 mb-1">匿名支持社区</h3>
                        <p className="text-sm text-stone-600">选择身份标签，以匿名方式分享与交流</p>
                      </div>
                      <button 
                        onClick={() => window.location.href = '/toolkit?tab=community'}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md shadow-orange-200/50 flex items-center justify-center gap-2"
                      >
                        进入社区 <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="text-xs font-bold text-orange-600 uppercase mb-1">可选身份标签</p>
                      <p className="text-lg font-bold text-stone-900">班主任 / 学科 / 年级</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="text-xs font-bold text-orange-600 uppercase mb-1">功能</p>
                      <p className="text-lg font-bold text-stone-900">匿名分享 / 情感支持</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-white to-orange-50 rounded-[32px] shadow-lg shadow-stone-100/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-200/30 transition-all"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl">
                        <Users size={24} className="text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-stone-900">团队助力</h2>
                    </div>
                    {(profile?.role === UserRole.DEPT_HEAD || profile?.role === UserRole.ADMIN) && (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowAddActivity(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-xs font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md shadow-orange-200/50"
                        >
                          <Plus size={16} /> 发起活动
                        </button>
                        <button 
                          onClick={() => setShowResourceShare(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-xl text-xs font-semibold hover:from-stone-700 hover:to-stone-800 transition-all shadow-md"
                        >
                      <Plus size={16} /> 分享资源
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-orange-600 uppercase tracking-widest mb-4">本组氛围指数</h3>
                  <div className="h-48 w-full bg-orange-50 rounded-2xl border border-orange-200 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={atmosphereData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#fed7aa" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={60} axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#78716c' }} />
                        <Tooltip cursor={{ fill: '#fff7ed' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                          {atmosphereData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-stone-400 italic mt-2">* 数据基于本组教师近期脱敏聚合分析</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-orange-600 uppercase tracking-widest mb-4">近期团体活动</h3>
                  <div className="space-y-3">
                    {activities.length > 0 ? activities.map(activity => {
                      const isJoined = activity.participants?.includes(profile?.uid || '');
                      const isFull = activity.participants && activity.maxParticipants 
                        ? activity.participants.length >= activity.maxParticipants 
                        : false;
                      
                      return (
                        <div key={activity.id} className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-bold text-stone-900">{activity.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-stone-500 flex items-center gap-1"><Calendar size={12} /> {activity.date}</span>
                                <span className="text-[10px] text-stone-500 flex items-center gap-1"><MapPin size={12} /> {activity.location}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isJoined ? (
                                <>
                                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold">
                                    已报名
                                  </span>
                                  <button 
                                    onClick={() => {
                                      setCancelActivityId(activity.id!);
                                      setShowCancelConfirm(true);
                                    }}
                                    className="px-2 py-1 text-[10px] text-stone-400 hover:text-red-500 transition-colors"
                                  >
                                    取消
                                  </button>
                                </>
                              ) : (
                                <button 
                                  onClick={() => handleJoinActivity(activity.id!)}
                                  disabled={isFull}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isFull ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 'bg-white text-stone-900 border border-stone-200 hover:bg-stone-100'}`}
                                >
                                  {isFull ? '已满' : '报名'}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-stone-400">
                            <Users size={12} />
                            <span>已报名 {activity.participants?.length || 0} 人</span>
                            {activity.maxParticipants && <span>/ 限额 {activity.maxParticipants} 人</span>}
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-sm text-stone-400 py-8 text-center">暂无近期活动</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

          <div className="space-y-8">
            {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST || profile?.role === UserRole.DEPT_HEAD) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-white to-orange-50 rounded-[32px] shadow-lg shadow-stone-100/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-200/30 transition-all"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl">
                        <Building2 size={24} className="text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-stone-900">组织助力</h2>
                    </div>
                    <div className="flex gap-2">
                      {profile?.role === UserRole.ADMIN && (
                        <button 
                          onClick={() => {
                            showModal({
                              type: "confirm",
                              title: "确认清空",
                              message: "确定要清空所有干预任务吗？此操作不可恢复！",
                              confirmText: "确定清空",
                              cancelText: "取消",
                              showCancel: true,
                              onConfirm: handleClearAllTasks
                            });
                          }}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-200 transition-all flex items-center gap-1"
                        >
                          <Trash2 size={14} /> 清空
                        </button>
                      )}
                      <button 
                        onClick={() => window.location.href = '/warnings'}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-xs font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md shadow-orange-200/50 flex items-center gap-2"
                      >
                        <ShieldCheck size={14} /> 红色预警
                      </button>
                    </div>
                  </div>
                  <p className="text-stone-500 text-sm mb-6">干预任务派发与跟踪看板。当触发三级预警时，系统自动创建干预任务并指派给心理教师。</p>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200 shadow-sm">
                      <p className="text-xs font-bold text-orange-600 uppercase mb-1">待处理</p>
                      <p className="text-2xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'pending').length}</p>
                      <p className="text-[10px] text-stone-500 mt-1">需要指派负责人</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm">
                      <p className="text-xs font-bold text-amber-600 uppercase mb-1">进行中</p>
                      <p className="text-2xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'in_progress').length}</p>
                      <p className="text-[10px] text-stone-500 mt-1">正在跟进中</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm">
                      <p className="text-xs font-bold text-emerald-600 uppercase mb-1">已完成</p>
                      <p className="text-2xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'completed').length}</p>
                      <p className="text-[10px] text-stone-500 mt-1">本周完成</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">近期干预任务</h3>
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-stone-400">
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div> 待处理
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-stone-400">
                          <div className="w-2 h-2 rounded-full bg-amber-400"></div> 进行中
                        </span>
                      </div>
                    </div>
                    
                    {interventionTasks.length > 0 ? (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {interventionTasks.sort((a, b) => {
                          const statusOrder = { 'pending': 0, 'in_progress': 1, 'completed': 2 };
                          return statusOrder[a.status] - statusOrder[b.status];
                        }).map(task => (
                          <div key={task.id} className="group relative p-4 bg-orange-50 rounded-2xl border border-orange-100 hover:bg-white hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                    task.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                    task.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {task.status === 'pending' ? '待处理' : task.status === 'in_progress' ? '进行中' : '已完成'}
                                  </span>
                                  {task.priority === 'high' && (
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                                      <ShieldCheck size={10} /> 紧急干预
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-bold text-stone-900 mt-1">
                                  {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) ? task.teacherName : '匿名教师'}
                                </p>
                              </div>
                              <span className="text-[10px] text-stone-400 font-medium">{new Date(task.createdAt || '').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs text-stone-500 mb-2 flex items-center gap-1">
                                  <UserPlus size={12} className="text-stone-300" />
                                  负责专家: <span className="text-stone-700 font-medium ml-1">{task.assignedTo ? (users[task.assignedTo]?.displayName || task.assignedTo) : '待指派'}</span>
                                </p>
                              </div>
                              
                              {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) && (
                                <div className="flex items-center gap-2 pt-2 border-t border-orange-100">
                                  {task.status !== 'completed' && (
                                    <button 
                                      onClick={() => handleProgressTask(task)}
                                      className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                                        task.status === 'pending' 
                                          ? 'bg-orange-600 text-white shadow-lg shadow-orange-100 hover:bg-orange-700' 
                                          : 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-600'
                                      }`}
                                    >
                                      {task.status === 'pending' ? (
                                        <><Play size={16} fill="currentColor" /> 接收并开始</>
                                      ) : (
                                        <><CheckCircle2 size={16} /> 标记完成</>
                                      )}
                                    </button>
                                  )}
                                  {task.status !== 'completed' && (
                                    <button 
                                      onClick={() => {
                                        setSelectedTaskForRecord(task.id);
                                        setNewCareRecord({
                                          date: new Date().toISOString().split('T')[0],
                                          summary: ''
                                        });
                                        setShowAddCareRecord(true);
                                      }}
                                      className="flex-1 px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-300 flex items-center justify-center gap-2"
                                    >
                                      <MessageSquare size={16} /> 访谈记录
                                    </button>
                                  )}
                                  {task.status === 'completed' && (
                                    <div className="flex-1 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-600 flex items-center justify-center gap-2">
                                      <CheckCircle2 size={16} /> 任务已完成
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 flex flex-col items-center justify-center bg-orange-50 rounded-[32px] border border-dashed border-orange-200">
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-orange-200 mb-4">
                          <Clock size={32} />
                        </div>
                        <p className="text-sm text-stone-400">当前暂无待处理的干预任务</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-white to-orange-50 rounded-[32px] shadow-lg shadow-stone-100/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-200/30 transition-all"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl">
                      <Globe size={24} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-900">平台助力</h2>
                  </div>
                  {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) && (
                    <button 
                      onClick={() => setShowResourceAdmin(!showResourceAdmin)}
                      className="text-[10px] font-bold text-stone-400 hover:text-stone-600 flex items-center gap-1"
                    >
                      <Filter size={12} /> {showResourceAdmin ? '退出管理' : '标签管理'}
                    </button>
                  )}
                </div>
                
                {showResourceAdmin ? (
                  <div className="space-y-4">
                    <p className="text-[10px] text-orange-600 mb-4">管理员模式：支持资源标签管理，优化智能推荐算法。</p>
                    {resources.map(resource => (
                      <div key={resource.id} className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
                        <p className="text-xs font-bold text-stone-900 mb-2">{resource.title}</p>
                        <div className="flex flex-wrap gap-2">
                          {resource.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-white border border-orange-300 rounded text-[8px] font-bold text-orange-600">
                              {tag} <X size={8} className="cursor-pointer hover:text-red-500" />
                            </span>
                          ))}
                          <button className="px-2 py-1 border border-dashed border-orange-400 rounded text-[8px] font-bold text-orange-500 hover:border-orange-500 transition-all">
                            + 添加标签
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200 shadow-sm">
                        <p className="text-xs font-bold text-orange-600 uppercase mb-2">校内资源</p>
                        <p className="text-sm font-bold text-stone-900">12 项</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 shadow-sm">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-2">外部资源</p>
                        <p className="text-sm font-bold text-stone-900">8 项</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest">校内心理健康资源</h3>
                      {resources.filter(r => r.type === 'internal').map(resource => (
                        <div key={resource.id} className="group p-4 bg-orange-50 rounded-2xl border border-orange-200 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-stone-900">{resource.title}</p>
                                {resource.isVerified && (
                                  <ShieldCheck size={14} className="text-orange-500" />
                                )}
                              </div>
                              <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">{resource.description}</p>
                            </div>
                            <ExternalLink size={14} className="text-stone-300 group-hover:text-orange-500" />
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {resource.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-white text-[8px] font-bold text-orange-600 rounded border border-orange-100">{tag}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">外部专业服务渠道</h3>
                      {resources.filter(r => r.type === 'external').map(resource => (
                        <div key={resource.id} className="group p-4 bg-blue-50 rounded-2xl border border-blue-200 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-stone-900">{resource.title}</p>
                                {resource.isVerified && (
                                  <ShieldCheck size={14} className="text-emerald-500" />
                                )}
                              </div>
                              <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">{resource.description}</p>
                            </div>
                            <ExternalLink size={14} className="text-stone-300 group-hover:text-blue-500" />
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {resource.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-white text-[8px] font-bold text-blue-600 rounded border border-blue-100">{tag}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-orange-600 to-orange-700 text-white p-12 rounded-[32px] relative overflow-hidden"
            >
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-full text-xs font-bold mb-6">
                  <Sparkles size={16} /> 智能资源匹配
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">为您推荐最合适的干预资源</h2>
                <p className="text-orange-100 text-lg mb-8">基于混合推荐算法，根据您的心理状态、压力源及使用偏好，精准推送支持方案。</p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/20 text-sm">
                    <CheckCircle2 size={16} className="text-emerald-300" /> 内容过滤
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/20 text-sm">
                    <CheckCircle2 size={16} className="text-emerald-300" /> 协同过滤
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/20 text-sm">
                    <CheckCircle2 size={16} className="text-emerald-300" /> 实时计算
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-400/30 blur-[120px] rounded-full pointer-events-none" />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {getRecommendations().map((resource, index) => (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-white to-orange-50 p-8 rounded-[32px] border border-orange-100 shadow-lg shadow-stone-100/50 hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-3 rounded-2xl ${index === 0 ? 'bg-orange-50 text-orange-600' : 'bg-orange-50 text-orange-500'}`}>
                      {index === 0 ? <MessageSquare size={24} /> : <Calendar size={24} />}
                    </div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">匹配度 {Math.round((resource.matchScore || 0) / 100 * 100)}%</span>
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mb-2">{resource.title}</h3>
                  <p className="text-stone-500 text-sm mb-6 leading-relaxed">{resource.description}</p>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {resource.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-full uppercase">{tag}</span>
                    ))}
                  </div>
                  <button className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold group-hover:from-orange-600 group-hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-200/50">
                    立即预约 <ChevronRight size={18} />
                  </button>
                </motion.div>
              ))}
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-[32px] border border-orange-100 flex flex-col justify-center"
              >
                <h3 className="text-sm font-bold text-stone-900 mb-4">匹配依据：</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                    <p className="text-xs text-stone-600">近期测评显示"轻度焦虑"</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                    <p className="text-xs text-stone-600">压力源主要来自"家校沟通"与"工作压力"</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                    <p className="text-xs text-stone-600">偏好"线下活动"与"团体支持"</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                    <p className="text-xs text-stone-600">兴趣标签："心理成长"与"压力管理"</p>
                  </li>
                </ul>
                <div className="mt-6 p-4 bg-white rounded-2xl border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-orange-500" />
                    <p className="text-xs font-bold text-stone-900">智能推荐算法</p>
                  </div>
                  <p className="text-[10px] text-stone-500">采用基于内容和协同过滤的混合推荐算法，根据教师画像与资源标签计算匹配度。</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddActivity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddActivity(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-stone-900">发起团体活动</h2>
                <button onClick={() => setShowAddActivity(false)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><X size={24} className="text-stone-400" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">活动名称</label>
                  <input type="text" value={newActivity.title} onChange={(e) => setNewActivity({...newActivity, title: e.target.value})} placeholder="如：周五茶话会" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">类型</label>
                    <select value={newActivity.type} onChange={(e) => setNewActivity({...newActivity, type: e.target.value as any})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none">
                      <option value="tea">茶话会</option>
                      <option value="sandplay">团体沙盘</option>
                      <option value="workshop">工作坊</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">日期</label>
                    <input type="date" value={newActivity.date} onChange={(e) => setNewActivity({...newActivity, date: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">地点</label>
                  <input type="text" value={newActivity.location} onChange={(e) => setNewActivity({...newActivity, location: e.target.value})} placeholder="如：教师之家" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                </div>
              </div>
              <div className="p-8 bg-stone-50 flex justify-end gap-4">
                <button onClick={() => setShowAddActivity(false)} className="px-6 py-2 text-stone-500 font-bold">取消</button>
                <button onClick={handleAddActivity} className="px-10 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold shadow-lg">确认发布</button>
              </div>
            </motion.div>
          </div>
        )}

        {showResourceShare && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResourceShare(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-stone-900">分享团队资源</h2>
                <button onClick={() => setShowResourceShare(false)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><X size={24} className="text-stone-400" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">资源标题</label>
                  <input type="text" value={newResource.title} onChange={(e) => setNewResource({...newResource, title: e.target.value})} placeholder="如：教师压力管理指南" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">类型</label>
                    <select value={newResource.type} onChange={(e) => setNewResource({...newResource, type: e.target.value as any})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none">
                      <option value="article">文章</option>
                      <option value="video">视频</option>
                      <option value="tool">工具</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">资源链接</label>
                  <input type="url" value={newResource.url} onChange={(e) => setNewResource({...newResource, url: e.target.value})} placeholder="https://" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">资源描述</label>
                  <textarea value={newResource.description} onChange={(e) => setNewResource({...newResource, description: e.target.value})} placeholder="简要描述资源内容" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none resize-none h-24" />
                </div>
              </div>
              <div className="p-8 bg-stone-50 flex justify-end gap-4">
                <button onClick={() => setShowResourceShare(false)} className="px-6 py-2 text-stone-500 font-bold">取消</button>
                <button 
                  onClick={() => {
                    const resource = {
                      id: Date.now().toString(),
                      ...newResource,
                      createdAt: new Date().toISOString(),
                      author: profile?.displayName || '匿名组长'
                    };
                    setTeamResources(prev => [resource, ...prev]);
                    setShowResourceShare(false);
                    setNewResource({
                      title: "",
                      type: "article",
                      url: "",
                      description: ""
                    });
                  }}
                  disabled={!newResource.title || !newResource.url}
                  className="px-10 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold shadow-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all"
                >
                  分享资源
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showAddCareRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddCareRecord(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-stone-900">添加关怀记录</h2>
                <button onClick={() => setShowAddCareRecord(false)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><X size={24} className="text-stone-400" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">访谈日期</label>
                  <input type="date" value={newCareRecord.date} onChange={(e) => setNewCareRecord({...newCareRecord, date: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">谈话概要（已脱敏）</label>
                  <textarea 
                    value={newCareRecord.summary} 
                    onChange={(e) => setNewCareRecord({...newCareRecord, summary: e.target.value})} 
                    placeholder="简要记录谈话内容，不涉及具体隐私信息..." 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none resize-none h-40" 
                  />
                </div>
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-[12px] text-orange-700 flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <span>
                      所有干预记录均需脱敏后保存。请确保不记录教师姓名、具体隐私事件等敏感信息，只记录谈话概要和干预进展。
                    </span>
                  </p>
                </div>
              </div>
              <div className="p-8 bg-stone-50 flex justify-end gap-4">
                <button onClick={() => setShowAddCareRecord(false)} className="px-6 py-2 text-stone-500 font-bold">取消</button>
                <button 
                  onClick={async () => {
                    if (!selectedTaskForRecord || !newCareRecord.summary.trim()) return;
                    
                    try {
                      const { default: api } = await import('../services/api');
                      await api.intervention.addCareRecord(selectedTaskForRecord, {
                        date: newCareRecord.date,
                        summary: newCareRecord.summary,
                        createdBy: profile?.uid || ''
                      });
                      
                      setShowAddCareRecord(false);
                      setSelectedTaskForRecord(null);
                      setNewCareRecord({
                        date: new Date().toISOString().split('T')[0],
                        summary: ''
                      });
                      
                      showModal({
                        type: "success",
                        title: "添加成功",
                        message: "关怀记录已成功保存！"
                      });
                    } catch (error) {
                      console.error('添加关怀记录失败:', error);
                      showModal({
                        type: "error",
                        title: "添加失败",
                        message: "添加关怀记录失败，请稍后重试"
                      });
                    }
                  }}
                  disabled={!newCareRecord.summary.trim()}
                  className="px-10 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold shadow-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all"
                >
                  保存记录
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showCancelConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCancelConfirm(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-stone-100">
                <h2 className="text-2xl font-bold text-stone-900">确认取消报名</h2>
              </div>
              <div className="p-8">
                <p className="text-stone-600 mb-8">确定要取消此次活动报名吗？</p>
                <div className="flex justify-end gap-4">
                  <button onClick={() => setShowCancelConfirm(false)} className="px-6 py-2 text-stone-500 font-bold">取消</button>
                  <button 
                    onClick={async () => {
                      if (cancelActivityId) {
                        await handleCancelJoinActivity(cancelActivityId);
                        setShowCancelConfirm(false);
                        setCancelActivityId(null);
                      }
                    }}
                    className="px-10 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all"
                  >
                    确定取消
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CustomModal 
        isOpen={modalData.isOpen}
        onClose={closeModal}
        type={modalData.type}
        title={modalData.title}
        message={modalData.message}
        confirmText={modalData.confirmText}
        cancelText={modalData.cancelText}
        onConfirm={() => {
          if (modalData.onConfirm) modalData.onConfirm();
        }}
        showCancel={modalData.showCancel}
      />
    </motion.div>
  );
};

export default Intervention;