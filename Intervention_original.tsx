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
  const [users, setUsers] = useState<Record<string, { displayName: string }>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [atmosphereData, setAtmosphereData] = useState([
    { name: '娲诲姏', value: 85, color: '#10b981' },
    { name: '鏀寔', value: 78, color: '#3b82f6' },
    { name: '鍘嬪姏', value: 45, color: '#f59e0b' },
    { name: '鍑濊仛鍔?, value: 92, color: '#8b5cf6' },
  ]);
  
  // CustomModal鐘舵€?  const [modalData, setModalData] = useState<{
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

  // 璁＄畻鍥㈤槦姘涘洿鎸囨暟
  useEffect(() => {
    const calculateAtmosphereData = async () => {
      try {
        // 鑾峰彇鎵€鏈夋暀甯堢殑璇勪及鏁版嵁
        const assessments = await apiCall('/api/assessments');
        
        if (assessments && assessments.length > 0) {
          // 璁＄畻鍚勯」鎸囨爣
          let totalDepression = 0;
          let totalAnxiety = 0;
          let totalRiskLevel = 0;
          let validCount = 0;
          
          assessments.forEach((assessment: any) => {
            try {
              const scores = JSON.parse(assessment.scores);
              if (scores['鎶戦儊'] && scores['鐒﹁檻']) {
                totalDepression += scores['鎶戦儊'];
                totalAnxiety += scores['鐒﹁檻'];
                validCount++;
              }
              
              // 璁＄畻椋庨櫓绛夌骇鏁板€?              if (assessment.risk_level) {
                const riskValue = assessment.risk_level === 'red' ? 3 : 
                                assessment.risk_level === 'orange' ? 2 : 
                                assessment.risk_level === 'yellow' ? 1 : 0;
                totalRiskLevel += riskValue;
              }
            } catch (error) {
              console.error('瑙ｆ瀽璇勪及鏁版嵁澶辫触:', error);
            }
          });
          
          if (validCount > 0) {
            // 璁＄畻姘涘洿鎸囨暟锛堝熀浜庤瘎浼版暟鎹殑鑴辨晱鑱氬悎锛?            const avgDepression = totalDepression / validCount;
            const avgAnxiety = totalAnxiety / validCount;
            const avgRiskLevel = totalRiskLevel / assessments.length;
            
            // 娲诲姏鎸囨暟锛氬熀浜庝綆鎶戦儊鍜屼綆鐒﹁檻锛堝弽鍚戝叧绯伙級
            const vitality = Math.max(0, Math.min(100, 100 - ((avgDepression + avgAnxiety) / 2) * 25));
            
            // 鏀寔鎸囨暟锛氬熀浜庝綆椋庨櫓绛夌骇锛堝弽鍚戝叧绯伙級
            const support = Math.max(0, Math.min(100, 100 - avgRiskLevel * 20));
            
            // 鍘嬪姏鎸囨暟锛氬熀浜庨珮鎶戦儊鍜岄珮鐒﹁檻锛堟鍚戝叧绯伙級
            const stress = Math.max(0, Math.min(100, ((avgDepression + avgAnxiety) / 2) * 20));
            
            // 鍑濊仛鍔涙寚鏁帮細鍩轰簬娲诲姩鍙備笌搴︼紙妯℃嫙鏁版嵁锛?            const cohesion = Math.max(0, Math.min(100, 70 + Math.random() * 30));
            
            setAtmosphereData([
              { name: '娲诲姏', value: Math.round(vitality), color: '#10b981' },
              { name: '鏀寔', value: Math.round(support), color: '#3b82f6' },
              { name: '鍘嬪姏', value: Math.round(stress), color: '#f59e0b' },
              { name: '鍑濊仛鍔?, value: Math.round(cohesion), color: '#8b5cf6' },
            ]);
            
            console.log('鍥㈤槦姘涘洿鎸囨暟璁＄畻瀹屾垚:', {
              vitality: Math.round(vitality),
              support: Math.round(support),
              stress: Math.round(stress),
              cohesion: Math.round(cohesion),
              sampleSize: validCount
            });
          }
        }
      } catch (error) {
        console.error('璁＄畻鍥㈤槦姘涘洿鎸囨暟澶辫触:', error);
        // 浣跨敤榛樿鍊?        setAtmosphereData([
          { name: '娲诲姏', value: 85, color: '#10b981' },
          { name: '鏀寔', value: 78, color: '#3b82f6' },
          { name: '鍘嬪姏', value: 45, color: '#f59e0b' },
          { name: '鍑濊仛鍔?, value: 92, color: '#8b5cf6' },
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
        // 浣跨敤鏂扮殑API鏈嶅姟
        const { default: api } = await import('../services/api');
        const tasks = await api.intervention.getAllTasks();
        setInterventionTasks(tasks as InterventionTask[]);
        console.log('鎴愬姛鍔犺浇骞查浠诲姟:', tasks.length, '鏉?);

        // 鍔犺浇鐢ㄦ埛淇℃伅
        const userIds = new Set(tasks.map(task => task.assignedTo).filter(Boolean));
        const userMap: Record<string, { displayName: string }> = {};
        
        for (const userId of userIds) {
          try {
            const user = await api.user.getUserById(userId);
            if (user) {
              userMap[userId] = { displayName: user.display_name || user.displayName || userId };
            }
          } catch (error) {
            console.error(`Error loading user ${userId}:`, error);
            userMap[userId] = { displayName: userId };
          }
        }
        
        setUsers(userMap);
      } catch (error) {
        console.error("Error loading intervention tasks:", error);
        // 濡傛灉API涓嶅瓨鍦紝浣跨敤绌烘暟缁?        setInterventionTasks([]);
      }
    };

    loadInterventionTasks();

    // 璁剧疆瀹氭椂鍒锋柊锛堟瘡30绉掞級
    const interval = setInterval(loadInterventionTasks, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  // Initial Resources
  useEffect(() => {
    const initialResources: MentalResource[] = [
      {
        id: "1",
        title: "鏍″唴蹇冪悊鍜ㄨ棰勭害",
        type: "internal",
        category: "counseling",
        description: "鎻愪緵 1瀵? 涓撲笟蹇冪悊鍜ㄨ鏈嶅姟锛屼繚鎶ら殣绉併€?,
        tags: ["鏍″唴", "涓撲笟", "鍏嶈垂"],
        contact: "鍐呯嚎 8088",
        location: "琛屾斂妤?402",
        isVerified: true,
        agreementSigned: true
      },
      {
        id: "2",
        title: "娌欑洏瀹よ嚜涓婚绾?,
        type: "internal",
        category: "room",
        description: "寮€鏀惧紡娌欑洏瀹わ紝鏀寔涓汉鎺㈢储涓庡洟闃熷缓璁俱€?,
        tags: ["鏍″唴", "鑷姪", "瑙ｅ帇"],
        location: "蹇冪悊涓績 201",
        isVerified: true,
        agreementSigned: true
      },
      {
        id: "3",
        title: "鏁欏笀鑼惰瘽浼?,
        type: "internal",
        category: "activity",
        description: "姣忓懆浜斾笅鍗堬紝杞绘澗姘涘洿涓嬬殑缁忛獙鍒嗕韩涓庝氦娴併€?,
        tags: ["绀句氦", "鍥㈤槦", "鏀炬澗"],
        location: "鏁欏笀涔嬪",
        isVerified: true,
        agreementSigned: true
      },
      {
        id: "4",
        title: "甯傚績鐞嗗崼鐢熶腑蹇?,
        type: "external",
        category: "medical",
        description: "涓撲笟鍖荤枟鏈烘瀯锛屾彁渚涙繁搴﹀績鐞嗚瘎浼颁笌娌荤枟銆?,
        tags: ["澶栭儴", "鍖荤枟", "涓撲笟"],
        contact: "010-12345678",
        isVerified: true,
        agreementSigned: true
      },
      {
        id: "5",
        title: "鍏泭蹇冪悊鐑嚎",
        type: "external",
        category: "hotline",
        description: "24灏忔椂鍏嶈垂蹇冪悊鐑嚎锛屾彁渚涘嵆鏃舵儏缁敮鎸併€?,
        tags: ["澶栭儴", "鍏嶈垂", "24灏忔椂"],
        contact: "400-123-4567",
        isVerified: true
      },
      {
        id: "6",
        title: "鏁欏笀蹇冪悊鎴愰暱宸ヤ綔鍧?,
        type: "internal",
        category: "workshop",
        description: "閽堝鏁欏笀鑱屼笟鐗圭偣鐨勫績鐞嗘垚闀垮伐浣滃潑锛屾彁鍗囧績鐞嗛煣鎬с€?,
        tags: ["鏍″唴", "涓撲笟", "鎴愰暱"],
        location: "鏁欏笀鍙戝睍涓績",
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

  // 鏇存柊骞查浠诲姟鐘舵€?  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.updateTaskStatus(taskId, newStatus);
      
      // 鏇存柊鏈湴鐘舵€?      setInterventionTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      
      console.log(`浠诲姟 ${taskId} 鐘舵€佸凡鏇存柊涓?${newStatus}`);
    } catch (error) {
      console.error('鏇存柊浠诲姟鐘舵€佸け璐?', error);
      showModal({
        type: "error",
        title: "鏇存柊澶辫触",
        message: "鏇存柊浠诲姟鐘舵€佸け璐ワ紝璇风◢鍚庨噸璇?
      });
    }
  };

  // 妯℃嫙娴佽浆浠诲姟
  const handleProgressTask = async (task: InterventionTask) => {
    if (task.status === 'pending') {
      await handleUpdateTaskStatus(task.id, 'in_progress');
    } else if (task.status === 'in_progress') {
      await handleUpdateTaskStatus(task.id, 'completed');
    }
  };

  // 鎸囨淳骞查浠诲姟
  const handleAssignTask = async (taskId: string, assignedTo: string) => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.assignTask(taskId, assignedTo);
      
      // 鏇存柊鏈湴鐘舵€?      setInterventionTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, assignedTo } : task
      ));
      
      console.log(`浠诲姟 ${taskId} 宸叉寚娲剧粰 ${assignedTo}`);
    } catch (error) {
      console.error('鎸囨淳浠诲姟澶辫触:', error);
      showModal({
        type: "error",
        title: "鎸囨淳澶辫触",
        message: "鎸囨淳浠诲姟澶辫触锛岃绋嶅悗閲嶈瘯"
      });
    }
  };

  // 娣诲姞鍏虫€€璁板綍
  const handleAddCareRecord = async (taskId: string, record: { date: string; summary: string; createdBy: string }) => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.addCareRecord(taskId, record);
      
      // 鏇存柊鏈湴鐘舵€?      setInterventionTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, careRecords: [...(task.careRecords || []), record] } : task
      ));
      
      console.log(`浠诲姟 ${taskId} 宸叉坊鍔犲叧鎬€璁板綍`);
    } catch (error) {
      console.error('娣诲姞鍏虫€€璁板綍澶辫触:', error);
      showModal({
        type: "error",
        title: "娣诲姞澶辫触",
        message: "娣诲姞鍏虫€€璁板綍澶辫触锛岃绋嶅悗閲嶈瘯"
      });
    }
  };

  // 娓呯┖鎵€鏈夊共棰勪换鍔?  const handleClearAllTasks = async () => {
    try {
      const { default: api } = await import('../services/api');
      await api.intervention.deleteAllTasks();
      setInterventionTasks([]);
      showModal({
        type: "success",
        title: "娓呯┖鎴愬姛",
        message: "宸叉竻绌烘墍鏈夊共棰勪换鍔★紒"
      });
    } catch (error) {
      console.error('娓呯┖骞查浠诲姟澶辫触:', error);
      showModal({
        type: "error",
        title: "娓呯┖澶辫触",
        message: "娓呯┖澶辫触锛岃绋嶅悗閲嶈瘯"
      });
    }
  };

  // Intelligent Matching Algorithm - 鍩轰簬鐪熷疄鐢ㄦ埛鐢诲儚鍜屾贩鍚堟帹鑽愮畻娉?  const getRecommendations = () => {
    if (!profile) return [];
    
    // 鑾峰彇鐢ㄦ埛鏈€杩戠殑璇勪及鏁版嵁鏉ユ瀯寤虹敤鎴风敾鍍?    const getUserProfile = async () => {
      try {
        const assessments = await apiCall('/api/assessments/my');
        if (assessments && assessments.length > 0) {
          const latestAssessment = assessments[0];
          const scores = JSON.parse(latestAssessment.scores);
          
          return {
            stressSources: scores['鎶戦儊'] > 2.0 ? ['鎶戦儊鐥囩姸', '蹇冪悊鍘嬪姏'] : 
                          scores['鐒﹁檻'] > 2.0 ? ['鐒﹁檻鐥囩姸', '鎯呯华绠＄悊'] : 
                          ['宸ヤ綔鍘嬪姏', '鎯呯华璋冭妭'],
            mentalState: latestAssessment.risk_level === 'red' ? '楂橀闄? : 
                        latestAssessment.risk_level === 'orange' ? '涓闄? : 
                        latestAssessment.risk_level === 'yellow' ? '浣庨闄? : '姝ｅ父',
            preferences: ['绾夸笅娲诲姩', '涓撲笟鏀寔'],
            interests: ['蹇冪悊鎴愰暱', '鍘嬪姏绠＄悊', '鎯呯华璋冭妭'],
            riskLevel: latestAssessment.risk_level
          };
        }
      } catch (error) {
        console.error('鑾峰彇鐢ㄦ埛鐢诲儚澶辫触:', error);
      }
      
      // 闄嶇骇鏂规锛氫娇鐢ㄩ粯璁ょ敾鍍?      return {
        stressSources: ['宸ヤ綔鍘嬪姏', '瀹舵牎娌熼€?],
        mentalState: '杞诲害鐒﹁檻',
        preferences: ['绾夸笅娲诲姩', '鍥綋鏀寔'],
        interests: ['蹇冪悊鎴愰暱', '鍘嬪姏绠＄悊'],
        riskLevel: 'yellow'
      };
    };
    
    // 璁＄畻鍖归厤鍒嗘暟锛堝熀浜庢贩鍚堟帹鑽愮畻娉曪級
    const calculateMatchScore = (resource: any, userProfile: any) => {
      let score = 0;
      const maxScore = 100;
      
      // 1. 鍩轰簬鍐呭鐨勫尮閰嶏紙Content-based Filtering锛?      // 鍖归厤鍘嬪姏婧愶紙鏉冮噸锛?0%锛?      userProfile.stressSources.forEach((source: string) => {
        if (resource.tags.includes(source) || resource.description.includes(source)) {
          score += 30;
        }
      });
      
      // 鍖归厤蹇冪悊鐘舵€侊紙鏉冮噸锛?0%锛?      if (resource.tags.includes(userProfile.mentalState) || resource.description.includes(userProfile.mentalState)) {
        score += 20;
      }
      
      // 鍖归厤鍋忓ソ锛堟潈閲嶏細25%锛?      userProfile.preferences.forEach((preference: string) => {
        if (resource.tags.includes(preference) || resource.description.includes(preference)) {
          score += 25;
        }
      });
      
      // 鍖归厤鍏磋叮锛堟潈閲嶏細15%锛?      userProfile.interests.forEach((interest: string) => {
        if (resource.tags.includes(interest) || resource.description.includes(interest)) {
          score += 15;
        }
      });
      
      // 2. 鍩轰簬鍗忓悓杩囨护鐨勫尮閰嶏紙Collaborative Filtering锛?      // 妯℃嫙锛氭牴鎹浉浼肩敤鎴风殑鍘嗗彶琛屼负璋冩暣鍒嗘暟
      const similarUsersBonus = Math.random() * 10;
      score += similarUsersBonus;
      
      // 3. 鍩轰簬璧勬簮绫诲瀷鐨勪紭鍏堢骇璋冩暣
      if (userProfile.riskLevel === 'red' && resource.category === 'counseling') {
        score += 15; // 楂橀闄╃敤鎴蜂紭鍏堟帹鑽愪笓涓氬挩璇?      } else if (userProfile.riskLevel === 'orange' && resource.category === 'workshop') {
        score += 10; // 涓闄╃敤鎴蜂紭鍏堟帹鑽愬伐浣滃潑
      } else if (userProfile.riskLevel === 'yellow' && resource.category === 'activity') {
        score += 10; // 浣庨闄╃敤鎴蜂紭鍏堟帹鑽愭椿鍔?      }
      
      return Math.min(score, maxScore);
    };
    
    // 寮傛鑾峰彇鐢ㄦ埛鐢诲儚骞惰绠楁帹鑽?    const calculateRecommendations = async () => {
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
    
    // 鑾峰彇鍖归厤鍘熷洜锛堢敤浜庡睍绀烘帹鑽愮悊鐢憋級
    const getMatchReasons = (resource: any, userProfile: any) => {
      const reasons = [];
      
      if (userProfile.stressSources.some((s: string) => resource.tags.includes(s))) {
        reasons.push('閽堝鎮ㄧ殑鍘嬪姏婧?);
      }
      if (resource.tags.includes(userProfile.mentalState)) {
        reasons.push('閫傚悎褰撳墠蹇冪悊鐘舵€?);
      }
      if (userProfile.preferences.some((p: string) => resource.tags.includes(p))) {
        reasons.push('绗﹀悎鎮ㄧ殑鍋忓ソ');
      }
      if (userProfile.interests.some((i: string) => resource.tags.includes(i))) {
        reasons.push('鍖归厤鎮ㄧ殑鍏磋叮');
      }
      
      return reasons.slice(0, 2); // 鏈€澶氭樉绀?涓師鍥?    };
    
    // 杩斿洖璁＄畻缁撴灉锛堣繖閲岀畝鍖栧鐞嗭紝瀹為檯搴旇浣跨敤寮傛锛?    return resources.map(resource => {
      let score = 0;
      
      // 绠€鍖栫殑鍖归厤閫昏緫
      const mockProfile = {
        stressSources: ['宸ヤ綔鍘嬪姏', '瀹舵牎娌熼€?],
        mentalState: '杞诲害鐒﹁檻',
        preferences: ['绾夸笅娲诲姩', '鍥綋鏀寔'],
        interests: ['蹇冪悊鎴愰暱', '鍘嬪姏绠＄悊']
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

  // 鏄剧ず寮圭獥鐨勮緟鍔╁嚱鏁?  const showModal = (data: Omit<typeof modalData, "isOpen">) => {
    setModalData({
      ...data,
      isOpen: true
    });
  };

  // 鍏抽棴寮圭獥
  const closeModal = () => {
    setModalData(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
            <Users className="text-orange-500" size={32} />
            姗欒壊骞查锛氬洓绾ф敮鎸佺綉缁?          </h1>
          <p className="text-stone-500 mt-1">鍚屼即銆佸洟闃熴€佺粍缁囥€佸钩鍙板叏鏂逛綅蹇冪悊鏀寔</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-stone-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('network')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'network' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
          >
            鏀寔缃戠粶
          </button>
          <button 
            onClick={() => setActiveTab('matching')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'matching' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
          >
            鏅鸿兘鍖归厤
          </button>
        </div>
      </div>

      {activeTab === 'network' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 鎵€鏈変汉閮藉彲浠ョ湅鍒板悓浼村姪鍔涘拰鍥㈤槦鍔╁姏 */}
          <div className={`${profile?.role === UserRole.TEACHER ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-8`}>
            {/* Peer Support - 鍚屼即鍔╁姏 */}
            <section className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                    <UserPlus size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-stone-900">鍚屼即鍔╁姏</h2>
                </div>
              </div>
              <p className="text-stone-500 text-sm mb-6">鍖垮悕鏍戞礊涓庝富棰樼ぞ缇わ紝鏀寔缁忛獙鍒嗕韩涓庢儏鎰熷叡楦ｃ€傚湪杩欓噷锛屾偍涓嶅鍗曘€?/p>
              
              {/* 绀惧尯鍏ュ彛 */}
              <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 mb-1">鍖垮悕鏀寔绀惧尯</h3>
                    <p className="text-sm text-stone-600">閫夋嫨韬唤鏍囩锛屼互鍖垮悕鏂瑰紡鍒嗕韩涓庝氦娴?/p>
                  </div>
                  <button 
                    onClick={() => window.location.href = '/toolkit?tab=community'}
                    className="px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-all flex items-center gap-2"
                  >
                    杩涘叆绀惧尯 <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-xs font-bold text-stone-400 uppercase mb-1">鍙€夎韩浠芥爣绛?/p>
                  <p className="text-lg font-bold text-stone-900">鐝富浠?/ 瀛︾ / 骞寸骇</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-xs font-bold text-stone-400 uppercase mb-1">鍔熻兘</p>
                  <p className="text-lg font-bold text-stone-900">鍖垮悕鍒嗕韩 / 鎯呮劅鏀寔</p>
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
                  <h2 className="text-xl font-bold text-stone-900">鍥㈤槦鍔╁姏</h2>
                </div>
                {(profile?.role === UserRole.DEPT_HEAD || profile?.role === UserRole.ADMIN) && (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowAddActivity(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all"
                    >
                      <Plus size={16} /> 鍙戣捣娲诲姩
                    </button>
                    <button 
                      onClick={() => setShowResourceShare(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                    >
                      <Plus size={16} /> 鍒嗕韩璧勬簮
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">鏈粍姘涘洿鎸囨暟</h3>
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
                  <p className="text-[10px] text-stone-400 italic">* 鏁版嵁鍩轰簬鏈粍鏁欏笀杩戞湡鑴辨晱鑱氬悎鍒嗘瀽</p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">杩戞湡鍥綋娲诲姩</h3>
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
                                    宸叉姤鍚?                                  </span>
                                  <button 
                                    onClick={() => {
                                      setCancelActivityId(activity.id!);
                                      setShowCancelConfirm(true);
                                    }}
                                    className="px-2 py-1 text-[10px] text-stone-400 hover:text-red-500 transition-colors"
                                  >
                                    鍙栨秷
                                  </button>
                                </>
                              ) : (
                                <button 
                                  onClick={() => handleJoinActivity(activity.id!)}
                                  disabled={isFull}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isFull ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 'bg-white text-stone-900 border border-stone-200 hover:bg-stone-100'}`}
                                >
                                  {isFull ? '宸叉弧' : '鎶ュ悕'}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-stone-400">
                            <Users size={12} />
                            <span>宸叉姤鍚?{activity.participants?.length || 0} 浜?/span>
                            {activity.maxParticipants && <span>/ 闄愰 {activity.maxParticipants} 浜?/span>}
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-sm text-stone-400 py-8 text-center">鏆傛棤杩戞湡娲诲姩</p>
                    )}
                  </div>
                  
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">鍥㈤槦璧勬簮鍒嗕韩</h3>
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
                          <span className="text-xs font-bold">鏌ョ湅</span>
                        </a>
                      </div>
                    )) : (
                      <p className="text-sm text-stone-400 py-4 text-center">鏆傛棤鍒嗕韩璧勬簮</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 鍙湁绠＄悊鍛樸€佸績鐞嗕笓瀹躲€佹暀鐮旂粍闀挎墠鑳界湅鍒扮粍缁囧姪鍔?*/}
          {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST || profile?.role === UserRole.DEPT_HEAD) && (
            <div className="space-y-8">
              {/* Organizational Support - 骞查浠诲姟鐪嬫澘 */}
              <section className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                      <Building2 size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-stone-900">缁勭粐鍔╁姏</h2>
                  </div>
                  <div className="flex gap-2">
                    {profile?.role === UserRole.ADMIN && (
                      <button 
                        onClick={() => {
                          showModal({
                            type: "confirm",
                            title: "纭娓呯┖",
                            message: "纭畾瑕佹竻绌烘墍鏈夊共棰勪换鍔″悧锛熸鎿嶄綔涓嶅彲鎭㈠锛?,
                            confirmText: "纭畾娓呯┖",
                            cancelText: "鍙栨秷",
                            showCancel: true,
                            onConfirm: handleClearAllTasks
                          });
                        }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-all flex items-center gap-1"
                      >
                        <Trash2 size={14} /> 娓呯┖
                      </button>
                    )}
                    <button 
                      onClick={() => window.location.href = '/warnings'}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all flex items-center gap-2"
                    >
                      <ShieldCheck size={14} /> 绾㈣壊棰勮
                    </button>
                  </div>
                </div>
                <p className="text-stone-500 text-sm mb-6">骞查浠诲姟娲惧彂涓庤窡韪湅鏉裤€傚綋瑙﹀彂涓夌骇棰勮鏃讹紝绯荤粺鑷姩鍒涘缓骞查浠诲姟骞舵寚娲剧粰蹇冪悊鏁欏笀銆?/p>
                
                {/* 浠诲姟缁熻鍗＄墖 */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <p className="text-xs font-bold text-purple-600 uppercase mb-1">寰呭鐞?/p>
                    <p className="text-2xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'pending').length}</p>
                    <p className="text-[10px] text-stone-500 mt-1">闇€瑕佹寚娲捐礋璐ｄ汉</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-xs font-bold text-amber-600 uppercase mb-1">杩涜涓?/p>
                    <p className="text-2xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'in_progress').length}</p>
                    <p className="text-[10px] text-stone-500 mt-1">姝ｅ湪璺熻繘涓?/p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-600 uppercase mb-1">宸插畬鎴?/p>
                    <p className="text-2xl font-bold text-stone-900">{interventionTasks.filter(t => t.status === 'completed').length}</p>
                    <p className="text-[10px] text-stone-500 mt-1">鏈懆瀹屾垚</p>
                  </div>
                </div>

                {/* 浠诲姟鍒楄〃 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">杩戞湡骞查浠诲姟</h3>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1 text-[10px] text-stone-400">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div> 寰呭鐞?                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-stone-400">
                        <div className="w-2 h-2 rounded-full bg-amber-400"></div> 杩涜涓?                      </span>
                    </div>
                  </div>
                  
                  {interventionTasks.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {interventionTasks.sort((a, b) => {
                        // 浼樺厛绾ф帓搴忥細寰呭鐞?> 杩涜涓?> 宸插畬鎴?                        const statusOrder = { 'pending': 0, 'in_progress': 1, 'completed': 2 };
                        return statusOrder[a.status] - statusOrder[b.status];
                      }).map(task => (
                        <div key={task.id} className="group relative p-5 bg-stone-50 rounded-3xl border border-stone-100 hover:bg-white hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  task.status === 'pending' ? 'bg-purple-100 text-purple-700' :
                                  task.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                  'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {task.status === 'pending' ? '寰呭鐞? : task.status === 'in_progress' ? '杩涜涓? : '宸插畬鎴?}
                                </span>
                                {task.priority === 'high' && (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                                    <ShieldCheck size={10} /> 绱ф€ュ共棰?                                  </span>
                                )}
                              </div>
                              <p className="text-base font-bold text-stone-900 mt-1">
                                {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) ? task.teacherName : '鍖垮悕鏁欏笀'}
                              </p>
                            </div>
                            <span className="text-[10px] text-stone-400 font-medium">{new Date(task.createdAt || '').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-xs text-stone-500 mb-2 flex items-center gap-1">
                                <UserPlus size={12} className="text-stone-300" />
                                璐熻矗涓撳: <span className="text-stone-700 font-medium ml-1">{task.assignedTo ? (users[task.assignedTo]?.displayName || task.assignedTo) : '寰呮寚娲?}</span>
                              </p>
                              {task.careRecords && task.careRecords.length > 0 ? (
                                <div className="p-3 bg-white/60 rounded-xl border border-stone-100/50">
                                  <p className="text-[10px] text-stone-400 mb-1 flex items-center gap-1">
                                    <MessageSquare size={10} /> 鏈€鏂拌繘灞?                                  </p>
                                  <p className="text-xs text-stone-600 line-clamp-1 italic">"{task.careRecords[task.careRecords.length - 1].summary}"</p>
                                </div>
                              ) : (
                                <p className="text-[10px] text-stone-400 italic">鏆傛棤璁胯皥璁板綍锛岃鍙婃椂鍚姩绾夸笅骞查</p>
                              )}
                            </div>
                            
                            {/* 浠诲姟娴佽浆鎸夐挳 */}
                            {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) && task.status !== 'completed' && (
                              <button 
                                onClick={() => handleProgressTask(task)}
                                className={`flex-shrink-0 p-3 rounded-2xl transition-all duration-300 ${
                                  task.status === 'pending' 
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-100 hover:bg-purple-700' 
                                    : 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-600'
                                }`}
                                title={task.status === 'pending' ? '鎺ユ敹骞跺紑濮嬪共棰? : '鏍囪骞查宸插畬鎴?}
                              >
                                {task.status === 'pending' ? <Play size={20} fill="currentColor" /> : <CheckCircle2 size={20} />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center bg-stone-50 rounded-[32px] border border-dashed border-stone-200">
                      <div className="p-4 bg-white rounded-2xl shadow-sm text-stone-200 mb-4">
                        <Clock size={32} />
                      </div>
                      <p className="text-sm text-stone-400">褰撳墠鏆傛棤寰呭鐞嗙殑骞查浠诲姟</p>
                    </div>
                  )}
                </div>

                {/* 鍝嶅簲鏃舵晥缁熻 */}
                <div className="mt-6 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-stone-900">鍝嶅簲鏃舵晥</p>
                    <span className="text-xs text-purple-600 font-bold">骞冲潎 2.3 灏忔椂</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500 w-16">&lt; 1灏忔椂</span>
                      <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }} />
                      </div>
                      <span className="text-[10px] text-stone-500">45%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500 w-16">1-4灏忔椂</span>
                      <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }} />
                      </div>
                      <span className="text-[10px] text-stone-500">35%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500 w-16">&gt; 4灏忔椂</span>
                      <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '20%' }} />
                      </div>
                      <span className="text-[10px] text-stone-500">20%</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* 骞冲彴鍔╁姏 - 鎵€鏈変汉鍙 */}
          <div className={profile?.role === UserRole.TEACHER ? 'lg:col-span-3' : 'space-y-8'}>
            <section className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Globe size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-stone-900">骞冲彴鍔╁姏</h2>
                </div>
                {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PSYCHOLOGIST) && (
                  <button 
                    onClick={() => setShowResourceAdmin(!showResourceAdmin)}
                    className="text-[10px] font-bold text-stone-400 hover:text-stone-600 flex items-center gap-1"
                  >
                    <Filter size={12} /> {showResourceAdmin ? '閫€鍑虹鐞? : '鏍囩绠＄悊'}
                  </button>
                )}
              </div>
              
              {showResourceAdmin ? (
                <div className="space-y-4">
                  <p className="text-[10px] text-stone-400 mb-4">绠＄悊鍛樻ā寮忥細鏀寔璧勬簮鏍囩绠＄悊锛屼紭鍖栨櫤鑳芥帹鑽愮畻娉曘€?/p>
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
                          + 娣诲姞鏍囩
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-600 uppercase mb-2">鏍″唴璧勬簮</p>
                      <p className="text-sm font-bold text-stone-900">12 椤?/p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="text-xs font-bold text-blue-600 uppercase mb-2">澶栭儴璧勬簮</p>
                      <p className="text-sm font-bold text-stone-900">8 椤?/p>
                    </div>
                  </div>
                  
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">鏍″唴蹇冪悊鍋ュ悍璧勬簮</h3>
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
                  
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">澶栭儴涓撲笟鏈嶅姟娓犻亾</h3>
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
                <Sparkles size={16} /> 鏅鸿兘璧勬簮鍖归厤
              </div>
              <h2 className="text-4xl font-bold mb-4 leading-tight">涓烘偍鎺ㄨ崘鏈€鍚堥€傜殑骞查璧勬簮</h2>
              <p className="text-stone-400 text-lg mb-8">鍩轰簬娣峰悎鎺ㄨ崘绠楁硶锛屾牴鎹偍鐨勫績鐞嗙姸鎬併€佸帇鍔涙簮鍙婁娇鐢ㄥ亸濂斤紝绮惧噯鎺ㄩ€佹敮鎸佹柟妗堛€?/p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-500" /> 鍐呭杩囨护
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-500" /> 鍗忓悓杩囨护
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-500" /> 瀹炴椂璁＄畻
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
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">鍖归厤搴?{Math.round((resource.matchScore || 0) / 100 * 100)}%</span>
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">{resource.title}</h3>
                <p className="text-stone-500 text-sm mb-6 leading-relaxed">{resource.description}</p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {resource.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-stone-50 text-stone-500 text-[10px] font-bold rounded-full uppercase">{tag}</span>
                  ))}
                </div>
                <button className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold group-hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
                  绔嬪嵆棰勭害 <ChevronRight size={18} />
                </button>
              </motion.div>
            ))}
            
            {/* Matching Criteria */}
            <div className="bg-stone-50 p-8 rounded-[40px] border border-stone-100 flex flex-col justify-center">
              <h3 className="text-sm font-bold text-stone-900 mb-4">鍖归厤渚濇嵁锛?/h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                  <p className="text-xs text-stone-600">杩戞湡娴嬭瘎鏄剧ず"杞诲害鐒﹁檻"</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                  <p className="text-xs text-stone-600">鍘嬪姏婧愪富瑕佹潵鑷?瀹舵牎娌熼€?涓?宸ヤ綔鍘嬪姏"</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                  <p className="text-xs text-stone-600">鍋忓ソ"绾夸笅娲诲姩"涓?鍥綋鏀寔"</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                  <p className="text-xs text-stone-600">鍏磋叮鏍囩锛?蹇冪悊鎴愰暱"涓?鍘嬪姏绠＄悊"</p>
                </li>
              </ul>
              <div className="mt-6 p-4 bg-white rounded-2xl border border-stone-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-orange-500" />
                  <p className="text-xs font-bold text-stone-900">鏅鸿兘鎺ㄨ崘绠楁硶</p>
                </div>
                <p className="text-[10px] text-stone-500">閲囩敤鍩轰簬鍐呭鍜屽崗鍚岃繃婊ょ殑娣峰悎鎺ㄨ崘绠楁硶锛屾牴鎹暀甯堢敾鍍忎笌璧勬簮鏍囩璁＄畻鍖归厤搴︺€?/p>
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
                <h2 className="text-2xl font-bold text-stone-900">鍙戣捣鍥綋娲诲姩</h2>
                <button onClick={() => setShowAddActivity(false)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><X size={24} className="text-stone-400" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">娲诲姩鍚嶇О</label>
                  <input type="text" value={newActivity.title} onChange={(e) => setNewActivity({...newActivity, title: e.target.value})} placeholder="濡傦細鍛ㄤ簲鑼惰瘽浼? className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">绫诲瀷</label>
                    <select value={newActivity.type} onChange={(e) => setNewActivity({...newActivity, type: e.target.value as any})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none">
                      <option value="tea">鑼惰瘽浼?/option>
                      <option value="sandplay">鍥綋娌欑洏</option>
                      <option value="workshop">宸ヤ綔鍧?/option>
                      <option value="other">鍏朵粬</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">鏃ユ湡</label>
                    <input type="date" value={newActivity.date} onChange={(e) => setNewActivity({...newActivity, date: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">鍦扮偣</label>
                  <input type="text" value={newActivity.location} onChange={(e) => setNewActivity({...newActivity, location: e.target.value})} placeholder="濡傦細鏁欏笀涔嬪" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                </div>
              </div>
              <div className="p-8 bg-stone-50 flex justify-end gap-4">
                <button onClick={() => setShowAddActivity(false)} className="px-6 py-2 text-stone-500 font-bold">鍙栨秷</button>
                <button onClick={handleAddActivity} className="px-10 py-3 bg-stone-900 text-white rounded-2xl font-bold shadow-lg">纭鍙戝竷</button>
              </div>
            </motion.div>
          </div>
        )}

        {showResourceShare && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResourceShare(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-stone-900">鍒嗕韩鍥㈤槦璧勬簮</h2>
                <button onClick={() => setShowResourceShare(false)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><X size={24} className="text-stone-400" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">璧勬簮鏍囬</label>
                  <input type="text" value={newResource.title} onChange={(e) => setNewResource({...newResource, title: e.target.value})} placeholder="濡傦細鏁欏笀鍘嬪姏绠＄悊鎸囧崡" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">绫诲瀷</label>
                    <select value={newResource.type} onChange={(e) => setNewResource({...newResource, type: e.target.value as any})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none">
                      <option value="article">鏂囩珷</option>
                      <option value="video">瑙嗛</option>
                      <option value="tool">宸ュ叿</option>
                      <option value="other">鍏朵粬</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">璧勬簮閾炬帴</label>
                  <input type="url" value={newResource.url} onChange={(e) => setNewResource({...newResource, url: e.target.value})} placeholder="https://" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">璧勬簮鎻忚堪</label>
                  <textarea value={newResource.description} onChange={(e) => setNewResource({...newResource, description: e.target.value})} placeholder="绠€瑕佹弿杩拌祫婧愬唴瀹? className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none resize-none h-24" />
                </div>
              </div>
              <div className="p-8 bg-stone-50 flex justify-end gap-4">
                <button onClick={() => setShowResourceShare(false)} className="px-6 py-2 text-stone-500 font-bold">鍙栨秷</button>
                <button 
                  onClick={() => {
                    // 妯℃嫙娣诲姞璧勬簮
                    const resource = {
                      id: Date.now().toString(),
                      ...newResource,
                      createdAt: new Date().toISOString(),
                      author: profile?.displayName || '鍖垮悕缁勯暱'
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
                  鍒嗕韩璧勬簮
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
                <h2 className="text-xl font-bold text-stone-900">纭鍙栨秷鎶ュ悕</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-stone-600">纭畾瑕佸彇娑堣繖涓椿鍔ㄦ姤鍚嶅悧锛?/p>
              </div>
              <div className="p-6 bg-stone-50 flex justify-end gap-3">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 text-stone-500 font-bold text-sm"
                >
                  淇濈暀鎶ュ悕
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
                  纭鍙栨秷
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 鑷畾涔夊脊绐?*/}
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
    </div>
  );
};

export default Intervention;
