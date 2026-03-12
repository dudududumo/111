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
  ShieldCheck,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  orderBy,
  arrayUnion
} from "firebase/firestore";
import { db } from "../firebase";
import { 
  UserProfile, 
  UserRole, 
  InterventionTask, 
  GroupActivity, 
  MentalResource 
} from "../types";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
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

interface InterventionProps {
  profile: UserProfile | null;
}

const Intervention: React.FC<InterventionProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'network' | 'matching'>('network');
  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [tasks, setTasks] = useState<InterventionTask[]>([]);
  const [resources, setResources] = useState<MentalResource[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [selectedTask, setSelectedTask] = useState<InterventionTask | null>(null);
  const [careSummary, setCareSummary] = useState("");
  const [isDeidentified, setIsDeidentified] = useState(true);
  const [showResourceAdmin, setShowResourceAdmin] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: "",
    type: "tea" as any,
    description: "",
    date: "",
    location: ""
  });

  // Mock Atmosphere Data
  const atmosphereData = [
    { name: '活力', value: 85, color: '#10b981' },
    { name: '支持', value: 78, color: '#3b82f6' },
    { name: '压力', value: 45, color: '#f59e0b' },
    { name: '凝聚力', value: 92, color: '#8b5cf6' },
  ];

  useEffect(() => {
    if (!profile) return;

    // Listen to activities for the user's group
    const activitiesQuery = query(
      collection(db, "activities"),
      orderBy("date", "asc")
    );
    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupActivity)));
    });

    // Listen to intervention tasks (if admin/psychologist)
    if (profile.role === UserRole.ADMIN || profile.role === UserRole.PSYCHOLOGIST) {
      const tasksQuery = query(collection(db, "intervention_tasks"), orderBy("createdAt", "desc"));
      const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InterventionTask)));
      });
      return () => {
        unsubscribeActivities();
        unsubscribeTasks();
      };
    }

    return () => unsubscribeActivities();
  }, [profile]);

  // Initial Resources
  useEffect(() => {
    const initialResources: MentalResource[] = [
      {
        id: "1",
        title: "校内心理咨询预约",
        type: "counseling",
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
        type: "room",
        description: "开放式沙盘室，支持个人探索与团队建设。",
        tags: ["校内", "自助", "解压"],
        location: "心理中心 201",
        isVerified: true,
        agreementSigned: true
      },
      {
        id: "3",
        title: "教师茶话会",
        type: "activity",
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
        description: "专业医疗机构，提供深度心理评估与治疗。",
        tags: ["外部", "医疗", "专业"],
        contact: "010-12345678",
        isVerified: true,
        agreementSigned: true
      }
    ];
    setResources(initialResources);
  }, []);

  const handleAddActivity = async () => {
    if (!profile || !newActivity.title) return;
    try {
      await addDoc(collection(db, "activities"), {
        ...newActivity,
        groupId: profile.deptId || "general",
        createdBy: profile.uid,
        participants: [profile.uid]
      });
      setShowAddActivity(false);
      setNewActivity({ title: "", type: "tea", description: "", date: "", location: "" });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "activities");
    }
  };

  const handleJoinActivity = async (activityId: string) => {
    if (!profile) return;
    const activityRef = doc(db, "activities", activityId);
    await updateDoc(activityRef, {
      participants: arrayUnion(profile.uid)
    });
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await updateDoc(doc(db, "intervention_tasks", taskId), { status });
  };

  const handleAddCareRecord = async () => {
    if (!selectedTask || !careSummary || !profile) return;
    try {
      const taskRef = doc(db, "intervention_tasks", selectedTask.id!);
      await updateDoc(taskRef, {
        careRecords: arrayUnion({
          date: new Date().toISOString().split('T')[0],
          summary: careSummary,
          createdBy: profile.uid,
          isDeidentified: isDeidentified
        }),
        status: 'in_progress'
      });
      setCareSummary("");
      setSelectedTask(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "intervention_tasks");
    }
  };

  // Recommendation logic (Simple version)
  const getRecommendations = () => {
    // In a real app, this would use the teacher's profile and assessment history
    return resources.slice(0, 2);
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
            {/* Peer Support */}
            <section className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                    <UserPlus size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-stone-900">同伴助力</h2>
                </div>
                <button className="text-sm font-bold text-orange-600 flex items-center gap-1 hover:underline">
                  进入匿名社区 <ChevronRight size={16} />
                </button>
              </div>
              <p className="text-stone-500 text-sm mb-6">集成匿名树洞与主题社群，支持经验分享与情感共鸣。在这里，您不孤单。</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-xs font-bold text-stone-400 uppercase mb-1">活跃社群</p>
                  <p className="text-lg font-bold text-stone-900">12 个</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-xs font-bold text-stone-400 uppercase mb-1">今日心声</p>
                  <p className="text-lg font-bold text-stone-900">48 条</p>
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
                  <button 
                    onClick={() => setShowAddActivity(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all"
                  >
                    <Plus size={16} /> 发起活动
                  </button>
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

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">近期团体活动</h3>
                  <div className="space-y-3">
                    {activities.length > 0 ? activities.map(activity => (
                      <div key={activity.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-stone-900">{activity.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-stone-500 flex items-center gap-1"><Calendar size={12} /> {activity.date}</span>
                            <span className="text-[10px] text-stone-500 flex items-center gap-1"><MapPin size={12} /> {activity.location}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleJoinActivity(activity.id!)}
                          disabled={activity.participants.includes(profile?.uid || '')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activity.participants.includes(profile?.uid || '') ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-stone-900 border border-stone-200 hover:bg-stone-50'}`}
                        >
                          {activity.participants.includes(profile?.uid || '') ? '已报名' : '报名'}
                        </button>
                      </div>
                    )) : (
                      <p className="text-sm text-stone-400 py-8 text-center">暂无近期活动</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Organization & Platform */}
          <div className="space-y-8">
            {/* Organizational Support */}
            {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) && (
              <section className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <Building2 size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-stone-900">组织助力</h2>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">干预任务看板</h3>
                  <div className="space-y-3">
                    {tasks.map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)}
                        className="p-4 bg-stone-50 rounded-2xl border border-stone-100 cursor-pointer hover:border-purple-200 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${task.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            {task.priority === 'high' ? '紧急' : '重要'}
                          </span>
                          <span className="text-[10px] text-stone-400">{task.status === 'pending' ? '待处理' : '跟进中'}</span>
                        </div>
                        <p className="text-sm font-bold text-stone-900">{task.teacherName || "匿名教师"}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[10px] text-stone-500">创建于: {new Date(task.createdAt).toLocaleDateString()}</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                            }}
                            className="px-2 py-1 bg-purple-600 text-white rounded-lg text-[8px] font-bold hover:bg-purple-700 transition-all"
                          >
                            快速处理
                          </button>
                        </div>
                      </div>
                    ))}
                    {tasks.length === 0 && <p className="text-sm text-stone-400 text-center py-4">暂无待办任务</p>}
                  </div>
                </div>
              </section>
            )}

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
                <div className="space-y-4">
                  {resources.map(resource => (
                    <div key={resource.id} className="group p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-stone-900">{resource.title}</p>
                            {resource.isVerified && (
                              <ShieldCheck size={14} className="text-emerald-500" />
                            )}
                            {resource.agreementSigned && (
                              <CheckCircle2 size={14} className="text-blue-500" />
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
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">匹配度 98%</span>
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
                  <p className="text-xs text-stone-600">近期测评显示“中度焦虑”</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                  <p className="text-xs text-stone-600">压力源主要来自“家校沟通”</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                  <p className="text-xs text-stone-600">偏好“线下互动”与“团体活动”</p>
                </li>
              </ul>
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

        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTask(null)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-purple-50">
                <div>
                  <h2 className="text-2xl font-bold text-purple-900">干预任务详情</h2>
                  <p className="text-purple-600 text-xs mt-1">任务编号: {selectedTask.id}</p>
                </div>
                <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-white/50 rounded-xl transition-colors"><X size={24} className="text-purple-400" /></button>
              </div>
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">对象</p>
                    <p className="text-lg font-bold text-stone-900">{selectedTask.teacherName || "匿名教师"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-stone-400 uppercase">优先级</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedTask.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                      {selectedTask.priority === 'high' ? '紧急' : '重要'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900">关怀记录</h3>
                    <div className="flex items-center gap-2 text-[10px] text-stone-400">
                      <Info size={12} />
                      <span>建议使用非评判性、支持性语言</span>
                    </div>
                  </div>
                  
                  {/* Add Record Form */}
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-3">
                    <textarea 
                      value={careSummary}
                      onChange={(e) => setCareSummary(e.target.value)}
                      placeholder="输入关怀概要（如：已进行初步面谈，教师情绪稳定...）"
                      className="w-full p-3 bg-white border border-purple-100 rounded-xl text-sm outline-none resize-none h-24"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isDeidentified}
                          onChange={(e) => setIsDeidentified(e.target.checked)}
                          className="w-4 h-4 rounded border-purple-200 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-[10px] text-purple-700 font-medium">脱敏回传至数据中台</span>
                      </label>
                      <button 
                        onClick={handleAddCareRecord}
                        disabled={!careSummary}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 disabled:opacity-50 transition-all"
                      >
                        保存记录
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 mt-6">
                    {selectedTask.careRecords.map((record, i) => (
                      <div key={i} className="pl-4 border-l-2 border-purple-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-stone-900">{record.date}</p>
                          {(record as any).isDeidentified && (
                            <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">已脱敏</span>
                          )}
                        </div>
                        <p className="text-sm text-stone-600 leading-relaxed">{record.summary}</p>
                      </div>
                    ))}
                    {selectedTask.careRecords.length === 0 && <p className="text-sm text-stone-400 italic">暂无记录</p>}
                  </div>
                </div>
              </div>
              <div className="p-8 bg-stone-50 flex justify-between items-center">
                <select 
                  value={selectedTask.status} 
                  onChange={(e) => updateTaskStatus(selectedTask.id!, e.target.value)}
                  className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-bold outline-none"
                >
                  <option value="pending">待处理</option>
                  <option value="in_progress">跟进中</option>
                  <option value="completed">已完成</option>
                </select>
                <button onClick={() => setSelectedTask(null)} className="px-10 py-3 bg-stone-900 text-white rounded-2xl font-bold shadow-lg">关闭</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Intervention;
