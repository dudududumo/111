// API 服务层 - 替换 Firebase
const API_BASE_URL = "/api";

// 获取存储的 token
const getToken = () => localStorage.getItem("token");

// 简单的加密函数
const encryptData = (data: any): string => {
  try {
    // 这里使用简单的Base64编码作为示例，实际项目中应使用更安全的加密算法
    const jsonString = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(jsonString)));
  } catch (error) {
    console.error('加密失败:', error);
    return JSON.stringify(data);
  }
};

// 简单的解密函数
const decryptData = (encryptedData: string): any => {
  try {
    const jsonString = decodeURIComponent(escape(atob(encryptedData)));
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('解密失败:', error);
    return encryptedData;
  }
};

// 检查是否需要加密的端点
const needsEncryption = (endpoint: string): boolean => {
  const sensitiveEndpoints = [
    '/assessments',
    '/physiological',
    '/workload',
    '/diary',
    '/tool-usage'
  ];
  return sensitiveEndpoints.some(sensitive => endpoint.includes(sensitive));
};

// 通用请求函数
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  console.log('API 请求准备:', { endpoint, hasToken: !!token, tokenPreview: token ? token.substring(0, 20) + '...' : 'none' });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn('警告: 没有可用的认证令牌');
  }

  // 处理请求数据加密
  let encryptedOptions = { ...options };
  if (options.body && needsEncryption(endpoint)) {
    try {
      const bodyData = JSON.parse(options.body as string);
      console.log('加密前的数据:', bodyData);
      const encryptedBody = encryptData(bodyData);
      encryptedOptions.body = JSON.stringify({ encrypted: encryptedBody });
      headers["X-Encrypted"] = "true";
    } catch (error) {
      console.error('加密请求数据失败:', error);
    }
  }

  console.log('API 请求:', url);
  console.log('请求头:', { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : undefined });
  console.log('请求数据:', options.body);

  try {
    const response = await fetch(url, {
      ...encryptedOptions,
      headers,
    });

    console.log('响应状态:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      console.log('错误:', error);
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('成功:', data);
    return data;
  } catch (error) {
    console.log('网络错误:', error);
    throw error;
  }
}

// ==================== 认证相关 API ====================

export const authApi = {
  // 注册
  register: async (data: {
    email: string;
    password: string;
    displayName: string;
    role?: string;
    school?: string;
    department?: string;
  }) => {
    const result = await fetchApi("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.token) {
      localStorage.setItem("token", result.token);
    }
    return result;
  },

  // 登录
  login: async (email: string, password: string) => {
    const result = await fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (result.token) {
      localStorage.setItem("token", result.token);
    }
    return result;
  },

  // 登出
  logout: () => {
    localStorage.removeItem("token");
  },

  // 获取当前用户
  getCurrentUser: async () => {
    return fetchApi("/auth/me");
  },

  // 检查是否已登录
  isAuthenticated: () => !!getToken(),
};

// ==================== 用户相关 API ====================

