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
  createdAt: string;
  consentAccepted?: boolean;
  wearableBrand?: "Apple" | "Huawei" | "Xiaomi" | null;
  syncFrequency?: "hourly" | "daily" | "realtime";
  preferences?: string[]; // For resource matching
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
  level: "attention" | "intervention" | "emergency";
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
  quadrant: 1 | 2 | 3 | 4; // 1: Important/Urgent, 2: Important/Not Urgent, etc.
  completed: boolean;
  createdAt: string;
}

export interface CommunityPost {
  id?: string;
  authorId: string; // Anonymous UID
  content: string;
  topic: string;
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
  participants: string[];
}

export interface InterventionTask {
  id?: string;
  warningId: string;
  teacherId: string;
  teacherName?: string;
  assignedTo: string; // Psychologist or Admin UID
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
  type: 'counseling' | 'room' | 'activity' | 'external';
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
    anxiety: number;
    hrv: number;
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
}

export interface DeidentifiedTracking {
  id: string;
  interventionType: string;
  preScore: number;
  postScore: number;
  timeline: {
    day: number;
    score: number;
  }[];
}
