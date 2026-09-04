import React, { useEffect, useState } from "react";
import { UserProfile, PhysiologicalData, BehavioralData } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import CustomModal from "../components/CustomModal";
import PageContainer from "../components/layout/PageContainer";
import { PageHeader, GlassCard, Button, Input, Tabs } from "../components/ui";
import { 
  Heart, 
  User, 
  Briefcase, 
  Calendar,
  Users,
  Sparkles,
  Zap,
  Edit2,
  Trash2,
  Search,
  X,
  Check,
  Phone,
  BookOpen,
  GraduationCap,
  Mail,
  UserPlus,
  BarChart3,
  ShieldAlert,
  FileText,
  Info,
  Layers,
  ChevronDown,
  Wind,
  Activity,
  Moon,
  ListChecks,
  Clock
} from "lucide-react";

import api from "../services/api";

interface PersonalInfo {
  name: string;
  gender: string;
  phone: string;
  email: string;
  department: string;
  subject: string;
  grade: string;
  title: string;
  bio: string;
  teachingExperience?: number;
}

interface TeamMember {
  id: string;
  name: string;
  gender: string;
  subject: string;
  grade: string;
  phone: string;
  email: string;
  department: string;
  isGroupMember: boolean;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  gender: string;
  phone: string;
  subject: string;
  grade: string;
  teachingExperience?: number;
  managerId?: string;
}

interface PersonalSettingsProps {
  profile: UserProfile | null;
}

