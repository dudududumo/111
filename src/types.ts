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
  createdAt: string;
  consentAccepted?: boolean;
  wearableBrand?: "Apple" | "Huawei" | "Xiaomi" | null;
  syncFrequency?: "hourly" | "daily" | "realtime";
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
  timestamp: string;
}

export interface CommunityComment {
  id?: string;
  postId: string;
  authorId: string;
  content: string;
  timestamp: string;
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