export const userApi = {
  // 更新用户信息
  update: async (id: string, data: Record<string, any>) => {
    return fetchApi(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // 获取所有教师（管理用）
  getTeachers: async () => {
    return fetchApi("/users/teachers");
  },
};

// ==================== 评估相关 API ====================

export const assessmentApi = {
  // 创建评估
  create: async (data: {
    type: string;
    scores: Record<string, number>;
    rawAnswers: Record<number, number>;
    riskLevel: string;
    depressionScore?: number;
  }) => {
    return fetchApi("/assessments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 获取我的评估历史
  getMyAssessments: async () => {
    return fetchApi("/assessments/my");
  },

  // 获取指定用户的评估历史（管理员专用）
  getUserAssessments: async (userId: string) => {
    return fetchApi(`/assessments/user/${userId}`);
  },

  // 获取下一批题目（IRT）
  getNextQuestions: async (type: string, history: number[]) => {
    return fetchApi("/assessment/next-questions", {
      method: "POST",
      body: JSON.stringify({ type, history }),
    });
  },
};

// ==================== 预警相关 API ====================

export const warningApi = {
  // 创建预警
  create: async (data: {
    userId: string;
    teacherName?: string;
    level: string;
    riskScore: number;
    factors: string[];
    reason: string;
  }) => {
    return fetchApi("/warnings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 创建或更新预警（避免重复）
  upsert: async (data: {
    userId: string;
    teacherName?: string;
    level: string;
    riskScore: number;
    factors: string[];
    reason: string;
    status?: string;
  }) => {
    return fetchApi("/warnings/upsert", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 获取所有预警（管理用）
  getAll: async () => {
    return fetchApi("/warnings");
  },

  // 获取我的预警
  getMyWarnings: async () => {
    return fetchApi("/warnings/my");
  },

  // 更新预警状态
  updateStatus: async (id: string, status: string) => {
    return fetchApi(`/warnings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // 删除所有预警
  deleteAll: async () => {
    return fetchApi("/warnings", {
      method: "DELETE",
    });
  },
};

// ==================== 预警配置 API ====================

export const warningConfigApi = {
  // 获取所有预警配置
  getAll: async () => {
    return fetchApi("/warning-configs");
  },

  // 保存预警配置
  save: async (config: {
    level: string;
    name: string;
    threshold: number;
    triggers: Array<{ type: string; operator: string; value: number; description: string }>;
    responses: Array<{ type: string; target: string; content: string; description: string }>;
    variables?: { depressionThreshold?: number; riskThreshold?: number; consecutiveWeeks?: number; durationDays?: number };
  }) => {
    return fetchApi("/warning-configs", {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  // 重置预警配置为默认值
  resetToDefault: async () => {
    return fetchApi("/warning-configs/reset", {
      method: "POST",
    });
  },
};

// ==================== 风险分析 API ====================

export const riskApi = {
  // 分析用户风险
  analyze: async (userId: string) => {
    return fetchApi(`/risk-engine/analyze/${userId}`, {
      method: "POST",
    });
  },
};

// ==================== 生理数据 API ====================

export const physiologicalApi = {
  // 获取生理数据
  getData: async (userId: string) => {
    return fetchApi(`/physiological/${userId}`);
  },
};

// ==================== 工作负载 API ====================

export const workloadApi = {
  // 获取工作负载数据
  getData: async (userId: string) => {
    return fetchApi(`/workload/${userId}`);
  },
};

// ==================== 日记相关 API ====================

export const diaryApi = {
  // 创建日记
  create: async (data: {
    content: string;
    mood: number;
    tags?: string[];
    imageUrl?: string;
  }) => {
    return fetchApi("/diary", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 获取我的日记
  getMyDiaries: async () => {
    return fetchApi("/diary/my");
  },
};

// ==================== 社区相关 API ====================

export const communityApi = {
  // 获取所有帖子
  getPosts: async () => {
    return fetchApi("/community/posts");
  },

  // 创建帖子
  createPost: async (data: { content: string; topic: string }) => {
    return fetchApi("/community/posts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ==================== 工具使用 API ====================

export const toolUsageApi = {
  // 记录工具使用
  record: async (data: {
    toolId: string;
    duration?: number;
    feeling?: string;
  }) => {
    return fetchApi("/tool-usage", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ==================== 干预任务 API ====================

export const interventionApi = {
  // 创建干预任务
  createTask: async (data: {
    warningId: string;
    teacherId: string;
    teacherName?: string;
    warningLevel: string;
    assignedTo?: string;
    priority?: string;
  }) => {
    return fetchApi("/intervention-tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 获取所有干预任务
  getAllTasks: async () => {
    return fetchApi("/intervention-tasks");
  },

  // 获取我的干预任务
  getMyTasks: async () => {
    return fetchApi("/intervention-tasks/my");
  },

  // 更新任务状态
  updateTaskStatus: async (id: string, status: string) => {
    return fetchApi(`/intervention-tasks/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // 指派任务
  assignTask: async (id: string, assignedTo: string) => {
    return fetchApi(`/intervention-tasks/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo }),
    });
  },

  // 添加关怀记录
  addCareRecord: async (id: string, record: {
    date: string;
    summary: string;
    createdBy: string;
  }) => {
    return fetchApi(`/intervention-tasks/${id}/care-records`, {
      method: "POST",
      body: JSON.stringify(record),
    });
  },

  // 获取任务详情
  getTaskById: async (id: string) => {
    return fetchApi(`/intervention-tasks/${id}`);
  },

  // 根据预警ID获取关联的任务
  getTaskByWarningId: async (warningId: string) => {
    return fetchApi(`/intervention-tasks/by-warning/${warningId}`);
  },
};

// ==================== 通知服务 API ====================

export const notificationApi = {
  // 发送通知给用户
  sendToUser: async (userId: string, content: string, type: string = 'warning') => {
    return fetchApi("/notifications/send", {
      method: "POST",
      body: JSON.stringify({ userId, content, type }),
    });
  },

  // 发送通知给管理人员
  sendToManagers: async (teacherId: string, content: string, level: string) => {
    return fetchApi("/notifications/send-to-managers", {
      method: "POST",
      body: JSON.stringify({ teacherId, content, level }),
    });
  },

  // 发送通知给心理专家
  sendToPsychologists: async (teacherId: string, content: string, level: string) => {
    return fetchApi("/notifications/send-to-psychologists", {
      method: "POST",
      body: JSON.stringify({ teacherId, content, level }),
    });
  },
};

export default {
  auth: authApi,
  user: userApi,
  assessment: assessmentApi,
  warning: warningApi,
  warningConfig: warningConfigApi,
  risk: riskApi,
  physiological: physiologicalApi,
  workload: workloadApi,
  diary: diaryApi,
  community: communityApi,
  toolUsage: toolUsageApi,
  intervention: interventionApi,
  notification: notificationApi,
};
