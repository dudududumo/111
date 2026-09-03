import React, { useState, useEffect, useRef } from "react";
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
  ShieldCheck,
  Trash2,
  Square,
  User
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
  Cell,
  LabelList
} from "recharts";

const apiCall = async (endpoint: string, options?: RequestInit) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${endpoint}`, {
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
  const [activityFilter, setActivityFilter] = useState<'all' | 'upcoming' | 'school' | 'group'>('all');
  const [resources, setResources] = useState<MentalResource[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showResourceAdmin, setShowResourceAdmin] = useState(false);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelActivityId, setCancelActivityId] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({
    title: "",
    type: "tea" as any,
    description: "",
    date: "",
    location: "",
    visibility: "group" as 'group' | 'school',
    maxParticipants: 20
  });
  const [interventionTasks, setInterventionTasks] = useState<InterventionTask[]>([]);
  const [atmosphereData, setAtmosphereData] = useState([
    { name: '活力', value: 0 },
    { name: '支持', value: 0 },
    { name: '压力', value: 0 },
    { name: '凝聚力', value: 0 },
  ]);
  
  const teamAssistRef = useRef<HTMLDivElement>(null);
  
  const [schoolAtmosphereData, setSchoolAtmosphereData] = useState([
    { name: '活力', group: 0, school: 0 },
    { name: '支持', group: 0, school: 0 },
    { name: '压力', group: 0, school: 0 },
    { name: '凝聚力', group: 0, school: 0 },
  ]);
  
  // 检查氛围数据是否全部为0
  const hasAtmosphereData = (data: any[]) => {
    return data.some(item => item.value > 0 || item.group > 0 || item.school > 0);
  };

  // 加载团队氛围统计数据
  const loadAtmosphereStats = async () => {
    console.log('=== loadAtmosphereStats 被调用 ===');
    try {
      const stats = await apiCall('/api/atmosphere/stats');
      console.log('loadAtmosphereStats API 返回的 stats:', stats);
      
      setSchoolAtmosphereData([
        { name: '活力', group: stats.group?.vitality || 0, school: stats.school?.vitality || 0 },
        { name: '支持', group: stats.group?.support || 0, school: stats.school?.support || 0 },
        { name: '压力', group: stats.group?.stress || 0, school: stats.school?.stress || 0 },
        { name: '凝聚力', group: stats.group?.cohesion || 0, school: stats.school?.cohesion || 0 },
      ]);
    } catch (error) {
      console.error('加载团队氛围统计失败:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
    }
  };
  
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

  // 智能匹配相关状态
  const [userProfile, setUserProfile] = useState<{
    mentalState: string;
    riskLevel: string;
    stressSources: string[];
    preferences: string[];
    interests: string[];
    lastAssessment: string | null;
  } | null>(null);
  const [recommendations, setRecommendations] = useState<MentalResource[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<MentalResource | null>(null);
  const [appointmentForm, setAppointmentForm] = useState({ date: '', time: '', notes: '' });
  const [occupiedTimeSlots, setOccupiedTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  
  // 预约管理相关状态（心理医生用）
  const [showAppointmentManager, setShowAppointmentManager] = useState(false);
  const [appointmentCalendar, setAppointmentCalendar] = useState<Record<string, any[]>>({});
  const [appointmentStats, setAppointmentStats] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  useEffect(() => {
    const calculateAtmosphereData = async () => {
      console.log('=== calculateAtmosphereData 被调用 ===');
      try {
        const stats = await apiCall('/api/atmosphere/stats');
        console.log('API 返回的 stats:', stats);
        
        const atmosphereSource = stats.school || stats.group;
        if (atmosphereSource) {
          setAtmosphereData([
            { name: '活力', value: atmosphereSource.vitality },
            { name: '支持', value: atmosphereSource.support },
            { name: '压力', value: atmosphereSource.stress },
            { name: '凝聚力', value: atmosphereSource.cohesion },
          ]);
        }
      } catch (error) {
        console.error('计算团队氛围指数失败:', error);
      }
    };
    
    calculateAtmosphereData();
    loadAtmosphereStats();
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
      } catch (error) {
        console.error("Error loading intervention tasks:", error);
        setInterventionTasks([]);
      }
    };

    loadInterventionTasks();

    const interval = setInterval(loadInterventionTasks, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  const getFilteredAndSortedActivities = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = [...activities];

    if (activityFilter === 'upcoming') {
      filtered = filtered.filter(a => new Date(a.date) >= today);
    } else if (activityFilter === 'school') {
      filtered = filtered.filter(a => a.visibility === 'school');
    } else if (activityFilter === 'group') {
      filtered = filtered.filter(a => a.visibility === 'group');
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const isAEnded = dateA < today;
      const isBEnded = dateB < today;

      if (isAEnded && !isBEnded) return 1;
      if (!isAEnded && isBEnded) return -1;

      if (!isAEnded && !isBEnded) {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    });

    return filtered;
  };

  // 加载资源数据
  useEffect(() => {
    const loadResources = async () => {
      try {
        const data = await apiCall('/api/resources');
        // 转换字段名（下划线转驼峰）
        const formattedResources = (data as any[]).map(r => ({
          id: r.id,
          title: r.title,
          type: r.type,
          category: r.category,
          description: r.description,
          tags: r.tags || [],
          contact: r.contact,
          location: r.location,
          imageUrl: r.image_url,
          isVerified: r.is_verified,
          agreementSigned: r.agreement_signed
        }));
        setResources(formattedResources);
      } catch (error) {
        console.error("加载资源失败:", error);
      }
    };
    loadResources();
  }, []);

  // 加载用户画像和推荐
  useEffect(() => {
    if (!profile) return;

    const loadUserProfileAndRecommendations = async () => {
      setLoadingRecommendations(true);
      try {
        // 获取用户画像
        const profileData = await apiCall('/api/user-profile/analysis');
        setUserProfile(profileData);

        // 获取用户预约
        const appointments = await apiCall('/api/appointments/my');
        setMyAppointments(appointments);

        // 计算推荐（使用真实数据）
        calculateRecommendationsWithRealData(profileData);
      } catch (error) {
        console.error("加载用户画像失败:", error);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    loadUserProfileAndRecommendations();
  }, [profile, resources]);

  // 基于真实数据计算推荐
  const calculateRecommendationsWithRealData = (profileData: any) => {
    if (!profileData || resources.length === 0) return;

    const scoredResources = resources.map(resource => {
      let score = 0;
      const matchReasons: string[] = [];

      // 1. 基于压力源匹配（权重30%）
      const stressMatches = profileData.stressSources?.filter((source: string) => 
        resource.tags?.includes(source) || resource.description?.includes(source)
      ) || [];
      if (stressMatches.length > 0) {
        const stressScore = 30 * (1 - Math.pow(0.5, stressMatches.length));
        score += stressScore;
        matchReasons.push(`针对${stressMatches[0]}`);
      }

      // 2. 基于心理状态匹配（权重25%）
      if (resource.tags?.includes(profileData.mentalState) || 
          resource.description?.includes(profileData.mentalState)) {
        score += 25;
        matchReasons.push(`适合${profileData.mentalState}状态`);
      }

      // 3. 基于偏好匹配（权重20%）
      const prefMatches = profileData.preferences?.filter((pref: string) => 
        resource.tags?.includes(pref) || resource.description?.includes(pref)
      ) || [];
      if (prefMatches.length > 0) {
        const prefScore = 20 * (1 - Math.pow(0.6, prefMatches.length));
        score += prefScore;
        matchReasons.push(`符合${prefMatches[0]}偏好`);
      }

      // 4. 基于兴趣匹配（权重15%）
      const interestMatches = profileData.interests?.filter((interest: string) => 
        resource.tags?.includes(interest) || resource.description?.includes(interest)
      ) || [];
      if (interestMatches.length > 0) {
        const interestScore = 15 * (1 - Math.pow(0.7, interestMatches.length));
        score += interestScore;
        matchReasons.push(`匹配${interestMatches[0]}兴趣`);
      }

      // 5. 基于风险等级调整
      if (profileData.riskLevel === 'red' && resource.type === 'external') {
        score += 15; // 高风险推荐外部专业服务
        matchReasons.push('专业医疗支持');
      } else if (profileData.riskLevel === 'orange' && resource.tags?.includes('心理咨询')) {
        score += 12;
        matchReasons.push('建议专业咨询');
      } else if (profileData.riskLevel === 'yellow' && resource.tags?.includes('心理调适')) {
        score += 10;
        matchReasons.push('适合轻度关怀');
      }

      // 6. 认证资源加分
      if (resource.isVerified) {
        score += 8;
      }

      // 7. 资源类型加成
      if (resource.type === 'internal') {
        score += 5; // 内部资源优先
      }

      // 8. 资源热度加成（基于使用次数）
      // if (resource.usageCount) {
      //   score += Math.min(10, resource.usageCount * 0.5);
      // }

      return {
        ...resource,
        matchScore: Math.min(100, Math.round(score)),
        matchReasons: matchReasons.slice(0, 3)
      };
    });

    // 排序并取前6个
    const sorted = scoredResources
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);

    setRecommendations(sorted);
  };

  // 处理预约
  const handleBookAppointment = async () => {
    if (!selectedResource) return;

    try {
      await apiCall('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          resourceId: selectedResource.id,
          resourceTitle: selectedResource.title,
          appointmentDate: appointmentForm.date,
          appointmentTime: appointmentForm.time,
          notes: appointmentForm.notes
        })
      });

      // 刷新预约列表
      const appointments = await apiCall('/api/appointments/my');
      setMyAppointments(appointments);

      setShowAppointmentModal(false);
      setAppointmentForm({ date: '', time: '', notes: '' });
      showModal({
        type: "success",
        title: "预约提交成功",
        message: `您已成功提交对"${selectedResource.title}"的预约申请，管理员会尽快处理并通知您。`
      });
    } catch (error: any) {
      const errorMessage = error?.error || error?.message || "提交预约时出错，请稍后重试。";
      showModal({
        type: "error",
        title: "预约失败",
        message: errorMessage
      });
    }
  };

  // 获取已被占用的时段
  const fetchOccupiedTimeSlots = async (resourceId: string, date: string) => {
    if (!resourceId || !date) {
      setOccupiedTimeSlots([]);
      return;
    }

    setLoadingTimeSlots(true);
    try {
      const response = await apiCall(`/api/appointments/occupied-slots?resourceId=${resourceId}&date=${date}`);
      setOccupiedTimeSlots(response || []);
    } catch (error) {
      console.error('获取占用时段失败:', error);
      setOccupiedTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // 取消预约
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await apiCall(`/api/appointments/${appointmentId}/cancel`, {
        method: 'POST'
      });
      
      // 刷新预约列表
      const appointments = await apiCall('/api/appointments/my');
      setMyAppointments(appointments);
      
      showModal({
        type: "success",
        title: "取消成功",
        message: "预约已成功取消。"
      });
    } catch (error) {
      showModal({
        type: "error",
        title: "取消失败",
        message: "取消预约时出错，请稍后重试。"
      });
    }
  };

  // 获取预约日历数据（心理医生用）
  const loadAppointmentCalendar = async () => {
    setLoadingCalendar(true);
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30);
      
      const [calendarData, statsData] = await Promise.all([
        apiCall(`/api/appointments/calendar?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`),
        apiCall('/api/appointments/stats')
      ]);
      
      setAppointmentCalendar(calendarData as Record<string, any[]>);
      setAppointmentStats(statsData);
    } catch (error) {
      console.error('获取预约日历失败:', error);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // 更新预约状态
  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string, adminNotes?: string) => {
    try {
      await apiCall(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes })
      });
      
      // 刷新日历数据
      await loadAppointmentCalendar();
      
      showModal({
        type: "success",
        title: "更新成功",
        message: `预约状态已更新为${status === 'confirmed' ? '已确认' : status === 'completed' ? '已完成' : '已取消'}。`
      });
    } catch (error) {
      showModal({
        type: "error",
        title: "更新失败",
        message: "更新预约状态时出错，请稍后重试。"
      });
    }
  };

  // 打开预约管理器时加载数据
  useEffect(() => {
    if (showAppointmentManager && (profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST)) {
      loadAppointmentCalendar();
    }
  }, [showAppointmentManager, profile]);

  const handleAddActivity = async () => {
    if (!profile || !newActivity.title) return;
    try {
      const activityToCreate = { 
        ...newActivity, 
        visibility: (profile.role === UserRole.ADMIN || profile.role === UserRole.PSYCHOLOGIST) ? 'school' : newActivity.visibility 
      };
      await apiCall('/api/activities', {
        method: 'POST',
        body: JSON.stringify(activityToCreate)
      });
      setShowAddActivity(false);
      setNewActivity({ title: "", type: "tea", description: "", date: "", location: "", visibility: "group", maxParticipants: 20 });
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

  const handleDeleteActivity = async (activityId: string) => {
    if (!profile) return;
    try {
      await apiCall(`/api/activities/${activityId}`, {
        method: 'DELETE'
      });
      const activities = await apiCall('/api/activities');
      setActivities(activities as GroupActivity[]);
      showModal({
        type: "success",
        title: "删除成功",
        message: "活动已删除"
      });
    } catch (err) {
      console.error("Error deleting activity:", err);
      showModal({
        type: "error",
        title: "删除失败",
        message: "删除活动失败，请稍后重试"
      });
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

  // 标签管理函数
  const handleAddTag = async (resourceId: string, tag: string) => {
    try {
      await apiCall(`/api/resources/${resourceId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tag })
      });
      // 刷新资源列表
      const data = await apiCall('/api/resources');
      const formattedResources = (data as any[]).map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        category: r.category,
        description: r.description,
        tags: r.tags || [],
        contact: r.contact,
        location: r.location,
        imageUrl: r.image_url,
        isVerified: r.is_verified,
        agreementSigned: r.agreement_signed
      }));
      setResources(formattedResources);
    } catch (error) {
      console.error('添加标签失败:', error);
      showModal({
        type: "error",
        title: "添加失败",
        message: "添加标签失败，请稍后重试"
      });
    }
  };

  const handleRemoveTag = async (resourceId: string, tag: string) => {
    try {
      await apiCall(`/api/resources/${resourceId}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE'
      });
      // 刷新资源列表
      const data = await apiCall('/api/resources');
      const formattedResources = (data as any[]).map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        category: r.category,
        description: r.description,
        tags: r.tags || [],
        contact: r.contact,
        location: r.location,
        imageUrl: r.image_url,
        isVerified: r.is_verified,
        agreementSigned: r.agreement_signed
      }));
      setResources(formattedResources);
    } catch (error) {
      console.error('删除标签失败:', error);
      showModal({
        type: "error",
        title: "删除失败",
        message: "删除标签失败，请稍后重试"
      });
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      
      {activeTab === 'network' ? (
        <div className="pb-6 sm:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* 左列 */}
            <div className="space-y-6 lg:space-y-8 flex flex-col h-full">
              {/* 同伴助力 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-white via-orange-50/30 to-orange-50/50 rounded-[32px] shadow-lg shadow-orange-200/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-300/30 transition-all"
              >
                <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                  <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 sm:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl">
                        <UserPlus size={20} className="sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-stone-900">同伴助力</h2>
                    </div>
                  </div>
                  <p className="text-stone-500 text-xs sm:text-sm mb-4 sm:mb-6">匿名树洞与主题社群，支持经验分享与情感共鸣。在这里，您不孤单。</p>
                  
                  <div className="p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-200 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-stone-900 mb-1">匿名支持社区</h3>
                        <p className="text-[10px] sm:text-xs text-stone-600">选择身份标签，以匿名方式分享与交流</p>
                      </div>
                      <button
                        onClick={() => window.location.href = '/toolkit?tab=community'}
                        className="px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md shadow-orange-200/50 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 mt-2 sm:mt-0"
                      >
                        进入社区 <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-100">
                      <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">可选身份标签</p>
                      <p className="text-xs sm:text-sm font-bold text-stone-900">班主任 / 学科 / 年级</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-100">
                      <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">功能</p>
                      <p className="text-xs sm:text-sm font-bold text-stone-900">匿名分享 / 情感支持</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 团队助力 - 占用剩余空间 */}
              <motion.div
                ref={teamAssistRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-gradient-to-br from-white via-orange-50/30 to-orange-50/50 rounded-[32px] shadow-lg shadow-orange-200/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-300/30 transition-all flex-1 flex flex-col min-h-0"
              >
                <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                  <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 sm:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl">
                        <Users size={20} className="sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-stone-900">团队助力</h2>
                    </div>
                    {(profile?.role === UserRole.DEPT_HEAD || profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) && (
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
                        <button
                          onClick={() => setShowAddActivity(true)}
                          className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-[10px] font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md shadow-orange-200/50 whitespace-nowrap"
                        >
                          <Plus size={12} className="sm:w-3.5 sm:h-3.5" /> 发起活动
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 图表部分 - 单独出来，不在滚动条内 */}
                  {(profile?.managerId || profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST || profile?.role === UserRole.DEPT_HEAD) ? (
                    (() => {
                      const currentData = (profile?.role === UserRole.DEPT_HEAD || (profile?.managerId && profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.PSYCHOLOGIST)) 
                        ? schoolAtmosphereData 
                        : atmosphereData;
                      
                      const hasData = hasAtmosphereData(currentData);
                      
                      if (hasData) {
                        return (
                          <div className="mb-4 sm:mb-6">
                            <h3 className="text-xs sm:text-sm font-bold text-orange-600 uppercase tracking-widest mb-3 sm:mb-4">
                              {(profile?.role === UserRole.DEPT_HEAD || (profile?.managerId && profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.PSYCHOLOGIST)) ? '本组 vs 全校 氛围对比' : '全校氛围指数'}
                            </h3>
                            <div className="h-36 w-full bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-200 p-4 sm:p-5">
                              <ResponsiveContainer width="100%" height="100%">
                                {(profile?.role === UserRole.DEPT_HEAD || (profile?.managerId && profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.PSYCHOLOGIST)) ? (
                                  <BarChart data={schoolAtmosphereData} layout="vertical" margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#fed7aa" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={40} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#78716c' }} />
                                    <Tooltip cursor={{ fill: '#fff7ed' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="group" radius={[0, 6, 6, 0]} barSize={14} fill="#f97316" name="本组">
                                      <LabelList dataKey="group" position="right" fill="#78716c" fontSize={10} fontWeight={600} />
                                    </Bar>
                                    <Bar dataKey="school" radius={[0, 6, 6, 0]} barSize={14} fill="#fdba74" name="全校" />
                                  </BarChart>
                                ) : (
                                  <BarChart data={atmosphereData} layout="vertical" margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#fed7aa" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={40} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#78716c' }} />
                                    <Tooltip cursor={{ fill: '#fff7ed' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18} fill="#f97316">
                                      <LabelList dataKey="value" position="right" fill="#78716c" fontSize={10} fontWeight={600} />
                                    </Bar>
                                  </BarChart>
                                )}
                              </ResponsiveContainer>
                            </div>
                            <p className="text-[10px] text-stone-400 italic mt-2">* 数据基于{(profile?.role === UserRole.DEPT_HEAD || (profile?.managerId && profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.PSYCHOLOGIST)) ? '本组教师' : '全校教师'}近期脱敏聚合分析</p>
                          </div>
                        );
                      } else {
                        return (
                          <div className="mb-4 sm:mb-6">
                            <div className="flex flex-col items-center justify-center py-8 bg-orange-50 rounded-xl sm:rounded-2xl border border-dashed border-orange-200">
                              <div className="p-3 bg-white rounded-xl shadow-sm text-orange-200 mb-3">
                                <Users size={20} />
                              </div>
                              <p className="text-xs text-stone-500 text-center">暂无团队氛围数据</p>
                              <p className="text-[10px] text-stone-400 mt-1">等待教师完成评估后可查看氛围数据</p>
                            </div>
                          </div>
                        );
                      }
                    })()
                  ) : (
                    <div className="mb-4 sm:mb-6">
                      <div className="flex flex-col items-center justify-center py-8 bg-orange-50 rounded-xl sm:rounded-2xl border border-dashed border-orange-200">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-orange-200 mb-3">
                          <Users size={20} />
                        </div>
                        <p className="text-xs text-stone-500 text-center">暂无团队氛围数据</p>
                        <p className="text-[10px] text-stone-400 mt-1">加入教研组后可查看本组氛围数据</p>
                      </div>
                    </div>
                  )}

                  {/* 活动部分 - 单独设置滚动条 */}
                  <div className="overflow-y-auto flex-1 min-h-0 pr-2 max-h-[705px] pb-4">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-xs sm:text-sm font-bold text-orange-600 uppercase tracking-widest">近期团体活动</h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setActivityFilter('all')}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${activityFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                        >
                          全部
                        </button>
                        <button
                          onClick={() => setActivityFilter('upcoming')}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${activityFilter === 'upcoming' ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                        >
                          进行中
                        </button>
                        <button
                          onClick={() => setActivityFilter('school')}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${activityFilter === 'school' ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                        >
                          全校
                        </button>
                        <button
                          onClick={() => setActivityFilter('group')}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${activityFilter === 'group' ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                        >
                          组内
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      {(() => {
                        const filteredActivities = getFilteredAndSortedActivities();
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        return filteredActivities.length > 0 ? filteredActivities.map(activity => {
                          const isJoined = activity.participants?.includes(profile?.uid || '');
                          const isFull = activity.participants && activity.maxParticipants
                            ? activity.participants.length >= activity.maxParticipants
                            : false;
                          const canDelete = activity.createdBy === profile?.uid || profile?.role === UserRole.ADMIN;
                          const isEnded = new Date(activity.date) < today;

                          return (
                            <div key={activity.id} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${isEnded ? 'bg-stone-50 border-stone-100 opacity-75' : 'bg-orange-50 border-orange-200'}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`text-xs sm:text-sm font-bold truncate ${isEnded ? 'text-stone-500' : 'text-stone-900'}`}>{activity.title}</p>
                                    {isEnded && (
                                      <span className="px-1 py-0.5 bg-stone-200 text-stone-600 rounded text-[9px] font-bold shrink-0">已结束</span>
                                    )}
                                    {activity.visibility === 'school' && (
                                      <span className="px-1 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold shrink-0">全校</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <span className={`text-[10px] flex items-center gap-1 ${isEnded ? 'text-stone-400' : 'text-stone-500'}`}><Calendar size={10} className="sm:w-3 sm:h-3" /> {activity.date}</span>
                                    <span className={`text-[10px] flex items-center gap-1 ${isEnded ? 'text-stone-400' : 'text-stone-500'}`}><MapPin size={10} className="sm:w-3 sm:h-3" /> {activity.location}</span>
                                    <span className={`text-[10px] flex items-center gap-1 ${isEnded ? 'text-stone-400' : 'text-stone-400'}`}><Users size={10} className="sm:w-3 sm:h-3" /> {activity.participants?.length || 0} 人{activity.maxParticipants && ` / 限额 ${activity.maxParticipants} 人`}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                  {isJoined ? (
                                    <>
                                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">
                                        已报名
                                      </span>
                                      {!isEnded && (
                                        <button
                                          onClick={() => {
                                            setCancelActivityId(activity.id!);
                                            setShowCancelConfirm(true);
                                          }}
                                          className="px-1.5 py-0.5 text-[10px] text-stone-400 hover:text-red-500 transition-colors"
                                        >
                                          取消
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    !isEnded && (
                                      <button
                                        onClick={() => handleJoinActivity(activity.id!)}
                                        disabled={isFull}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${isFull ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 'bg-white text-stone-900 border border-stone-100 hover:bg-stone-100'}`}
                                      >
                                        {isFull ? '已满' : '报名'}
                                      </button>
                                    )
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteActivity(activity.id!)}
                                      className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                      title="删除活动"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="flex flex-col items-center justify-center py-6 sm:py-8">
                            <p className="text-xs sm:text-sm text-stone-400 text-center">暂无近期活动</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

        {/* 右列 */}
        <div className="space-y-6 lg:space-y-8 flex flex-col h-full">
          {/* 组织助力 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-white via-orange-50/30 to-orange-50/50 rounded-[32px] shadow-lg shadow-orange-200/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-300/30 transition-all"
          >
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 sm:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl">
                    <Building2 size={20} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-stone-900">组织助力</h2>
                </div>
                <button
                  onClick={() => window.location.href = '/warnings'}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md shadow-orange-200/50 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0"
                >
                  <ShieldCheck size={12} className="sm:w-3.5 sm:h-3.5" /> <span className="whitespace-nowrap">预警中心</span>
                </button>
              </div>

              {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST || profile?.role === UserRole.DEPT_HEAD) ? (
                <div>
                  <p className="text-stone-500 text-xs sm:text-sm mb-4 sm:mb-6">干预任务派发与跟踪看板。当触发三级预警时，系统自动创建干预任务并指派给心理教师。</p>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-200">
                      <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">待处理</p>
                      <p className="text-lg sm:text-xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'pending').length}</p>
                      <p className="text-[10px] text-stone-500 mt-1">需要指派负责人</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-200">
                      <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">进行中</p>
                      <p className="text-lg sm:text-xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'in_progress').length}</p>
                      <p className="text-[10px] text-stone-500 mt-1">正在跟进中</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-200">
                      <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">已完成</p>
                      <p className="text-lg sm:text-xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'completed').length}</p>
                      <p className="text-[10px] text-stone-500 mt-1">本周完成</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h3 className="text-xs sm:text-sm font-bold text-stone-400 uppercase tracking-widest">近期干预任务</h3>
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-stone-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div> 待处理
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-stone-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div> 进行中
                        </span>
                      </div>
                    </div>

                    {interventionTasks.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {interventionTasks.sort((a, b) => {
                          const statusOrder = { 'pending': 0, 'in_progress': 1, 'completed': 2 };
                          return statusOrder[a.status] - statusOrder[b.status];
                        }).map(task => (
                          <div key={task.id} className="group relative p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-100 hover:bg-white hover:shadow-md transition-all">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    task.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                    task.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                                    'bg-orange-100 text-orange-700'
                                  }`}>
                                    {task.status === 'pending' ? '待处理' : task.status === 'in_progress' ? '进行中' : '已完成'}
                                  </span>
                                  {task.priority === 'high' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                                      <ShieldCheck size={8} /> 紧急干预
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-stone-900 mt-1 truncate">
                                  {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) ? task.teacherName : '匿名教师'}
                                </p>
                              </div>
                              <span className="text-[10px] text-stone-400 font-medium shrink-0">{new Date(task.createdAt || '').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[10px] sm:text-xs text-stone-500 flex items-center gap-1">
                                <UserPlus size={10} className="text-stone-300" />
                                负责专家: <span className="text-stone-700 font-medium ml-1">{task.assignedTo ? (task.assignedToName || task.assignedTo) : '待指派'}</span>
                              </p>

                              {/* 显示关怀记录 */}
                              {task.careRecords && task.careRecords.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-[10px] font-bold text-stone-600">访谈记录:</p>
                                  {task.careRecords.map((record, index) => (
                                    <div key={index} className="p-2 bg-white rounded-lg border border-stone-100">
                                      <p className="text-[9px] text-stone-400">{record.date}</p>
                                      <p className="text-[10px] text-stone-700">{record.summary}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) && (
                                <div className="flex items-center gap-2 pt-2 border-t border-orange-100">
                                  {task.status !== 'completed' && (
                                    <button
                                      onClick={() => handleProgressTask(task)}
                                      className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                                        task.status === 'pending'
                                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                                          : 'bg-orange-500 text-white hover:bg-orange-600'
                                      }`}
                                    >
                                      {task.status === 'pending' ? (
                                        <><Play size={10} fill="currentColor" /> 接收并开始</>
                                      ) : (
                                        <><CheckCircle2 size={10} /> 标记完成</>
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
                                      className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center gap-1"
                                    >
                                      <MessageSquare size={10} /> 访谈记录
                                    </button>
                                  )}
                                  {task.status === 'completed' && (
                                    <div className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold bg-orange-50 text-orange-600 flex items-center justify-center gap-1">
                                      <CheckCircle2 size={10} /> 任务已完成
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 flex flex-col items-center justify-center bg-orange-50 rounded-xl sm:rounded-2xl border border-dashed border-orange-200">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-orange-200 mb-3">
                          <Clock size={20} />
                        </div>
                        <p className="text-xs text-stone-400">当前暂无待处理的干预任务</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <div className="p-3 bg-orange-50 rounded-xl mb-3">
                    <ShieldCheck size={20} className="text-orange-300" />
                  </div>
                  <p className="text-xs text-stone-500 text-center">组织干预任务仅对教研组长、管理员和心理教师可见</p>
                  <p className="text-[10px] text-stone-400 mt-1">如有需要请联系学校心理中心</p>
                </div>
              )}
            </div>
          </motion.div>

            {/* 平台助力 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-white via-orange-50/30 to-orange-50/50 rounded-[32px] shadow-lg shadow-orange-200/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-300/30 transition-all flex-1 flex flex-col min-h-0"
            >
              <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 sm:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl">
                      <Globe size={20} className="sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-stone-900">平台助力</h2>
                      <p className="text-[10px] text-stone-400">点击资源跳转至智能匹配</p>
                    </div>
                  </div>
                  {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) && (
                    <button 
                      onClick={() => setShowResourceAdmin(!showResourceAdmin)}
                      className="text-xs font-bold text-stone-400 hover:text-stone-600 flex items-center gap-1"
                    >
                      <Filter size={12} /> {showResourceAdmin ? '退出管理' : '标签管理'}
                    </button>
                  )}
                </div>
                
                <div className="overflow-y-auto flex-1 min-h-0 pr-2 flex flex-col">
                {showResourceAdmin ? (
                  <div className="space-y-4 flex-1">
                    <p className="text-[10px] text-orange-600 mb-4">管理员模式：支持资源标签管理，优化智能推荐算法。</p>
                    {resources.map(resource => (
                      <div key={resource.id} className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
                        <p className="text-xs font-bold text-stone-900 mb-2">{resource.title}</p>
                        <div className="flex flex-wrap gap-2">
                          {resource.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-white border border-orange-300 rounded text-[10px] font-bold text-orange-600">
                              {tag} 
                              <X 
                                size={8} 
                                className="cursor-pointer hover:text-red-500" 
                                onClick={() => handleRemoveTag(resource.id, tag)}
                              />
                            </span>
                          ))}
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={newTagInputs[resource.id] || ''}
                              onChange={(e) => setNewTagInputs(prev => ({ ...prev, [resource.id]: e.target.value }))}
                              placeholder="新标签"
                              className="w-16 px-2 py-1 text-[10px] border border-orange-300 rounded focus:outline-none focus:border-orange-500"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && newTagInputs[resource.id]?.trim()) {
                                  handleAddTag(resource.id, newTagInputs[resource.id].trim());
                                  setNewTagInputs(prev => ({ ...prev, [resource.id]: '' }));
                                }
                              }}
                            />
                            <button 
                              onClick={() => {
                                if (newTagInputs[resource.id]?.trim()) {
                                  handleAddTag(resource.id, newTagInputs[resource.id].trim());
                                  setNewTagInputs(prev => ({ ...prev, [resource.id]: '' }));
                                }
                              }}
                              className="px-2 py-1 bg-orange-500 text-white rounded text-[10px] font-bold hover:bg-orange-600 transition-all"
                            >
                              + 添加标签
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      {resources.filter(r => r.type === 'internal' && (r.title.includes('咨询') || r.tags.some(tag => tag.includes('咨询')))).map(resource => (
                        <div key={resource.id} className="group p-3 bg-orange-50 rounded-2xl border border-orange-200 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => {
                            setActiveTab('matching');
                          }}
                        >
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
                          <div className="flex flex-wrap gap-2 mt-2">
                            {resource.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-white text-[9px] font-bold text-orange-600 rounded border border-orange-100">{tag}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      {resources.filter(r => r.type === 'internal' && (r.title.includes('沙盘') || r.tags.some(tag => tag.includes('沙盘')))).map(resource => (
                        <div key={resource.id} className="group p-3 bg-orange-50 rounded-2xl border border-orange-200 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => {
                            setActiveTab('matching');
                          }}
                        >
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
                          <div className="flex flex-wrap gap-2 mt-2">
                            {resource.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-white text-[9px] font-bold text-orange-600 rounded border border-orange-100">{tag}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div 
                      className="group p-3 bg-orange-50 rounded-2xl border border-orange-200 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        teamAssistRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-stone-900">团体活动报名</p>
                          </div>
                          <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">查看并报名近期团队活动</p>
                        </div>
                        <ExternalLink size={14} className="text-stone-300 group-hover:text-orange-500" />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-white text-[9px] font-bold text-orange-600 rounded border border-orange-100">团体活动</span>
                        <span className="px-2 py-0.5 bg-white text-[9px] font-bold text-orange-600 rounded border border-orange-100">报名</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-6">
                      <h3 className="text-sm font-bold text-blue-600 flex items-center gap-2">
                        <ShieldCheck size={16} className="text-blue-500" />
                        外部专业服务渠道
                      </h3>
                      <div className="space-y-2">
                        {resources.filter(r => r.type === 'external' && (r.title.includes('医院') || r.tags.some(tag => tag.includes('医院')))).map(resource => (
                          <div key={resource.id} className="group p-3 bg-blue-50 rounded-2xl border border-blue-200 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => {
                              setActiveTab('matching');
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-stone-900">{resource.title}</p>
                                  {resource.isVerified && (
                                    <ShieldCheck size={14} className="text-blue-500" />
                                  )}
                                </div>
                                <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">{resource.description}</p>
                              </div>
                              <ExternalLink size={14} className="text-stone-300 group-hover:text-blue-500" />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {resource.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-white text-[9px] font-bold text-blue-600 rounded border border-blue-100">{tag}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {resources.filter(r => r.type === 'external' && (r.title.includes('热线') || r.tags.some(tag => tag.includes('热线')))).map(resource => (
                          <div key={resource.id} className="group p-3 bg-blue-50 rounded-2xl border border-blue-200 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => {
                              setActiveTab('matching');
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-stone-900">{resource.title}</p>
                                  {resource.isVerified && (
                                    <ShieldCheck size={14} className="text-blue-500" />
                                  )}
                                </div>
                                <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">{resource.description}</p>
                              </div>
                              <ExternalLink size={14} className="text-stone-300 group-hover:text-blue-500" />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {resource.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-white text-[9px] font-bold text-blue-600 rounded border border-blue-100">{tag}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {resources.filter(r => r.type === 'external' && !(r.title.includes('医院') || r.tags.some(tag => tag.includes('医院')) || r.title.includes('热线') || r.tags.some(tag => tag.includes('热线')))).map(resource => (
                          <div key={resource.id} className="group p-3 bg-blue-50 rounded-2xl border border-blue-200 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-stone-900">{resource.title}</p>
                                  {resource.isVerified && (
                                    <ShieldCheck size={14} className="text-blue-500" />
                                  )}
                                </div>
                                <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">{resource.description}</p>
                              </div>
                              <ExternalLink size={14} className="text-stone-300 group-hover:text-blue-500" />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {resource.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-white text-[9px] font-bold text-blue-600 rounded border border-blue-100">{tag}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      ) : (
        <div className="pb-6 sm:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* 左列 */}
            <div className="space-y-6 lg:space-y-8 flex flex-col h-full">
              {/* 状态和风险信息 */}
              {userProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-white via-orange-50/30 to-orange-50/50 rounded-[32px] shadow-lg shadow-orange-200/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-300/30 transition-all"
                >
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="p-2.5 sm:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl">
                        <ShieldCheck size={20} className="sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-stone-900">我的状态</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-100">
                        <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">当前状态</p>
                        <p className="text-sm sm:text-base font-bold text-stone-900">{userProfile.mentalState}</p>
                      </div>
                      <div className="p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-100">
                        <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">风险等级</p>
                        <p className="text-sm sm:text-base font-bold text-stone-900">
                          {userProfile.riskLevel === 'green' ? '低风险' : 
                           userProfile.riskLevel === 'blue' ? '关注' : 
                           userProfile.riskLevel === 'yellow' ? '轻度' : 
                           userProfile.riskLevel === 'orange' ? '中度' : '高风险'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 预约管理入口（心理医生/管理员可见） */}
              {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-gradient-to-br from-white via-orange-50/30 to-orange-50/50 rounded-[32px] shadow-lg shadow-orange-200/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-300/30 transition-all cursor-pointer"
                  onClick={() => setShowAppointmentManager(true)}
                >
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 sm:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl">
                          <Calendar size={20} className="sm:w-6 sm:h-6 text-white" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-stone-900">预约管理</h2>
                      </div>
                      <ChevronRight size={20} className="text-orange-400" />
                    </div>
                    <p className="text-stone-500 text-xs sm:text-sm">查看和管理所有资源预约，日历视图一目了然</p>
                  </div>
                </motion.div>
              )}

              {/* 我的预约 */}
              {myAppointments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-white via-orange-50/30 to-orange-50/50 rounded-[32px] shadow-lg shadow-orange-200/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-300/30 transition-all flex-1 flex flex-col min-h-0"
                >
                  <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="p-2.5 sm:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl">
                        <Clock size={20} className="sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-stone-900">我的预约</h2>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {myAppointments.slice(0, 3).map((apt: any) => (
                        <div key={apt.id} className="p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-100">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${
                                apt.status === 'confirmed' ? 'bg-green-500' : 
                                apt.status === 'pending' ? 'bg-amber-500' : 
                                apt.status === 'completed' ? 'bg-blue-500' : 'bg-stone-400'
                              }`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">{apt.resource_title}</p>
                                <p className="text-[10px] sm:text-xs text-stone-500">
                                  {apt.appointment_date ? `${apt.appointment_date} ${apt.appointment_time || ''}` : '待确认时间'} · 
                                  {apt.status === 'pending' ? '待处理' : apt.status === 'confirmed' ? '已确认' : apt.status === 'completed' ? '已完成' : '已取消'}
                                </p>
                              </div>
                            </div>
                            {apt.status === 'pending' && (
                              <button 
                                onClick={() => handleCancelAppointment(apt.id)}
                                className="text-[10px] sm:text-xs text-stone-400 hover:text-red-500 transition-colors shrink-0"
                              >
                                取消
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* 右列 - 推荐资源 */}
            <div className="flex flex-col h-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-white via-orange-50/30 to-orange-50/50 rounded-[32px] shadow-lg shadow-orange-200/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-300/30 transition-all flex-1 flex flex-col min-h-0"
              >
                <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                  <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 sm:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl">
                        <Sparkles size={20} className="sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-stone-900">智能推荐</h2>
                    </div>
                    {loadingRecommendations && (
                      <span className="text-xs text-stone-400">分析中...</span>
                    )}
                  </div>
                  <p className="text-stone-500 text-xs sm:text-sm mb-4 sm:mb-6">基于您的评估数据、压力源及使用偏好，精准推送个性化支持方案</p>
                  
                  {recommendations.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 bg-orange-50 rounded-xl sm:rounded-2xl border border-dashed border-orange-200">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-orange-200 mb-3">
                        <Sparkles size={20} />
                      </div>
                      <p className="text-xs text-stone-500 text-center">暂无推荐资源</p>
                      <p className="text-[10px] text-stone-400 mt-1">请先完成心理评估</p>
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                      {recommendations.map((resource: any, index) => (
                        <motion.div
                          key={resource.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all group ${
                            resource.type === 'internal' 
                              ? 'bg-orange-50 border-orange-200 hover:border-orange-300' 
                              : 'bg-blue-50 border-blue-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${
                                resource.type === 'internal' ? 'bg-orange-100' : 'bg-blue-100'
                              }`}>
                                {resource.category === 'counselor' && <User size={14} className={resource.type === 'internal' ? 'text-orange-600' : 'text-blue-600'} />}
                                {resource.category === 'sandplay' && <Square size={14} className={resource.type === 'internal' ? 'text-orange-600' : 'text-blue-600'} />}
                                {resource.category === 'group' && <Users size={14} className={resource.type === 'internal' ? 'text-orange-600' : 'text-blue-600'} />}
                                {resource.category === 'hospital' && <Building2 size={14} className={resource.type === 'internal' ? 'text-orange-600' : 'text-blue-600'} />}
                                {resource.category === 'hotline' && <Phone size={14} className={resource.type === 'internal' ? 'text-orange-600' : 'text-blue-600'} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-bold text-stone-900 line-clamp-1">{resource.title}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {resource.isVerified && (
                                    <span className="flex items-center gap-0.5 text-[8px] sm:text-[10px] text-emerald-600">
                                      <ShieldCheck size={8} /> 认证
                                    </span>
                                  )}
                                  {resource.agreementSigned && (
                                    <span className="text-[8px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded">已签约</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right bg-gradient-to-br from-amber-50 to-orange-50 px-2 py-1 rounded border border-orange-100">
                              <span className={`text-xs font-bold ${
                                resource.matchScore >= 80 ? 'text-emerald-600' : 
                                resource.matchScore >= 60 ? 'text-orange-600' : 'text-stone-500'
                              }`}>
                                {resource.matchScore}%
                              </span>
                              <p className="text-[8px] text-stone-400">匹配</p>
                            </div>
                          </div>
                          
                          <p className="text-[9px] text-stone-500 mb-2 line-clamp-2">{resource.description}</p>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {resource.tags?.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="text-[8px] px-1.5 py-0.5 bg-stone-50 text-stone-600 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                          
                          <div className="flex gap-1.5">
                            {resource.category === 'hotline' ? (
                              <button 
                                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${resource.type === 'internal' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700' : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'}`}
                                onClick={() => {
                                  if (resource.contact) {
                                    window.location.href = `tel:${resource.contact}`;
                                  }
                                }}
                              >
                                <Phone size={12} />
                                拨打
                              </button>
                            ) : resource.category === 'group' ? (
                              <button 
                                className="flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                                onClick={() => {
                                  setActiveTab('network');
                                  setTimeout(() => {
                                    teamAssistRef.current?.scrollIntoView({ behavior: 'smooth' });
                                  }, 100);
                                }}
                              >
                                <Users size={12} />
                                报名
                              </button>
                            ) : (
                              <button 
                                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${resource.type === 'internal' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700' : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'}`}
                                onClick={() => {
                                  setSelectedResource(resource);
                                  setShowAppointmentModal(true);
                                }}
                              >
                                <Calendar size={12} />
                                预约
                              </button>
                            )}
                            <button 
                              className="px-3 py-1.5 bg-stone-50 text-stone-700 rounded-md text-xs font-bold hover:bg-stone-100 transition-all border border-stone-100"
                              onClick={() => {
                                showModal({
                                  type: "info",
                                  title: resource.title,
                                  message: `${resource.description}\n\n联系方式：${resource.contact || '请通过预约系统联系'}\n地点：${resource.location || '校内心理中心'}`
                                });
                              }}
                            >
                              详情
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddActivity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4 mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <Plus className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">发起团体活动</h3>
                <p className="text-stone-500">创建一个新的团队活动，邀请成员参与</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">活动名称</label>
                  <input type="text" value={newActivity.title} onChange={(e) => setNewActivity({...newActivity, title: e.target.value})} placeholder="如：周五茶话会" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">类型</label>
                    <select value={newActivity.type} onChange={(e) => setNewActivity({...newActivity, type: e.target.value as any})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none text-sm">
                      <option value="tea">茶话会</option>
                      <option value="sandplay">团体沙盘</option>
                      <option value="workshop">工作坊</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">日期</label>
                    <input type="date" value={newActivity.date} onChange={(e) => setNewActivity({...newActivity, date: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">可见范围</label>
                    {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) ? (
                      <div className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-sm text-stone-600">
                        全校可见
                      </div>
                    ) : (
                      <div className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-sm text-stone-600">
                        本组可见
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">最大人数</label>
                    <input type="number" value={newActivity.maxParticipants} onChange={(e) => setNewActivity({...newActivity, maxParticipants: parseInt(e.target.value) || 20})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">地点</label>
                  <input type="text" value={newActivity.location} onChange={(e) => setNewActivity({...newActivity, location: e.target.value})} placeholder="如：教师之家" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAddActivity(false)}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddActivity}
                    disabled={!newActivity.title || !newActivity.date}
                    className="flex-1 py-3 rounded-2xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    确认发布
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showAddCareRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="text-center space-y-4 mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">添加关怀记录</h3>
                <p className="text-stone-500">记录干预谈话内容，所有信息将脱敏保存</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">访谈日期</label>
                  <input type="date" value={newCareRecord.date} onChange={(e) => setNewCareRecord({...newCareRecord, date: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">谈话概要（已脱敏）</label>
                  <textarea 
                    value={newCareRecord.summary} 
                    onChange={(e) => setNewCareRecord({...newCareRecord, summary: e.target.value})} 
                    placeholder="简要记录谈话内容，不涉及具体隐私信息..." 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none resize-none h-40 text-sm" 
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
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAddCareRecord(false)}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all"
                  >
                    取消
                  </button>
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
                    className="flex-1 py-3 rounded-2xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    保存记录
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showCancelConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <X className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">确认取消报名？</h3>
                <p className="text-stone-500">确定要取消此次活动报名吗？</p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all"
                  >
                    返回
                  </button>
                  <button
                    onClick={async () => {
                      if (cancelActivityId) {
                        await handleCancelJoinActivity(cancelActivityId);
                        setShowCancelConfirm(false);
                        setCancelActivityId(null);
                      }
                    }}
                    className="flex-1 py-3 rounded-2xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all shadow-md"
                  >
                    确认取消
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* 预约模态框 */}
        {showAppointmentModal && selectedResource && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4 mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <Calendar className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">预约服务</h3>
                <p className="text-stone-500">{selectedResource.title}</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">预约日期</label>
                    <input 
                      type="date" 
                      value={appointmentForm.date} 
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setAppointmentForm({...appointmentForm, date: newDate, time: ''});
                        if (selectedResource) {
                          fetchOccupiedTimeSlots(selectedResource.id, newDate);
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">预约时间</label>
                    <select 
                      value={appointmentForm.time} 
                      onChange={(e) => setAppointmentForm({...appointmentForm, time: e.target.value})}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none text-sm"
                    >
                      <option value="">选择时间</option>
                      <option value="09:00" disabled={occupiedTimeSlots.includes('09:00')}>
                        09:00 {occupiedTimeSlots.includes('09:00') && '(已预约)'}
                      </option>
                      <option value="10:00" disabled={occupiedTimeSlots.includes('10:00')}>
                        10:00 {occupiedTimeSlots.includes('10:00') && '(已预约)'}
                      </option>
                      <option value="11:00" disabled={occupiedTimeSlots.includes('11:00')}>
                        11:00 {occupiedTimeSlots.includes('11:00') && '(已预约)'}
                      </option>
                      <option value="14:00" disabled={occupiedTimeSlots.includes('14:00')}>
                        14:00 {occupiedTimeSlots.includes('14:00') && '(已预约)'}
                      </option>
                      <option value="15:00" disabled={occupiedTimeSlots.includes('15:00')}>
                        15:00 {occupiedTimeSlots.includes('15:00') && '(已预约)'}
                      </option>
                      <option value="16:00" disabled={occupiedTimeSlots.includes('16:00')}>
                        16:00 {occupiedTimeSlots.includes('16:00') && '(已预约)'}
                      </option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">备注说明</label>
                  <textarea 
                    value={appointmentForm.notes} 
                    onChange={(e) => setAppointmentForm({...appointmentForm, notes: e.target.value})}
                    placeholder="请描述您的需求或特殊情况..."
                    rows={3}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none text-sm resize-none"
                  />
                </div>
                <div className="p-4 bg-orange-50 rounded-xl">
                  <p className="text-xs text-stone-600">
                    <span className="font-bold text-orange-600">提示：</span>
                    提交预约后，管理员会尽快审核并确认，您将收到通知。
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAppointmentModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleBookAppointment}
                    disabled={!appointmentForm.date}
                    className="flex-1 py-3 rounded-2xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    提交预约
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* 预约管理模态框（心理医生/管理员用） */}
        {showAppointmentManager && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-stone-900">预约管理</h2>
                    <p className="text-xs text-stone-500">查看和管理所有资源预约</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAppointmentManager(false)} 
                  className="p-2 hover:bg-stone-50 rounded-xl transition-colors"
                >
                  <X size={24} className="text-stone-400" />
                </button>
              </div>
              
              {/* 统计卡片 */}
              {appointmentStats && (
                <div className="p-6 bg-stone-50 border-b border-stone-100">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-stone-100">
                      <p className="text-2xl font-bold text-stone-900">{appointmentStats.total}</p>
                      <p className="text-xs text-stone-500">总预约</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-amber-100">
                      <p className="text-2xl font-bold text-amber-600">{appointmentStats.pending}</p>
                      <p className="text-xs text-stone-500">待处理</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-green-100">
                      <p className="text-2xl font-bold text-green-600">{appointmentStats.confirmed}</p>
                      <p className="text-xs text-stone-500">已确认</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-100">
                      <p className="text-2xl font-bold text-blue-600">{appointmentStats.thisWeek}</p>
                      <p className="text-xs text-stone-500">本周预约</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 日历视图 */}
              <div className="p-6 overflow-y-auto max-h-[50vh] bg-white rounded-2xl border border-orange-100 shadow-lg">
                {loadingCalendar ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 日期选择器 */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <input 
                          type="date" 
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl outline-none text-sm font-medium focus:ring-2 focus:ring-orange-200 transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl border border-orange-200">
                        <Calendar size={16} className="text-orange-600" />
                        <span className="text-sm font-bold text-orange-700">
                          {appointmentCalendar[selectedDate]?.length || 0} 个预约
                        </span>
                      </div>
                    </div>
                    
                    {/* 当天预约列表 */}
                    {appointmentCalendar[selectedDate]?.length > 0 ? (
                      <div className="space-y-4">
                        {appointmentCalendar[selectedDate].map((apt: any) => (
                          <motion.div 
                            key={apt.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-5 bg-gradient-to-r from-white to-stone-50 rounded-xl border border-orange-50 shadow-md hover:shadow-lg transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg border border-orange-200">
                                    <span className="text-sm font-bold text-orange-700">{apt.time || '待定时间'}</span>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700 border border-green-200' : apt.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : apt.status === 'completed' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-stone-100 text-stone-500 border border-stone-100'}`}>
                                    {apt.status === 'confirmed' ? '已确认' : apt.status === 'pending' ? '待处理' : apt.status === 'completed' ? '已完成' : '已取消'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 bg-orange-50 rounded-lg">
                                    <Users size={16} className="text-orange-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-stone-900 mb-0.5">{apt.resourceTitle}</p>
                                    <p className="text-xs text-stone-500">预约人：{apt.userName} ({apt.userContact})</p>
                                  </div>
                                </div>
                                {apt.notes && (
                                  <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                                    <p className="text-xs text-stone-600 font-medium mb-1">备注：</p>
                                    <p className="text-xs text-stone-500">{apt.notes}</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 ml-4">
                                {apt.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateAppointmentStatus(apt.id, 'confirmed')}
                                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm hover:shadow"
                                    >
                                      确认
                                    </button>
                                    <button
                                      onClick={() => handleUpdateAppointmentStatus(apt.id, 'cancelled')}
                                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold rounded-lg hover:from-red-600 hover:to-rose-700 transition-all shadow-sm hover:shadow"
                                    >
                                      拒绝
                                    </button>
                                  </>
                                )}
                                {apt.status === 'confirmed' && (
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(apt.id, 'completed')}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow"
                                  >
                                    完成
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                        <Calendar className="w-16 h-16 mx-auto mb-6 text-orange-300" />
                        <p className="text-stone-500 font-medium">该日期暂无预约</p>
                        <p className="text-xs text-stone-400 mt-2">选择其他日期查看预约情况</p>
                      </div>
                    )}
                    
                    {/* 待处理预约（无日期） */}
                    {appointmentCalendar['pending']?.length > 0 && selectedDate !== 'pending' && (
                      <div className="mt-8 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 shadow-md">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock size={18} className="text-amber-700" />
                          </div>
                          <h4 className="text-sm font-bold text-amber-700">
                            待确认时间的预约 ({appointmentCalendar['pending'].length})
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {appointmentCalendar['pending'].map((apt: any) => (
                            <div key={apt.id} className="p-4 bg-white rounded-lg border border-amber-100 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-stone-900">{apt.resourceTitle}</p>
                                  <p className="text-xs text-stone-500">预约人：{apt.userName}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(apt.id, 'confirmed')}
                                    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                                  >
                                    确认
                                  </button>
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(apt.id, 'cancelled')}
                                    className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                                  >
                                    拒绝
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
    </div>
    </motion.div>
  );
};

export default Intervention;