const PersonalSettings: React.FC<PersonalSettingsProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<"info" | "team" | "admin">("info");
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<PersonalInfo>>({});
  const [physioData, setPhysioData] = useState<PhysiologicalData | null>(null);
  const [behavioralData, setBehavioralData] = useState<BehavioralData | null>(null);
  const [showDataForm, setShowDataForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [hrvValue, setHrvValue] = useState<string>("");
  const [restingHRValue, setRestingHRValue] = useState<string>("");
  const [sleepDurationValue, setSleepDurationValue] = useState<string>("");
  const [deepSleepRatioValue, setDeepSleepRatioValue] = useState<string>("");
  const [classHours, setClassHours] = useState<string>("");
  const [meetingHours, setMeetingHours] = useState<string>("");
  const [nonTeachingTasks, setNonTeachingTasks] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeamMember[]>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [selectedDeptHead, setSelectedDeptHead] = useState<string | null>(null);
  const [deptHeads, setDeptHeads] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSubjectFilter, setUserSubjectFilter] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: "",
    email: "",
    subject: "",
    grade: "",
    teachingExperience: "",
    gender: "",
    phone: ""
  });
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning" | "info" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
    showCancel?: boolean;
  }>({ isOpen: false, type: "info", title: "", message: "" });

  const isTeamLeader = profile?.role === "dept_head";
  const isAdmin = profile?.role === "admin";
  
  // 确保普通用户始终停留在个人信息标签页
  useEffect(() => {
    if (!isTeamLeader && !isAdmin && activeTab !== "info") {
      setActiveTab("info");
    }
  }, [isTeamLeader, isAdmin, activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      
      setDataLoading(true);
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${year}-${month}-${day}`;
        
        const [personalInfoData, physio, workload] = await Promise.all([
          api.personalInfo.get(),
          api.physiological.getDataByDate(profile.uid, yesterdayStr),
          api.workload.getDataByDate(profile.uid, yesterdayStr)
        ]);
        
        setPersonalInfo(personalInfoData);
        
        if (physio) {
          setPhysioData({
            userId: profile.uid,
            hrv: physio.hrv,
            restingHR: physio.restingHR,
            sleepDuration: physio.sleepDuration,
            deepSleepRatio: physio.deepSleepRatio,
            timestamps: physio.timestamps,
            recordedAt: physio.recordedAt || new Date().toISOString()
          });
        }
        
        if (workload) {
          setBehavioralData({
            loginFrequency: 0,
            toolUsageMinutes: 0,
            communityInteractions: 0,
            workload: {
              classHours: workload.classHours,
              meetingHours: workload.meetingHours,
              nonTeachingTasks: workload.nonTeachingTasks,
              totalWorkloadIndex: workload.totalWorkloadIndex
            }
          });
        }
      } catch (e) {
        console.error("获取数据失败:", e);
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchData();
  }, [profile]);

  useEffect(() => {
    if (isTeamLeader || isAdmin) {
      const fetchTeamData = async () => {
        try {
          const [members, teachers] = await Promise.all([
            api.group.getMembers(isAdmin && selectedDeptHead ? selectedDeptHead : undefined),
            api.group.getAllTeachers(isAdmin && selectedDeptHead ? selectedDeptHead : undefined)
          ]);
          setTeamMembers(members);
          setAllTeachers(teachers);
        } catch (e) {
          console.error("获取团队数据失败:", e);
        }
      };
      fetchTeamData();
    }
  }, [isTeamLeader, isAdmin, selectedDeptHead]);

  useEffect(() => {
    if (isAdmin) {
      const fetchDeptHeads = async () => {
        try {
          const heads = await api.group.getDeptHeads();
          setDeptHeads(heads);
        } catch (e) {
          console.error("获取教研组长失败:", e);
        }
      };
      fetchDeptHeads();
    }
  }, [isAdmin]);

  const handleSaveInfo = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const dataToSave = {
        name: editFormData.name || personalInfo?.name || "",
        email: editFormData.email || personalInfo?.email || "",
        gender: editFormData.gender || personalInfo?.gender || "",
        phone: editFormData.phone || personalInfo?.phone || "",
        grade: editFormData.grade || personalInfo?.grade || "",
        subject: editFormData.subject || personalInfo?.subject || "",
        teachingExperience: editFormData.teachingExperience !== undefined ? editFormData.teachingExperience : personalInfo?.teachingExperience,
      };
      
      await api.personalInfo.save(dataToSave);
      
      setModalState({
        isOpen: true,
        type: "success",
        title: "保存成功",
        message: "您的个人信息已成功保存！"
      });
      setShowInfoForm(false);
      
      const updatedInfo = await api.personalInfo.get();
      setPersonalInfo(updatedInfo);
    } catch (e) {
      console.error("保存失败:", e);
      setModalState({
        isOpen: true,
        type: "error",
        title: "保存失败",
        message: "保存个人信息失败，请重试！"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDataByDate = async (date: string) => {
    if (!profile) return;
    
    try {
      const [physioData, workloadData] = await Promise.all([
        api.physiological.getDataByDate(profile.uid, date),
        api.workload.getDataByDate(profile.uid, date)
      ]);
      
      console.log('获取到的日期数据:', { date, physioData, workloadData });
      
      if (physioData) {
        setHrvValue(physioData.hrv !== null && physioData.hrv !== undefined ? String(physioData.hrv) : "");
        setRestingHRValue(physioData.restingHR !== null && physioData.restingHR !== undefined ? String(physioData.restingHR) : "");
        setSleepDurationValue(physioData.sleepDuration !== null && physioData.sleepDuration !== undefined ? String(physioData.sleepDuration) : "");
        setDeepSleepRatioValue(physioData.deepSleepRatio !== null && physioData.deepSleepRatio !== undefined ? String(physioData.deepSleepRatio) : "");
      }
      
      if (workloadData) {
        setClassHours(workloadData.classHours !== null && workloadData.classHours !== undefined ? String(workloadData.classHours) : "");
        setMeetingHours(workloadData.meetingHours !== null && workloadData.meetingHours !== undefined ? String(workloadData.meetingHours) : "");
        setNonTeachingTasks(workloadData.nonTeachingTasks !== null && workloadData.nonTeachingTasks !== undefined ? String(workloadData.nonTeachingTasks) : "");
      }
    } catch (e) {
      console.error("获取日期数据失败:", e);
    }
  };

  const handleOpenDataForm = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${year}-${month}-${day}`;
    setSelectedDate(yesterdayStr);
    setHrvValue("");
    setRestingHRValue("");
    setSleepDurationValue("");
    setDeepSleepRatioValue("");
    setClassHours("");
    setMeetingHours("");
    setNonTeachingTasks("");
    setShowDataForm(true);
    loadDataByDate(yesterdayStr);
  };

  useEffect(() => {
    if (showDataForm && selectedDate) {
      loadDataByDate(selectedDate);
    }
  }, [selectedDate, showDataForm]);

  const handleSaveData = async () => {
    if (!profile) return;
    
    console.log('保存数据时的表单值:', { 
      selectedDate, 
      hrvValue, 
      restingHRValue, 
      sleepDurationValue, 
      deepSleepRatioValue, 
      classHours, 
      meetingHours, 
      nonTeachingTasks 
    });
    
    setLoading(true);
    try {
      const hasPhysioData = hrvValue || restingHRValue || sleepDurationValue || deepSleepRatioValue;
      
      if (hasPhysioData) {
        const physioData: any = { date: selectedDate };
        if (hrvValue) physioData.hrv = parseFloat(hrvValue);
        if (restingHRValue) physioData.restingHR = parseFloat(restingHRValue);
        if (sleepDurationValue) physioData.sleepDuration = parseFloat(sleepDurationValue);
        if (deepSleepRatioValue) physioData.deepSleepRatio = parseFloat(deepSleepRatioValue);
        
        console.log('保存生理数据:', physioData);
        await api.physiological.save(physioData);
      }
      
      if (classHours || meetingHours || nonTeachingTasks) {
        const workloadData = {
          classHours: parseFloat(classHours) || 0,
          meetingHours: parseFloat(meetingHours) || 0,
          nonTeachingTasks: parseFloat(nonTeachingTasks) || 0,
          date: selectedDate
        };
        console.log('保存工作负载:', workloadData);
        await api.workload.save(workloadData);
      }
      
      setModalState({
        isOpen: true,
        type: "success",
        title: "保存成功",
        message: "您的数据已成功保存！"
      });
      setShowDataForm(false);
      
      if (profile) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${year}-${month}-${day}`;
        
        const [physio, workload] = await Promise.all([
          api.physiological.getDataByDate(profile.uid, yesterdayStr),
          api.workload.getDataByDate(profile.uid, yesterdayStr)
        ]);
        
        if (physio) {
          setPhysioData({
            userId: profile.uid,
            hrv: physio.hrv,
            restingHR: physio.restingHR,
            sleepDuration: physio.sleepDuration,
            deepSleepRatio: physio.deepSleepRatio,
            timestamps: physio.timestamps,
            recordedAt: physio.recordedAt || new Date().toISOString()
          });
          if (physio.hrv !== null && physio.hrv !== undefined) {
            setHrvValue(physio.hrv.toString());
          }
          if (physio.restingHR !== null && physio.restingHR !== undefined) {
            setRestingHRValue(physio.restingHR.toString());
          }
          if (physio.sleepDuration !== null && physio.sleepDuration !== undefined) {
            setSleepDurationValue(physio.sleepDuration.toString());
          }
          if (physio.deepSleepRatio !== null && physio.deepSleepRatio !== undefined) {
            setDeepSleepRatioValue(physio.deepSleepRatio.toString());
          }
        }
        
        if (workload) {
          setBehavioralData({
            loginFrequency: 0,
            toolUsageMinutes: 0,
            communityInteractions: 0,
            workload: {
              classHours: workload.classHours,
              meetingHours: workload.meetingHours,
              nonTeachingTasks: workload.nonTeachingTasks,
              totalWorkloadIndex: workload.totalWorkloadIndex
            }
          });
          if (workload.classHours !== null && workload.classHours !== undefined) {
            setClassHours(workload.classHours.toString());
          }
          if (workload.meetingHours !== null && workload.meetingHours !== undefined) {
            setMeetingHours(workload.meetingHours.toString());
          }
          if (workload.nonTeachingTasks !== null && workload.nonTeachingTasks !== undefined) {
            setNonTeachingTasks(workload.nonTeachingTasks.toString());
          }
        }
      }
    } catch (e) {
      console.error("保存失败:", e);
      setModalState({
        isOpen: true,
        type: "error",
        title: "保存失败",
        message: "保存个人信息失败，请重试！"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (teacherId: string) => {
    try {
      await api.group.addMember(teacherId, isAdmin && selectedDeptHead ? selectedDeptHead : undefined);
      const [members, teachers] = await Promise.all([
        api.group.getMembers(isAdmin && selectedDeptHead ? selectedDeptHead : undefined),
        api.group.getAllTeachers(isAdmin && selectedDeptHead ? selectedDeptHead : undefined)
      ]);
      setTeamMembers(members);
      setAllTeachers(teachers);
      setModalState({
        isOpen: true,
        type: "success",
        title: "添加成功",
        message: "教研组成员已成功添加！"
      });
    } catch (e) {
      console.error("添加成员失败:", e);
      setModalState({
        isOpen: true,
        type: "error",
        title: "添加失败",
        message: "添加教研组成员失败，请重试！"
      });
    }
  };

  const handleRemoveMember = async (teacherId: string) => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title: "确认移除",
      message: "确定要移除这位成员吗？",
      showCancel: true,
      onConfirm: async () => {
        try {
          await api.group.removeMember(teacherId);
          const [members, teachers] = await Promise.all([
            api.group.getMembers(isAdmin && selectedDeptHead ? selectedDeptHead : undefined),
            api.group.getAllTeachers(isAdmin && selectedDeptHead ? selectedDeptHead : undefined)
          ]);
          setTeamMembers(members);
          setAllTeachers(teachers);
          setModalState({
            isOpen: true,
            type: "success",
            title: "移除成功",
            message: "教研组成员已成功移除！"
          });
        } catch (e) {
          console.error("移除成员失败:", e);
          setModalState({
            isOpen: true,
            type: "error",
            title: "移除失败",
            message: "移除教研组成员失败，请重试！"
          });
        }
      }
    });
  };

  const fetchAdminData = async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    try {
      const users = await api.admin.getAllUsers();
      setAllUsers(users);
    } catch (e) {
      console.error("获取用户列表失败:", e);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSetUserRole = async (userId: string, role: string) => {
    try {
      await api.admin.setUserRole(userId, role);
      setModalState({
        isOpen: true,
        type: "success",
        title: "更新成功",
        message: "用户角色已成功更新！"
      });
      await fetchAdminData();
    } catch (e) {
      console.error("更新角色失败:", e);
      setModalState({
        isOpen: true,
        type: "error",
        title: "更新失败",
        message: "更新用户角色失败，请重试！"
      });
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setEditUserForm({
      name: user.name || "",
      email: user.email || "",
      subject: user.subject || "",
      grade: user.grade || "",
      teachingExperience: user.teachingExperience?.toString() || "",
      gender: user.gender || "",
      phone: user.phone || ""
    });
    setShowEditUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      await api.admin.updateUser(editingUser.id, {
        name: editUserForm.name,
        email: editUserForm.email,
        subject: editUserForm.subject,
        grade: editUserForm.grade,
        teachingExperience: editUserForm.teachingExperience ? parseInt(editUserForm.teachingExperience) : null,
        gender: editUserForm.gender,
        phone: editUserForm.phone
      });
      setModalState({
        isOpen: true,
        type: "success",
        title: "更新成功",
        message: "用户信息已成功更新！"
      });
      setShowEditUserModal(false);
      await fetchAdminData();
    } catch (e) {
      console.error("更新用户信息失败:", e);
      setModalState({
        isOpen: true,
        type: "error",
        title: "更新失败",
        message: "更新用户信息失败，请重试！"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const filteredTeachers = allTeachers.filter(teacher => {
    const query = searchQuery.toLowerCase();
    return (
      teacher.name.toLowerCase().includes(query) ||
      teacher.subject.toLowerCase().includes(query) ||
      teacher.grade.toLowerCase().includes(query) ||
      teacher.email.toLowerCase().includes(query)
    );
  });

  return (
    <PageContainer>
      <PageHeader
        title="个人中心"
        subtitle={isTeamLeader || isAdmin ? "管理您的个人信息、教研组设置和用户权限" : "管理您的个人信息"}
        actions={
          (isTeamLeader || isAdmin) && (
            <Tabs
              accent="slate"
              items={[
                { key: "info", label: "个人信息" },
                ...(isTeamLeader || isAdmin ? [{ key: "team", label: "教研组成员" }] : []),
                ...(isAdmin ? [{ key: "admin", label: "用户管理" }] : []),
              ]}
              active={activeTab}
              onChange={(k) => setActiveTab(k as "info" | "team" | "admin")}
            />
          )
        }
      />

      <div className="space-y-6">
        {activeTab === "info" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-ink-900">个人信息</h2>
                      <p className="text-ink-500 text-xs sm:text-sm mt-1">查看和修改您的基本资料</p>
                    </div>
                    <Button
                      variant="primary"
                      icon={Edit2}
                      onClick={() => {
                        setEditFormData({
                          name: personalInfo?.name,
                          email: personalInfo?.email,
                          gender: personalInfo?.gender,
                          phone: personalInfo?.phone,
                          grade: personalInfo?.grade,
                          subject: personalInfo?.subject,
                          teachingExperience: personalInfo?.teachingExperience
                        });
                        setShowInfoForm(true);
                      }}
                    >
                      修改
                    </Button>
                  </div>
                  
                  {dataLoading ? (
                    <div className="space-y-3 sm:space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-3 bg-frost-100 rounded w-16 mb-1.5" />
                          <div className="h-6 bg-frost-100 rounded w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <p className="text-xs sm:text-xs text-ink-500 mb-1.5">姓名</p>
                        <p className="text-sm sm:text-sm font-bold text-ink-900">{personalInfo?.name || profile?.displayName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-xs text-ink-500 mb-1.5">邮箱</p>
                        <p className="text-sm sm:text-sm font-bold text-ink-900">{personalInfo?.email || profile?.email || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-xs text-ink-500 mb-1.5">性别</p>
                        <p className="text-sm sm:text-sm font-bold text-ink-900">{personalInfo?.gender || "未填写"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-xs text-ink-500 mb-1.5">手机号</p>
                        <p className="text-sm sm:text-sm font-bold text-ink-900">{personalInfo?.phone || "未填写"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-xs text-ink-500 mb-1.5">学科</p>
                        <p className="text-sm sm:text-sm font-bold text-ink-900">{personalInfo?.subject || "未填写"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-xs text-ink-500 mb-1.5">年级</p>
                        <p className="text-sm sm:text-sm font-bold text-ink-900">{personalInfo?.grade || "未填写"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-xs text-ink-500 mb-1.5">教龄</p>
                        <p className="text-sm sm:text-sm font-bold text-ink-900">{personalInfo?.teachingExperience ? `${personalInfo.teachingExperience} 年` : "未填写"}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 bg-frost-100 rounded-xl border border-frost-200 flex items-start gap-2">
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-frost-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Info size={6} className="sm:w-2.5 sm:h-2.5 text-ink-600" />
                    </div>
                    <p className="text-[8px] sm:text-[10px] text-ink-600 leading-relaxed">
                      您可以随时修改您的个人信息，修改后的信息将用于匹配相关的数据统计。
                    </p>
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GlassCard className="p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-ink-900">每日数据填写</h2>
                      <p className="text-ink-500 text-xs sm:text-sm mt-1">记录您的健康指标和工作负载情况</p>
                    </div>
                    <Button
                      variant="primary"
                      icon={Sparkles}
                      onClick={handleOpenDataForm}
                    >
                      填写
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-frost-200">
                      <p className="text-xs sm:text-xs font-medium text-ink-500 mb-1.5 sm:mb-2">HRV</p>
                      <p className="text-xl sm:text-2xl font-bold text-ink-900">
                        {dataLoading ? (
                          <span className="text-ink-400">...</span>
                        ) : (
                          physioData && physioData.hrv !== null && physioData.hrv !== undefined ? Math.round(physioData.hrv) : "-"
                        )}
                      </p>
                      <p className="text-xs sm:text-xs text-ink-400">ms</p>
                    </div>
                    
                    <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-frost-200">
                      <p className="text-xs sm:text-xs font-medium text-ink-500 mb-1.5 sm:mb-2">静息心率</p>
                      <p className="text-xl sm:text-2xl font-bold text-ink-900">
                        {dataLoading ? (
                          <span className="text-ink-400">...</span>
                        ) : (
                          physioData && physioData.restingHR !== null && physioData.restingHR !== undefined ? Math.round(physioData.restingHR) : "-"
                        )}
                      </p>
                      <p className="text-xs sm:text-xs text-ink-400">次/分</p>
                    </div>
                    
                    <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-frost-200">
                      <p className="text-xs sm:text-xs font-medium text-ink-500 mb-1.5 sm:mb-2">睡眠时长</p>
                      <p className="text-xl sm:text-2xl font-bold text-ink-900">
                        {dataLoading ? (
                          <span className="text-ink-400">...</span>
                        ) : (
                          physioData && physioData.sleepDuration !== null && physioData.sleepDuration !== undefined ? physioData.sleepDuration : "-"
                        )}
                      </p>
                      <p className="text-xs sm:text-xs text-ink-400">小时</p>
                    </div>
                    
                    <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-frost-200">
                      <p className="text-xs sm:text-xs font-medium text-ink-500 mb-1.5 sm:mb-2">深睡比例</p>
                      <p className="text-xl sm:text-2xl font-bold text-ink-900">
                        {dataLoading ? (
                          <span className="text-ink-400">...</span>
                        ) : (
                          physioData && physioData.deepSleepRatio !== null && physioData.deepSleepRatio !== undefined ? physioData.deepSleepRatio : "-"
                        )}
                      </p>
                      <p className="text-xs sm:text-xs text-ink-400">%</p>
                    </div>
                    
                    <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-frost-200">
                      <p className="text-xs sm:text-xs font-medium text-ink-500 mb-1.5 sm:mb-2">每日课时</p>
                      <p className="text-xl sm:text-2xl font-bold text-ink-900">
                        {dataLoading ? (
                          <span className="text-ink-400">...</span>
                        ) : (
                          behavioralData && behavioralData.workload && behavioralData.workload.classHours !== null && behavioralData.workload.classHours !== undefined ? behavioralData.workload.classHours : "-"
                        )}
                      </p>
                      <p className="text-xs sm:text-xs text-ink-400">节</p>
                    </div>
                    
                    <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-frost-200">
                      <p className="text-xs sm:text-xs font-medium text-ink-500 mb-1.5 sm:mb-2">会议时长</p>
                      <p className="text-xl sm:text-2xl font-bold text-ink-900">
                        {dataLoading ? (
                          <span className="text-ink-400">...</span>
                        ) : (
                          behavioralData && behavioralData.workload && behavioralData.workload.meetingHours !== null && behavioralData.workload.meetingHours !== undefined ? behavioralData.workload.meetingHours : "-"
                        )}
                      </p>
                      <p className="text-xs sm:text-xs text-ink-400">小时</p>
                    </div>
                    
                    <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-frost-200">
                      <p className="text-xs sm:text-xs font-medium text-ink-500 mb-1.5 sm:mb-2">非教学任务</p>
                      <p className="text-xl sm:text-2xl font-bold text-ink-900">
                        {dataLoading ? (
                          <span className="text-ink-400">...</span>
                        ) : (
                          behavioralData && behavioralData.workload && behavioralData.workload.nonTeachingTasks !== null && behavioralData.workload.nonTeachingTasks !== undefined ? behavioralData.workload.nonTeachingTasks : "-"
                        )}
                      </p>
                      <p className="text-[9px] sm:text-xs text-ink-400">项</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 bg-frost-100 rounded-xl border border-frost-200 flex items-start gap-2">
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-frost-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Info size={6} className="sm:w-2.5 sm:h-2.5 text-ink-600" />
                    </div>
                    <p className="text-[8px] sm:text-[10px] text-ink-600 leading-relaxed">
                      每天填写您的健康指标和工作负载数据，系统将根据这些数据进行个性化的心理健康评估。
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="p-4 sm:p-6 lg:p-8">
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6">
                    <div className="p-2.5 sm:p-3 bg-gradient-to-br from-ink-600 to-ink-700 rounded-xl sm:rounded-2xl">
                      <Layers size={20} className="sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-ink-900">快速导航</h2>
                      <p className="text-[10px] text-ink-400">快速访问其他功能模块</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                    <Link 
                      to="/assessment"
                      className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-frost-50 rounded-xl hover:bg-frost-100 transition-colors group border border-frost-200 text-center"
                    >
                      <div className="p-1.5 sm:p-2 bg-gradient-to-br from-meadow-500 to-meadow-600 rounded-lg">
                        <FileText size={12} className="sm:w-4 sm:h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-xs font-semibold text-ink-900">绿色测评</p>
                        <p className="text-[10px] sm:text-[10px] text-ink-500">进行心理测评</p>
                      </div>
                    </Link>
                    
                    <Link 
                      to="/toolkit"
                      className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-frost-50 rounded-xl hover:bg-frost-100 transition-colors group border border-frost-200 text-center"
                    >
                      <div className="p-1.5 sm:p-2 bg-gradient-to-br from-breeze-500 to-breeze-600 rounded-lg">
                        <Wind size={12} className="sm:w-4 sm:h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-xs font-semibold text-ink-900">蓝色调适</p>
                        <p className="text-[10px] sm:text-[10px] text-ink-500">心理调适工具</p>
                      </div>
                    </Link>
                    
                    <Link 
                      to="/intervention"
                      className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-frost-50 rounded-xl hover:bg-frost-100 transition-colors group border border-frost-200 text-center"
                    >
                      <div className="p-1.5 sm:p-2 bg-gradient-to-br from-terra-500 to-terra-600 rounded-lg">
                        <Users size={12} className="sm:w-4 sm:h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-xs font-semibold text-ink-900">橙色干预</p>
                        <p className="text-[10px] sm:text-[10px] text-ink-500">心理支持网络</p>
                      </div>
                    </Link>
                    
                    {(profile?.role === "admin" || profile?.role === "psychologist" || profile?.role === "dept_head") && (
                      <Link 
                        to="/warnings"
                        className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-frost-50 rounded-xl hover:bg-frost-100 transition-colors group border border-frost-200 text-center"
                      >
                        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-coral-500 to-coral-600 rounded-lg">
                          <ShieldAlert size={12} className="sm:w-4 sm:h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-xs font-semibold text-ink-900">红色预警</p>
                          <p className="text-[10px] sm:text-[10px] text-ink-500">查看风险预警</p>
                        </div>
                      </Link>
                    )}
                    
                    {profile?.role === "admin" && (
                      <Link 
                        to="/cockpit"
                        className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-frost-50 rounded-xl hover:bg-frost-100 transition-colors group border border-frost-200 text-center"
                      >
                        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-iris-500 to-iris-600 rounded-lg">
                          <BarChart3 size={12} className="sm:w-4 sm:h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-xs font-semibold text-ink-900">紫色评估</p>
                          <p className="text-[10px] sm:text-[10px] text-ink-500">查看整体统计</p>
                        </div>
                      </Link>
                    )}
                  </div>
                  
                  <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 bg-frost-100 rounded-xl border border-frost-200 flex items-start gap-2">
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-frost-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Info size={6} className="sm:w-2.5 sm:h-2.5 text-ink-600" />
                    </div>
                    <p className="text-[8px] sm:text-[10px] text-ink-600 leading-relaxed">
                      点击上方卡片可快速跳转到对应的功能模块，便捷访问所有心理健康管理工具。
                    </p>
                  </div>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {activeTab === "team" && (isTeamLeader || isAdmin) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-ink-900">教研组成员</h2>
                  <p className="text-ink-500 text-xs sm:text-sm mt-1">管理教研组的教师成员</p>
                </div>
                {(isTeamLeader || (isAdmin && selectedDeptHead)) && (
                  <Button
                    variant="primary"
                    icon={UserPlus}
                    onClick={() => setShowAddMemberModal(true)}
                  >
                    新增成员
                  </Button>
                )}
              </div>

              {isAdmin && (
                <div className="mb-4 sm:mb-6">
                  <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">选择教研组长</label>
                  <div className="relative">
                    <select
                      value={selectedDeptHead || ""}
                      onChange={(e) => setSelectedDeptHead(e.target.value || null)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 appearance-none outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800 text-sm"
                    >
                      <option value="">请选择要管理的教研组长</option>
                      {deptHeads.map((head) => (
                        <option key={head.id} value={head.id}>
                          {head.name} ({head.department || "未设置学科"})
                        </option>
                      ))}
                    </select>
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                  </div>
                </div>
              )}

              {(isTeamLeader || (isAdmin && selectedDeptHead)) ? (
                teamMembers.length === 0 ? (
                  <div className="text-center py-10 sm:py-12">
                    <Users size={36} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-frost-200" />
                    <p className="text-[10px] sm:text-xs text-ink-500 font-medium">暂无教研组成员</p>
                    <p className="text-[8px] sm:text-[10px] text-ink-400 mt-1">点击"新增成员"添加教师到教研组</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-frost-200 bg-white/60">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-frost-100 border-b border-frost-200">
                          <th className="py-2.5 sm:py-3.5 pl-3 sm:pl-6 pr-1.5 sm:pr-3 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">姓名</th>
                          <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">学科</th>
                          <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">年级</th>
                          <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">邮箱</th>
                          <th className="py-2.5 sm:py-3.5 pl-1.5 sm:pl-3 pr-3 sm:pr-6 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-frost-100">
                        {teamMembers.map((member) => (
                          <tr key={member.id} className="group hover:bg-frost-50 transition-colors">
                            <td className="py-2.5 sm:py-3.5 pl-3 sm:pl-6 pr-1.5 sm:pr-3 font-bold text-ink-900 text-xs sm:text-xs whitespace-nowrap">{member.name}</td>
                            <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-ink-500 text-xs sm:text-xs whitespace-nowrap">{member.subject || "-"}</td>
                            <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-ink-500 text-xs sm:text-xs whitespace-nowrap">{member.grade || "-"}</td>
                            <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-ink-500 text-xs sm:text-xs whitespace-nowrap">{member.email}</td>
                            <td className="py-2.5 sm:py-3.5 pl-1.5 sm:pl-3 pr-3 sm:pr-6">
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1.5 text-coral-500 hover:bg-coral-50 rounded-xl transition-colors"
                                title="移除成员"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="text-center py-10 sm:py-12">
                  <Users size={36} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-frost-200" />
                  <p className="text-[10px] sm:text-xs text-ink-500 font-medium">请选择要管理的教研组长</p>
                </div>
              )}
              
              <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 bg-frost-100 rounded-xl border border-frost-200 flex items-start gap-2">
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-frost-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Info size={6} className="sm:w-2.5 sm:h-2.5 text-ink-600" />
                </div>
                <p className="text-[8px] sm:text-[10px] text-ink-600 leading-relaxed">
                  教研组长可以管理自己教研组的成员，管理员可以选择任意教研组长并管理其教研组。
                </p>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {activeTab === "admin" && isAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-ink-900">用户管理</h2>
                  <p className="text-ink-500 text-xs sm:text-sm mt-1">管理所有用户和设置角色权限</p>
                </div>
                <Button
                  variant="primary"
                  icon={Zap}
                  onClick={fetchAdminData}
                >
                  刷新
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="搜索姓名或邮箱..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white/70 border border-frost-200 rounded-xl text-sm text-ink-800 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800"
                  />
                </div>
                <div className="relative">
                  <select
                    value={userSubjectFilter}
                    onChange={(e) => setUserSubjectFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/70 border border-frost-200 rounded-xl text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800"
                  >
                    <option value="">全部学科</option>
                    {Array.from(new Set(allUsers.map(u => u.subject).filter(Boolean))).map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/70 border border-frost-200 rounded-xl text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800"
                  >
                    <option value="">全部角色</option>
                    <option value="teacher">普通教师</option>
                    <option value="dept_head">教研组长</option>
                    <option value="psychologist">心理专家</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
              </div>

              {adminLoading ? (
                <div className="text-center py-10 sm:py-12">
                  <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-3 sm:border-4 border-frost-200 border-t-ink-800 rounded-full mx-auto mb-3 sm:mb-4"></div>
                  <p className="text-[10px] sm:text-xs text-ink-500">加载中...</p>
                </div>
              ) : (
                (() => {
                  const filteredUsers = allUsers.filter(user => {
                    const matchesSearch = !userSearchQuery || 
                      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      user.email.toLowerCase().includes(userSearchQuery.toLowerCase());
                    const matchesSubject = !userSubjectFilter || user.subject === userSubjectFilter;
                    const matchesRole = !userRoleFilter || user.role === userRoleFilter;
                    return matchesSearch && matchesSubject && matchesRole;
                  });
                  
                  return filteredUsers.length === 0 ? (
                    <div className="text-center py-10 sm:py-12">
                      <Users size={36} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-frost-200" />
                      <p className="text-[10px] sm:text-xs text-ink-500 font-medium">暂无匹配的用户</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-frost-200 bg-white/60">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-frost-100 border-b border-frost-200">
                            <th className="py-2.5 sm:py-3.5 pl-3 sm:pl-6 pr-1.5 sm:pr-3 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">姓名</th>
                            <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">邮箱</th>
                            <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">学科</th>
                            <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">教龄</th>
                            <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">所属教研组</th>
                            <th className="py-2.5 sm:py-3.5 pl-1.5 sm:pl-3 pr-1.5 sm:pr-3 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">角色</th>
                            <th className="py-2.5 sm:py-3.5 pl-1.5 sm:pl-3 pr-3 sm:pr-6 text-xs sm:text-xs font-bold text-ink-700 uppercase tracking-widest whitespace-nowrap">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-frost-100">
                          {filteredUsers.map((user) => {
                            const isCurrentUser = profile?.uid === user.id;
                            const managerName = deptHeads.find(h => h.id === user.managerId)?.name || "无";
                            return (
                              <tr key={user.id} className="group hover:bg-frost-50 transition-colors">
                                <td className="py-2.5 sm:py-3.5 pl-3 sm:pl-6 pr-1.5 sm:pr-3 font-bold text-ink-900 text-xs sm:text-xs whitespace-nowrap">{user.name}</td>
                                <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-ink-500 text-xs sm:text-xs whitespace-nowrap">{user.email}</td>
                                <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-ink-500 text-xs sm:text-xs whitespace-nowrap">{user.subject || "-"}</td>
                                <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-ink-500 text-xs sm:text-xs whitespace-nowrap">{user.teachingExperience ? `${user.teachingExperience}年` : "-"}</td>
                                <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-ink-500 text-xs sm:text-xs whitespace-nowrap">{managerName}</td>
                                <td className="py-2.5 sm:py-3.5 pl-1.5 sm:pl-3 pr-1.5 sm:pr-3">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <select
                                      value={user.role}
                                      onChange={(e) => handleSetUserRole(user.id, e.target.value)}
                                      disabled={isCurrentUser}
                                      className={`px-2.5 py-1.5 bg-white/70 border border-frost-200 rounded-xl text-xs text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800 ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <option value="teacher">普通教师</option>
                                      <option value="dept_head">教研组长</option>
                                      <option value="psychologist">心理专家</option>
                                      <option value="admin">管理员</option>
                                    </select>
                                    <div className={`px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-xs font-medium ${user.role === 'admin' ? 'bg-coral-100 text-coral-700' :
                                      user.role === 'dept_head' ? 'bg-breeze-100 text-breeze-700' :
                                      user.role === 'psychologist' ? 'bg-meadow-100 text-meadow-700' :
                                      'bg-frost-100 text-ink-700'}`}>
                                      {user.role === 'admin' ? '管理员' :
                                       user.role === 'dept_head' ? '教研组长' :
                                       user.role === 'psychologist' ? '心理专家' :
                                       '普通教师'}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 sm:py-3.5 pl-1.5 sm:pl-3 pr-3 sm:pr-6">
                                  <button
                                    onClick={() => handleEditUser(user)}
                                    className="p-1.5 text-ink-500 hover:bg-frost-100 rounded-xl transition-colors"
                                    title="编辑用户信息"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
              
              <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 bg-frost-100 rounded-xl border border-frost-200 flex items-start gap-2">
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-frost-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Info size={6} className="sm:w-2.5 sm:h-2.5 text-ink-600" />
                </div>
                <p className="text-[8px] sm:text-[10px] text-ink-600 leading-relaxed">
                  管理员可以修改所有用户的角色，但不能修改自己的角色。不同的角色拥有不同的访问权限。
                </p>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>

      {showInfoForm && (
        <div className="absolute inset-0 z-[100] m-0! bg-ink-900/30 backdrop-blur-sm">
          <div className="sticky top-0 h-screen flex items-center justify-center p-4">
          <div className="glass rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[calc(100vh_-_5rem)]">
            <button
              onClick={() => setShowInfoForm(false)}
              className="absolute top-4 right-4 p-2 text-ink-400 hover:text-ink-600 hover:bg-frost-100 rounded-xl transition-all z-10"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col overflow-hidden flex-1 min-h-0">
              <div className="flex flex-col items-center text-center space-y-3 p-6 sm:p-8 pb-5 border-b border-frost-100 flex-shrink-0">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-bold text-ink-900">修改个人信息</h3>
                  <p className="text-xs sm:text-sm text-ink-500">更新您的基本资料</p>
                </div>
              </div>

              <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">姓名</label>
                <Input
                  icon={User}
                  type="text"
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">邮箱</label>
                <Input
                  icon={Mail}
                  type="email"
                  value={editFormData.email || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="请输入邮箱"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">性别</label>
                <div className="relative">
                  <select
                    value={editFormData.gender || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 appearance-none outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800 text-sm"
                  >
                    <option value="">请选择</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-xs font-medium text-ink-700 mb-2">手机号</label>
                <Input
                  icon={Phone}
                  type="tel"
                  value={editFormData.phone || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="请输入手机号"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-xs font-medium text-ink-700 mb-2">学科</label>
                <div className="relative">
                  <select
                    value={editFormData.subject || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 appearance-none outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800 text-sm"
                  >
                    <option value="">请选择</option>
                    <option value="语文">语文</option>
                    <option value="数学">数学</option>
                    <option value="英语">英语</option>
                    <option value="科学">科学</option>
                    <option value="道法">道法</option>
                    <option value="音乐">音乐</option>
                    <option value="体育">体育</option>
                    <option value="美术">美术</option>
                    <option value="信息科技">信息科技</option>
                    <option value="心理健康">心理健康</option>
                  </select>
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-xs font-medium text-ink-700 mb-2">年级</label>
                <div className="relative">
                  <select
                    value={editFormData.grade || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 appearance-none outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800 text-sm"
                  >
                    <option value="">请选择</option>
                    <option value="一年级">一年级</option>
                    <option value="二年级">二年级</option>
                    <option value="三年级">三年级</option>
                    <option value="四年级">四年级</option>
                    <option value="五年级">五年级</option>
                    <option value="六年级">六年级</option>
                  </select>
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">教龄</label>
                <Input
                  icon={GraduationCap}
                  type="number"
                  min="0"
                  value={editFormData.teachingExperience || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, teachingExperience: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="请输入教龄"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:col-span-2">
                <button
                  onClick={() => setShowInfoForm(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/70 text-ink-700 border border-frost-200 font-semibold hover:bg-white transition-all flex items-center justify-center gap-2"
                >
                  <X size={18} /> 取消
                </button>
                <button
                  onClick={handleSaveInfo}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white font-semibold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Check size={18} /> {loading ? "保存中..." : "保存"}
                </button>
              </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {showDataForm && (
        <div className="absolute inset-0 z-[100] m-0! bg-ink-900/30 backdrop-blur-sm">
          <div className="sticky top-0 h-screen flex items-center justify-center p-4">
          <div className="glass rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden relative flex flex-col max-h-[calc(100vh_-_5rem)]">
            <button
              onClick={() => setShowDataForm(false)}
              className="absolute top-4 right-4 p-2 text-ink-400 hover:text-ink-600 hover:bg-frost-100 rounded-xl transition-all z-10"
            >
              <X size={18} />
            </button>
            <div className="p-6 sm:p-8 pb-5 sm:pb-5 flex-shrink-0">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-bold text-ink-900">填写每日数据</h3>
                  <p className="text-xs sm:text-sm text-ink-500">记录您的健康与工作状态</p>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-8 pb-6 sm:pb-8 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-4 sm:space-y-5">
              <div className="bg-frost-100 p-3 sm:p-4 rounded-xl border border-frost-200">
                <label className="block text-[10px] sm:text-xs font-semibold text-ink-700 mb-2.5 flex items-center gap-1.5">
                  <Calendar size={14} />
                  选择日期
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={(() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      const year = yesterday.getFullYear();
                      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
                      const day = String(yesterday.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })()}
                    className="w-full px-3.5 py-2.5 bg-white/70 border border-frost-200 rounded-xl text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800"
                  />
                </div>
                <p className="text-[9px] sm:text-[10px] text-ink-600 mt-1.5 flex items-center gap-1">
                  <Info size={10} />
                  只能选择昨天及之前的日期
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-5 bg-gradient-to-b from-ink-500 to-ink-400 rounded-full"></div>
                    <h3 className="text-xs sm:text-sm font-bold text-ink-800">生理数据</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="bg-white/70 p-2.5 sm:p-3 rounded-xl border border-frost-200 hover:shadow-sm transition-shadow">
                      <label className="block text-xs sm:text-[10px] font-medium text-ink-600 mb-1.5 flex items-center gap-1">
                        <Heart size={12} className="text-rose-500" />
                        HRV
                      </label>
                      <input
                        type="number"
                        value={hrvValue}
                        onChange={(e) => setHrvValue(e.target.value)}
                        placeholder="45"
                        className="w-full px-2.5 py-1.5 bg-white/70 border border-frost-200 rounded-lg focus:ring-1 focus:ring-ink-900/10 focus:border-ink-800 outline-none text-xs text-ink-800 placeholder-ink-400"
                      />
                      <p className="text-xs text-ink-400 mt-0.5">ms</p>
                    </div>

                    <div className="bg-white/70 p-2.5 sm:p-3 rounded-xl border border-frost-200 hover:shadow-sm transition-shadow">
                      <label className="block text-xs sm:text-[10px] font-medium text-ink-600 mb-1.5 flex items-center gap-1">
                        <Activity size={12} className="text-blue-500" />
                        静息心率
                      </label>
                      <input
                        type="number"
                        value={restingHRValue}
                        onChange={(e) => setRestingHRValue(e.target.value)}
                        placeholder="72"
                        className="w-full px-2.5 py-1.5 bg-white/70 border border-frost-200 rounded-lg focus:ring-1 focus:ring-ink-900/10 focus:border-ink-800 outline-none text-xs text-ink-800 placeholder-ink-400"
                      />
                      <p className="text-xs text-ink-400 mt-0.5">次/分</p>
                    </div>

                    <div className="bg-white/70 p-2.5 sm:p-3 rounded-xl border border-frost-200 hover:shadow-sm transition-shadow">
                      <label className="block text-xs sm:text-[10px] font-medium text-ink-600 mb-1.5 flex items-center gap-1">
                        <Clock size={12} className="text-indigo-500" />
                        睡眠时长
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={sleepDurationValue}
                        onChange={(e) => setSleepDurationValue(e.target.value)}
                        placeholder="7.5"
                        className="w-full px-2.5 py-1.5 bg-white/70 border border-frost-200 rounded-lg focus:ring-1 focus:ring-ink-900/10 focus:border-ink-800 outline-none text-xs text-ink-800 placeholder-ink-400"
                      />
                      <p className="text-xs text-ink-400 mt-0.5">小时</p>
                    </div>

                    <div className="bg-white/70 p-2.5 sm:p-3 rounded-xl border border-frost-200 hover:shadow-sm transition-shadow">
                      <label className="block text-xs sm:text-[10px] font-medium text-ink-600 mb-1.5 flex items-center gap-1">
                        <Moon size={12} className="text-purple-500" />
                        深睡比例
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={deepSleepRatioValue}
                        onChange={(e) => setDeepSleepRatioValue(e.target.value)}
                        placeholder="25"
                        className="w-full px-2.5 py-1.5 bg-white/70 border border-frost-200 rounded-lg focus:ring-1 focus:ring-ink-900/10 focus:border-ink-800 outline-none text-xs text-ink-800 placeholder-ink-400"
                      />
                      <p className="text-xs text-ink-400 mt-0.5">%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-5 bg-gradient-to-b from-ink-500 to-ink-400 rounded-full"></div>
                    <h3 className="text-xs sm:text-sm font-bold text-ink-800">工作负载</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                    <div className="bg-white/70 p-2.5 sm:p-3 rounded-xl border border-frost-200 hover:shadow-sm transition-shadow">
                      <label className="block text-xs sm:text-[10px] font-medium text-ink-600 mb-1.5 flex items-center gap-1">
                        <Briefcase size={12} className="text-ink-600" />
                        每日课时
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={classHours}
                        onChange={(e) => setClassHours(e.target.value)}
                        placeholder="4"
                        className="w-full px-2.5 py-1.5 bg-white/70 border border-frost-200 rounded-lg focus:ring-1 focus:ring-ink-900/10 focus:border-ink-800 outline-none text-xs text-ink-800 placeholder-ink-400"
                      />
                      <p className="text-xs text-ink-400 mt-0.5">节</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div className="bg-white/70 p-2.5 sm:p-3 rounded-xl border border-frost-200 hover:shadow-sm transition-shadow">
                        <label className="block text-xs sm:text-[10px] font-medium text-ink-600 mb-1.5 flex items-center gap-1">
                        <Calendar size={12} className="text-ink-600" />
                        会议时长
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={meetingHours}
                        onChange={(e) => setMeetingHours(e.target.value)}
                        placeholder="2"
                        className="w-full px-2.5 py-1.5 bg-white/70 border border-frost-200 rounded-lg focus:ring-1 focus:ring-ink-900/10 focus:border-ink-800 outline-none text-xs text-ink-800 placeholder-ink-400"
                      />
                      <p className="text-xs text-ink-400 mt-0.5">小时</p>
                      </div>

                      <div className="bg-white/70 p-2.5 sm:p-3 rounded-xl border border-frost-200 hover:shadow-sm transition-shadow">
                        <label className="block text-xs sm:text-[10px] font-medium text-ink-600 mb-1.5 flex items-center gap-1">
                        <ListChecks size={12} className="text-ink-600" />
                        非教学任务
                      </label>
                      <input
                        type="number"
                        value={nonTeachingTasks}
                        onChange={(e) => setNonTeachingTasks(e.target.value)}
                        placeholder="3"
                        className="w-full px-2.5 py-1.5 bg-white/70 border border-frost-200 rounded-lg focus:ring-1 focus:ring-ink-900/10 focus:border-ink-800 outline-none text-xs text-ink-800 placeholder-ink-400"
                      />
                      <p className="text-xs text-ink-400 mt-0.5">项</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={() => setShowDataForm(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/70 text-ink-700 border border-frost-200 font-semibold hover:bg-white transition-all flex items-center justify-center gap-2"
                >
                  <X size={18} /> 取消
                </button>
                <button
                  onClick={handleSaveData}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white font-semibold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      保存中...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5">
                      <Check size={18} /> 保存数据
                    </div>
                  )}
                </button>
              </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="absolute inset-0 z-[100] m-0! bg-ink-900/30 backdrop-blur-sm">
          <div className="sticky top-0 h-screen flex items-center justify-center p-4">
          <div className="glass rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[calc(100vh_-_5rem)]">
            <button
              onClick={() => setShowAddMemberModal(false)}
              className="absolute top-4 right-4 p-2 text-ink-400 hover:text-ink-600 hover:bg-frost-100 rounded-xl transition-all z-10"
            >
              <X size={18} />
            </button>
            <div className="p-6 sm:p-7 pb-4 border-b border-frost-100 flex-shrink-0">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-ink-900">添加教研组成员</h3>
                  <p className="text-xs text-ink-500">搜索并添加教师到教研组</p>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-7 pb-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索教师姓名、学科或邮箱..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white/70 border border-frost-200 rounded-xl text-sm text-ink-800 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800"
                />
              </div>
            </div>

            <div className="px-6 sm:px-7 pb-6 sm:pb-7 flex-1 min-h-0 overflow-y-auto">
              {filteredTeachers.filter(t => !t.isGroupMember).length === 0 ? (
                <div className="text-center py-8 sm:py-10">
                  <Users size={36} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-frost-200" />
                  <p className="text-[10px] sm:text-xs text-ink-500">没有可添加的教师</p>
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  {filteredTeachers.filter(t => !t.isGroupMember).map((teacher) => (
                    <div key={teacher.id} className="flex items-center justify-between p-3 sm:p-4 bg-frost-50 rounded-xl border border-frost-200">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-ink-500 to-ink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink-900 text-[10px] sm:text-xs">{teacher.name}</p>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] text-ink-500">
                            {teacher.subject && <span>{teacher.subject}</span>}
                            {teacher.grade && <span>{teacher.grade}</span>}
                            <span>{teacher.email}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => {
                          handleAddMember(teacher.id);
                          setShowAddMemberModal(false);
                        }}
                      >
                        添加
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {showEditUserModal && editingUser && (
        <div className="absolute inset-0 z-[100] m-0! bg-ink-900/30 backdrop-blur-sm">
          <div className="sticky top-0 h-screen flex items-center justify-center p-4">
          <div className="glass rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[calc(100vh_-_5rem)]">
            <button
              onClick={() => setShowEditUserModal(false)}
              className="absolute top-4 right-4 p-2 text-ink-400 hover:text-ink-600 hover:bg-frost-100 rounded-xl transition-all z-10"
            >
              <X size={18} />
            </button>
            <div className="p-6 sm:p-7 pb-4 border-b border-frost-100 flex-shrink-0">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-ink-900">编辑用户信息</h3>
                  <p className="text-xs text-ink-500">修改用户的基本资料</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">姓名</label>
                <Input
                  type="text"
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">邮箱</label>
                <Input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">性别</label>
                <div className="relative">
                  <select
                    value={editUserForm.gender}
                    onChange={(e) => setEditUserForm({ ...editUserForm, gender: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 appearance-none outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800 text-sm"
                  >
                    <option value="">请选择</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">手机号</label>
                <Input
                  icon={Phone}
                  type="tel"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">学科</label>
                <div className="relative">
                  <select
                    value={editUserForm.subject}
                    onChange={(e) => setEditUserForm({ ...editUserForm, subject: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 appearance-none outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800 text-sm"
                  >
                    <option value="">请选择</option>
                    <option value="语文">语文</option>
                    <option value="数学">数学</option>
                    <option value="英语">英语</option>
                    <option value="科学">科学</option>
                    <option value="道法">道法</option>
                    <option value="音乐">音乐</option>
                    <option value="体育">体育</option>
                    <option value="美术">美术</option>
                    <option value="信息科技">信息科技</option>
                    <option value="心理健康">心理健康</option>
                  </select>
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">年级</label>
                <div className="relative">
                  <select
                    value={editUserForm.grade}
                    onChange={(e) => setEditUserForm({ ...editUserForm, grade: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/70 border border-frost-200 text-ink-800 appearance-none outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-800 text-sm"
                  >
                    <option value="">请选择</option>
                    <option value="一年级">一年级</option>
                    <option value="二年级">二年级</option>
                    <option value="三年级">三年级</option>
                    <option value="四年级">四年级</option>
                    <option value="五年级">五年级</option>
                    <option value="六年级">六年级</option>
                  </select>
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ink-700 mb-2">教龄（年）</label>
                <Input
                  type="number"
                  value={editUserForm.teachingExperience}
                  onChange={(e) => setEditUserForm({ ...editUserForm, teachingExperience: e.target.value })}
                />
              </div>
            </div>
            <div className="p-6 sm:p-7 pt-4 bg-frost-50/50 border-t border-frost-100 flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="flex-1 py-3 rounded-2xl bg-white/70 text-ink-700 border border-frost-200 font-semibold hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                <X size={18} /> 取消
              </button>
              <button
                onClick={handleSaveUser}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white font-semibold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Check size={18} /> {loading ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      <CustomModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        showCancel={modalState.showCancel}
      />
    </PageContainer>
  );
};

export default PersonalSettings;
