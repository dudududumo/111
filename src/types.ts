export enum UserRole {
  TEACHER = "teacher",
  ADMIN = "admin",
  PSYCHOLOGIST = "psychologist",
  DEPT_HEAD = "dept_head"
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  school?: string;
  department?: string;
  deptId?: string; // For team support
  managerId?: string; // For group/team membership
  createdAt: string;
  consentAccepted?: boolean;
  wearableBrand?: "Apple" | "Huawei" | "Xiaomi" | null;
  syncFrequency?: "hourly" | "daily" | "realtime";
  preferences?: string[]; // For resource matching
  teachingExperience?: number; // 教龄（年）
}

export interface Assessment {
  id?: string;
  uid: string;
  type: "SCL-90" | "SAS" | "MBI" | "PHQ-9" | "GAD-7";
  scores: Record<string, number>;
  rawAnswers: Record<number, number>;
  timestamp: string;
  riskLevel: "green" | "blue" | "yellow" | "orange" | "red";
}

export interface ScaleQuestion {
  id: number;
  text: string;
  options: { value: number; label: string }[];
  dimension?: string;
}

export interface Warning {
  id?: string;
  uid: string;
  teacherName?: string; // Only visible to authorized roles
  level: "level1" | "level2" | "level3";
  riskScore: number;
  factors: string[];
  reason: string;
  status: "pending" | "active" | "resolved";
  timestamp: string;
  assignedTo?: string;
  responseLog?: {
    action: string;
    timestamp: string;
    actor: string;
  }[];
}

export interface WarningTrigger {
  type: "depression_score" | "risk_index" | "duration" | "consecutive_count";
  operator: ">=" | "<=" | "==" | ">" | "<";
  value: number;
  description: string;
}

export interface WarningResponse {
  type: "message" | "resource" | "notification" | "intervention";
  target: "user" | "manager" | "psychologist";
  content: string;
  description: string;
}

export interface WarningConfig {
  level: "level1" | "level2" | "level3";
  name: string;
  threshold: number;
  triggers: WarningTrigger[];
  responses: WarningResponse[];
  variables?: {
    depressionThreshold?: number;
    riskThreshold?: number;
    consecutiveWeeks?: number;
    durationDays?: number;
  };
}

export interface RiskAssessment {
  uid: string;
  depressionIndex: number;
  anxietyIndex: number;
  lstmRiskScore: number;
  patterns: string[]; // e.g., ["High Load - Low Support"]
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
}

export interface ToolUsage {
  id?: string;
  uid: string;
  toolId: string;
  duration?: number;
  feeling?: 'better' | 'same' | 'worse';
  timestamp: string;
}

export interface DiaryEntry {
  id?: string;
  uid: string;
  content: string;
  mood: number; // 1-10
  tags: string[];
  imageUrl?: string;
  timestamp: string;
}

export interface Task {
  id: string;
  uid: string;
  title: string;
  quadrant: 1 | 2 | 3 | 4 | '重要紧急' | '重要不紧急' | '紧急不重要' | '不重要不紧急';
  completed: boolean;
  createdAt: string;
}

export interface CommunityPost {
  id?: string;
  authorId: string; // Anonymous UID
  content: string;
  topic: string;
  identity?: string; // Legacy: single identity tag
  identities?: string[]; // Multiple identity tags
  likes: number;
  likedBy: string[];
  isFlagged: boolean;
  isModerator?: boolean;
  timestamp: string;
}

export interface CommunityComment {
  id?: string;
  postId: string;
  authorId: string;
  content: string;
  isModerator?: boolean;
  timestamp: string;
}

export interface GroupActivity {
  id?: string;
  groupId: string;
  title: string;
  type: 'sandplay' | 'tea' | 'workshop' | 'other';
  description: string;
  date: string;
  location: string;
  createdBy: string;
  createdByRole?: string;
  visibility?: 'group' | 'school';
  participants: string[];
  maxParticipants?: number;
}

export interface InterventionTask {
  id?: string;
  warningId: string;
  teacherId: string;
  teacherName?: string;
  assignedTo?: string; // Psychologist or Admin UID
  assignedToName?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  careRecords: {
    date: string;
    summary: string;
    createdBy: string;
  }[];
  createdAt: string;
}

export interface MentalResource {
  id: string;
  title: string;
  type: 'internal' | 'external';
  category?: string;
  description: string;
  tags: string[];
  contact?: string;
  location?: string;
  imageUrl?: string;
  isVerified?: boolean;
  agreementSigned?: boolean;
}

export interface PhysiologicalData {
  hrv: number[];
  restingHR: number[];
  sleepDuration: number[];
  deepSleepRatio: number[];
  activityLevel: number[];
  timestamps: string[];
}

export interface BehavioralData {
  loginFrequency: number;
  toolUsageMinutes: number;
  communityInteractions: number;
  workload: {
    classHours: number;
    meetingHours: number;
    nonTeachingTasks: number;
    totalWorkloadIndex: number;
  };
}

export interface CockpitData {
  overallIndex: number;
  warningCount: number;
  interventionRate: number;
  resourceEngagement: number;
  trends: {
    date: string;
    pressure: number;
    burnout: number;
    toolUsageRate: number;
  }[];
  riskHeatmap: {
    grade: string;
    subject: string;
    riskLevel: number; // 0-100
  }[];
  resourceEfficiency: {
    tool: string;
    usage: number;
    improvement: number;
  }[];
  drillDownData: {
    label: string;
    grade: string;
    subject: string;
    experience: string;
    count: number;
    score: number;
    warning: string;
    usage: string;
    effect: string;
  }[];
  trackingData: DeidentifiedTracking[];
  interventionTypeChartData: {
    type: string;
    avgImprovement: number;
    count: number;
  }[];
  suggestions: {
    type: string;
    title: string;
    rootCause: string;
    suggestion: string;
  }[];
}

export interface DeidentifiedTracking {
  id: string;
  interventionType: string;
  preScore: number;
  postScore: number;
  improvement: number;
}
