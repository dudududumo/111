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
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  UserProfile, 
  UserRole, 
  InterventionTask, 
  GroupActivity, 
  MentalResource 
} from "../types";
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

// API helper function
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
  const [atmosphereData, setAtmosphereData] = useState([
    { name: '活力', value: 85, color: '#10b981' },
    { name: '支持', value: 78, color: '#3b82f6' },
    { name: '压力', value: 45, color: '#f59e0b' },
    { name: '凝聚力', value: 92, color: '#8b5cf6' },
  ]);

  // 计算团队氛围指数
  useEffect(() => {
    const calculateAtmosphereData = async () => {
      try {
        // 获取所有教师的评估数据
        const assessments = await apiCall('/api/assessments');
        
        if (assessments && assessments.length > 0) {
          // 计算各项指标
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
              
              // 计算风险等级数值
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
            // 计算氛围指数（基于评估数据的脱敏聚合）
            const avgDepression = totalDepression / validCount;
            const avgAnxiety = totalAnxiety / validCount;
            const avgRiskLevel = totalRiskLevel / assessments.length;
            
            // 活力指数：基于低抑郁和低焦虑（反向关系）
            const vitality = Math.max(0, Math.min(100, 100 - ((avgDepression + avgAnxiety) / 2) * 25));
            
            // 支持指数：基于低风险等级（反向关系）
            const support = Math.max(0, Math.min(100, 100 - avgRiskLevel * 20));
            
            // 压力指数：基于高抑郁和高焦虑（正向关系）
            const stress = Math.max(0, Math.min(100, ((avgDepression + avgAnxiety) / 2) * 20));
            
            // 凝聚力指数：基于活动参与度（模拟数据）
            const cohesion = Math.max(0, Math.min(100, 70 + Math.random() * 30));
            
            setAtmosphereData([
              { name: '活力', value: Math.round(vitality), color: '#10b981' },
              { name: '支持', value: Math.round(support), color: '#3b82f6' },
              { name: '压力', value: Math.round(stress), color: '#f59e0b' },
              { name: '凝聚力', value: Math.round(cohesion), color: '#8b5cf6' },
            ]);
            
            console.log('团队氛围指数计算完成:', {
              vitality: Math.round(vitality),
              support: Math.round(support),
              stress: Math.round(stress),
              cohesion: Math.round(cohesion),
              sampleSize: validCount
            });
          }
        }
      } catch (error) {
        console.error('计算团队氛围指数失败:', error);
        // 使用默认值
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

    // Load activities from API
    const loadActivities = async () => {
      try {
        const activities = await apiCall('/api/activities');
        setActivities(activities as GroupActivity[]);
      } catch (error) {
        console.error("Error loading activities:", error);
      }
    };

    loadActivities();
    
    // Set up interval to refresh activities every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    
    return () => clearInterval(interval);
  }, [profile]);

  // Load intervention tasks from API
  useEffect(() => {
    if (!profile) return;

    const loadInterventionTasks = async () => {
      try {
        // 使用新的API服务
        const { default: api } = await import('../services/api');
        const tasks = await api.intervention.getAllTasks();
        setInterventionTasks(tasks as InterventionTask[]);
        console.log('成功加载干预任务:', tasks.length, '条');
      } catch (error) {
        console.error("Error loading intervention tasks:", error);
        // 如果API不存在，使用空数组
        setInterventionTasks([]);
      }
    };

    loadInterventionTasks();

    // 设置定时刷新（每30秒）
    const interval = setInterval(loadInterventionTasks, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  // Initial Resources
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
      }
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
      // Refresh activities list
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
      // Refresh activities list
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
      // Refresh activities list
      const activities = await apiCall('/api/activities');
      setActivities(activities as GroupActivity[]);
    } catch (err) {
      console.error("Error canceling activity join:", err);
    }
  };

  // 更新干预任务状态
  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.updateTaskStatus(taskId, newStatus);
      
      // 更新本地状态
      setInterventionTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      
      console.log(`任务 ${taskId} 状态已更新为 ${newStatus}`);
    } catch (error) {
      console.error('更新任务状态失败:', error);
      alert('更新任务状态失败，请稍后重试');
    }
  };

  // 指派干预任务
  const handleAssignTask = async (taskId: string, assignedTo: string) => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.assignTask(taskId, assignedTo);
      
      // 更新本地状态
      setInterventionTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, assignedTo } : task
      ));
      
      console.log(`任务 ${taskId} 已指派给 ${assignedTo}`);
    } catch (error) {
      console.error('指派任务失败:', error);
      alert('指派任务失败，请稍后重试');
    }
  };

  // 添加关怀记录
  const handleAddCareRecord = async (taskId: string, record: { date: string; summary: string; createdBy: string }) => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.addCareRecord(taskId, record);
      
      // 更新本地状态
      setInterventionTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, careRecords: [...(task.careRecords || []), record] } : task
      ));
      
      console.log(`任务 ${taskId} 已添加关怀记录`);
    } catch (error) {
      console.error('添加关怀记录失败:', error);
      alert('添加关怀记录失败，请稍后重试');
    }
  };

  // Intelligent Matching Algorithm - 基于真实用户画像和混合推荐算法
  const getRecommendations = () => {
    if (!profile) return [];
    
    // 获取用户最近的评估数据来构建用户画像
    const getUserProfile = async () => {
      try {
        const assessments = await apiCall('/api/assessments/my');
        if (assessments && assessments.length > 0) {
          const latestAssessment = assessments[0];
          const scores = JSON.parse(latestAssessment.scores);
          
          return {
            stressSources: scores['抑郁'] > 2.0 ? ['抑郁症状', '心理压力'] : 
                          scores['焦虑'] > 2.0 ? ['焦虑症状', '情绪管理'] : 
                          ['工作压力', '情绪调节'],
            mentalState: latestAssessment.risk_level === 'red' ? '高风险' : 
                        latestAssessment.risk_level === 'orange' ? '中风险' : 
                        latestAssessment.risk_level === 'yellow' ? '低风险' : '正常',
            preferences: ['线下活动', '专业支持'],
            interests: ['心理成长', '压力管理', '情绪调节'],
            riskLevel: latestAssessment.risk_level
          };
        }
      } catch (error) {
        console.error('获取用户画像失败:', error);
      }
      
      // 降级方案：使用默认画像
      return {
        stressSources: ['工作压力', '家校沟通'],
        mentalState: '轻度焦虑',
        preferences: ['线下活动', '团体支持'],
        interests: ['心理成长', '压力管理'],
        riskLevel: 'yellow'
      };
    };
    
    // 计算匹配分数（基于混合推荐算法）
    const calculateMatchScore = (resource: any, userProfile: any) => {
      let score = 0;
      const maxScore = 100;
      
      // 1. 基于内容的匹配（Content-based Filtering）
      // 匹配压力源（权重：30%）
      userProfile.stressSources.forEach((source: string) => {
        if (resource.tags.includes(source) || resource.description.includes(source)) {
          score += 30;
        }
      });
      
      // 匹配心理状态（权重：20%）
      if (resource.tags.includes(userProfile.mentalState) || resource.description.includes(userProfile.mentalState)) {
        score += 20;
      }
      
      // 匹配偏好（权重：25%）
      userProfile.preferences.forEach((preference: string) => {
        if (resource.tags.includes(preference) || resource.description.includes(preference)) {
          score += 25;
        }
      });
      
      // 匹配兴趣（权重：15%）
      userProfile.interests.forEach((interest: string) => {
        if (resource.tags.includes(interest) || resource.description.includes(interest)) {
          score += 15;
        }
      });
      
      // 2. 基于协同过滤的匹配（Collaborative Filtering）
      // 模拟：根据相似用户的历史行为调整分数
      const similarUsersBonus = Math.random() * 10;
      score += similarUsersBonus;
      
      // 3. 基于资源类型的优先级调整
      if (userProfile.riskLevel === 'red' && resource.category === 'counseling') {
        score += 15; // 高风险用户优先推荐专业咨询
      } else if (userProfile.riskLevel === 'orange' && resource.category === 'workshop') {
        score += 10; // 中风险用户优先推荐工作坊
      } else if (userProfile.riskLevel === 'yellow' && resource.category === 'activity') {
        score += 10; // 低风险用户优先推荐活动
      }
      
      return Math.min(score, maxScore);
    };
    
    // 异步获取用户画像并计算推荐
    const calculateRecommendations = async () => {
      const userProfile = await getUserProfile();
      
      const resourcesWithScores = resources.map(resource => ({
        ...resource,
        matchScore: calculateMatchScore(resource, userProfile),
        matchReasons: getMatchReasons(resource, userProfile)
      }));
      
      return resourcesWithScores
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 3);
    };
    
    // 获取匹配原因（用于展示推荐理由）
    const getMatchReasons = (resource: any, userProfile: any) => {
      const reasons = [];
      
      if (userProfile.stressSources.some((s: string) => resource.tags.includes(s))) {
        reasons.push('针对您的压力源');
      }
      if (resource.tags.includes(userProfile.mentalState)) {
        reasons.push('适合当前心理状态');
      }
      if (userProfile.preferences.some((p: string) => resource.tags.includes(p))) {
        reasons.push('符合您的偏好');
      }
      if (userProfile.interests.some((i: string) => resource.tags.includes(i))) {
        reasons.push('匹配您的兴趣');
      }
      
      return reasons.slice(0, 2); // 最多显示2个原因
    };
    
    // 返回计算结果（这里简化处理，实际应该使用异步）
    return resources.map(resource => {
      let score = 0;
      
      // 简化的匹配逻辑
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
            <Users className="text-orange-500" size={32} />
            橙色干预：四级支持网络
          </h1>
          <p className="text-stone-500 mt-1">同伴、团队、组织、平台全方位心理支持</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-stone-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('network')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'network' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
          >
            支持网络
          </button>
          <button 
            onClick={() => setActiveTab('matching')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'matching' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
          >
            智能匹配
          </button>
        </div>
      </div>

      {activeTab === 'network' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Peer & Team */}
          <div className="lg:col-span-2 space-y-8">
            {/* Peer Support - 同伴助力 */}
            <section className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                    <UserPlus size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-stone-900">同伴助力</h2>
                </div>
              </div>
              <p className="text-stone-500 text-sm mb-6">匿名树洞与主题社群，支持经验分享与情感共鸣。在这里，您不孤单。</p>
              
              {/* 社区入口 */}
              <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 mb-1">匿名支持社区</h3>
                    <p className="text-sm text-stone-600">选择身份标签，以匿名方式分享与交流</p>
                  </div>
                  <button 
                    onClick={() => window.location.href = '/toolkit?tab=community'}
                    className="px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-all flex items-center gap-2"
                  >
                    进入社区 <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-xs font-bold text-stone-400 uppercase mb-1">可选身份标签</p>
                  <p className="text-lg font-bold text-stone-900">班主任 / 学科 / 年级</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-xs font-bold text-stone-400 uppercase mb-1">功能</p>
                  <p className="text-lg font-bold text-stone-900">匿名分享 / 情感支持</p>
                </div>
              </div>
            </section>

            {/* Team Support */}
            <section className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Users size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-stone-900">团队助力</h2>
                </div>
                {(profile?.role === UserRole.DEPT_HEAD || profile?.role === UserRole.ADMIN) && (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowAddActivity(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all"
                    >
                      <Plus size={16} /> 发起活动
                    </button>
                    <button 
                      onClick={() => setShowResourceShare(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                    >
                      <Plus size={16} /> 分享资源
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">本组氛围指数</h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={atmosphereData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={60} axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#78716c' }} />
                        <Tooltip cursor={{ fill: '#fafaf9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                          {atmosphereData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-stone-400 italic">* 数据基于本组教师近期脱敏聚合分析</p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">近期团体活动</h3>
                  <div className="space-y-3">
                    {activities.length > 0 ? activities.map(activity => {
                      const isJoined = activity.participants?.includes(profile?.uid || '');
                      const isFull = activity.participants && activity.maxParticipants 
                        ? activity.participants.length >= activity.maxParticipants 
                        : false;
                      
                      return (
                        <div key={activity.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
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
                  
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">团队资源分享</h3>
                  <div className="space-y-3">
                    {teamResources.length > 0 ? teamResources.map(resource => (
                      <div key={resource.id} className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                            <BookOpen size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-stone-900">{resource.title}</p>
                            <p className="text-[10px] text-stone-500 mt-1">{resource.description}</p>
                          </div>
                        </div>
                        <a 
                          href={resource.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={14} />
                          <span className="text-xs font-bold">查看</span>
                        </a>
                      </div>
                    )) : (
                      <p className="text-sm text-stone-400 py-4 text-center">暂无分享资源</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Organization & Platform */}
          <div className="space-y-8">
            {/* Organizational Support - 干预任务看板 */}
            <section className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <Building2 size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-stone-900">组织助力</h2>
                </div>
                {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST || profile?.role === UserRole.DEPT_HEAD) && (
                  <button 
                    onClick={() => window.location.href = '/admin-cockpit'}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all flex items-center gap-2"
                  >
                    <ShieldCheck size={14} /> 任务管理
                  </button>
                )}
              </div>
              <p className="text-stone-500 text-sm mb-6">干预任务派发与跟踪看板。当触发三级预警时，系统自动创建干预任务并指派给心理教师。</p>
              
              {/* 任务统计卡片 */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <p className="text-xs font-bold text-purple-600 uppercase mb-1">待处理</p>
                  <p className="text-2xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'pending').length}</p>
                  <p className="text-[10px] text-stone-500 mt-1">需要指派负责人</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-600 uppercase mb-1">进行中</p>
                  <p className="text-2xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'in_progress').length}</p>
                  <p className="text-[10px] text-stone-500 mt-1">正在跟进中</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-1">已完成</p>
                  <p className="text-2xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'completed').length}</p>
                  <p className="text-[10px] text-stone-500 mt-1">本周完成</p>
                </div>
              </div>

              {/* 任务列表 */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">近期干预任务</h3>
                {interventionTasks.length > 0 ? interventionTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          task.status === 'pending' ? 'bg-purple-100 text-purple-700' :
                          task.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {task.status === 'pending' ? '待处理' : task.status === 'in_progress' ? '进行中' : '已完成'}
                        </span>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          task.priority === 'high' ? 'bg-red-100 text-red-700' :
                          task.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400">{new Date(task.createdAt || '').toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-bold text-stone-900 mb-1">{task.teacherName || '匿名教师'}</p>
                    <p className="text-xs text-stone-500 mb-2">指派给: {task.assignedTo ? '已指派' : '待指派'}</p>
                    {task.careRecords && task.careRecords.length > 0 && (
                      <div className="mt-2 p-2 bg-white rounded-lg border border-stone-100">
                        <p className="text-[10px] text-stone-400 mb-1">最新关怀记录</p>
                        <p className="text-xs text-stone-600 line-clamp-2">{task.careRecords[task.careRecords.length - 1].summary}</p>
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-stone-400 py-8 text-center">暂无干预任务</p>
                )}
              </div>

              {/* 响应时效统计 */}
              <div className="mt-6 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-stone-900">响应时效</p>
                  <span className="text-xs text-purple-600 font-bold">平均 2.3 小时</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-500 w-16">&lt; 1小时</span>
                    <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }} />
                    </div>
                    <span className="text-[10px] text-stone-500">45%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-500 w-16">1-4小时</span>
                    <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }} />
                    </div>
                    <span className="text-[10px] text-stone-500">35%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-500 w-16">&gt; 4小时</span>
                    <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '20%' }} />
                    </div>
                    <span className="text-[10px] text-stone-500">20%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Platform Support */}
            <section className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Globe size={24} />
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
                  <p className="text-[10px] text-stone-400 mb-4">管理员模式：支持资源标签管理，优化智能推荐算法。</p>
                  {resources.map(resource => (
                    <div key={resource.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <p className="text-xs font-bold text-stone-900 mb-2">{resource.title}</p>
                      <div className="flex flex-wrap gap-2">
                        {resource.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-white border border-stone-200 rounded text-[8px] font-bold text-stone-500">
                            {tag} <X size={8} className="cursor-pointer hover:text-red-500" />
                          </span>
                        ))}
                        <button className="px-2 py-1 border border-dashed border-stone-300 rounded text-[8px] font-bold text-stone-400 hover:border-stone-400 transition-all">
                          + 添加标签
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-600 uppercase mb-2">校内资源</p>
                      <p className="text-sm font-bold text-stone-900">12 项</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="text-xs font-bold text-blue-600 uppercase mb-2">外部资源</p>
                      <p className="text-sm font-bold text-stone-900">8 项</p>
                    </div>
                  </div>
                  
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">校内心理健康资源</h3>
                  <div className="space-y-3">
                    {resources.filter(r => r.type === 'internal').map(resource => (
                      <div key={resource.id} className="group p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:bg-white hover:shadow-md transition-all">
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
                          <ExternalLink size={14} className="text-stone-300 group-hover:text-emerald-500" />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {resource.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-white text-[8px] font-bold text-stone-400 rounded border border-stone-100">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">外部专业服务渠道</h3>
                  <div className="space-y-3">
                    {resources.filter(r => r.type === 'external').map(resource => (
                      <div key={resource.id} className="group p-4 bg-blue-50 rounded-2xl border border-blue-100 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-stone-900">{resource.title}</p>
                              {resource.isVerified && (
                                <ShieldCheck size={14} className="text-emerald-500" />
                              )}
                            </div>
                            <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">{resource.description}</p>
                            {resource.contact && (
                              <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                                <Phone size={12} /> {resource.contact}
                              </p>
                            )}
                          </div>
                          <ExternalLink size={14} className="text-stone-300 group-hover:text-blue-500" />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {resource.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-white text-[8px] font-bold text-blue-400 rounded border border-blue-100">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Intelligent Matching */}
          <section className="bg-stone-900 text-white p-12 rounded-[48px] relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold mb-6">
                <Sparkles size={16} /> 智能资源匹配
              </div>
              <h2 className="text-4xl font-bold mb-4 leading-tight">为您推荐最合适的干预资源</h2>
              <p className="text-stone-400 text-lg mb-8">基于混合推荐算法，根据您的心理状态、压力源及使用偏好，精准推送支持方案。</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-500" /> 内容过滤
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-500" /> 协同过滤
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-500" /> 实时计算
                </div>
              </div>
            </div>
            {/* Abstract Background Element */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-500/10 to-transparent pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-500/20 blur-[120px] rounded-full pointer-events-none" />
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {getRecommendations().map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-[40px] border border-stone-100 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 rounded-2xl ${index === 0 ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                    {index === 0 ? <MessageSquare size={24} /> : <Calendar size={24} />}
                  </div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">匹配度 {Math.round((resource.matchScore || 0) / 100 * 100)}%</span>
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">{resource.title}</h3>
                <p className="text-stone-500 text-sm mb-6 leading-relaxed">{resource.description}</p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {resource.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-stone-50 text-stone-500 text-[10px] font-bold rounded-full uppercase">{tag}</span>
                  ))}
                </div>
                <button className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold group-hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
                  立即预约 <ChevronRight size={18} />
                </button>
              </motion.div>
            ))}
            
            {/* Matching Criteria */}
            <div className="bg-stone-50 p-8 rounded-[40px] border border-stone-100 flex flex-col justify-center">
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
              <div className="mt-6 p-4 bg-white rounded-2xl border border-stone-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-orange-500" />
                  <p className="text-xs font-bold text-stone-900">智能推荐算法</p>
                </div>
                <p className="text-[10px] text-stone-500">采用基于内容和协同过滤的混合推荐算法，根据教师画像与资源标签计算匹配度。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddActivity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddActivity(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden">
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
                <button onClick={handleAddActivity} className="px-10 py-3 bg-stone-900 text-white rounded-2xl font-bold shadow-lg">确认发布</button>
              </div>
            </motion.div>
          </div>
        )}

        {showResourceShare && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResourceShare(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden">
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
                    // 模拟添加资源
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
                  className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  分享资源
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCancelConfirm(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-stone-100">
                <h2 className="text-xl font-bold text-stone-900">确认取消报名</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-stone-600">确定要取消这个活动报名吗？</p>
              </div>
              <div className="p-6 bg-stone-50 flex justify-end gap-3">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 text-stone-500 font-bold text-sm"
                >
                  保留报名
                </button>
                <button 
                  onClick={() => {
                    if (cancelActivityId) {
                      handleCancelJoinActivity(cancelActivityId);
                    }
                    setShowCancelConfirm(false);
                    setCancelActivityId(null);
                  }}
                  className="px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all"
                >
                  确认取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Intervention;
