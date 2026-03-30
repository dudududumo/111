// 推送服务 - 处理定时推送和碎片化填写

// 存储推送配置
const PUSH_CONFIG_KEY = 'push_config';
const ASSESSMENT_PROGRESS_KEY = 'assessment_progress';

// 推送配置接口
interface PushConfig {
  enabled: boolean;
  time: string; // 格式: "HH:MM"
  scales: string[];
  reminderInterval: number; // 提醒间隔（分钟）
}

// 测评进度接口
interface AssessmentProgress {
  scaleId: string;
  currentQuestion: number;
  answers: number[];
  timestamp: number;
}

// 获取推送配置
export const getPushConfig = (): PushConfig => {
  const config = localStorage.getItem(PUSH_CONFIG_KEY);
  return config ? JSON.parse(config) : {
    enabled: true,
    time: '09:00',
    scales: ['scl90', 'sas'],
    reminderInterval: 30
  };
};

// 保存推送配置
export const savePushConfig = (config: PushConfig): void => {
  localStorage.setItem(PUSH_CONFIG_KEY, JSON.stringify(config));
};

// 保存测评进度
export const saveAssessmentProgress = (progress: AssessmentProgress): void => {
  const existingProgress = getAssessmentProgress();
  existingProgress[progress.scaleId] = progress;
  localStorage.setItem(ASSESSMENT_PROGRESS_KEY, JSON.stringify(existingProgress));
};

// 获取测评进度
export const getAssessmentProgress = (): Record<string, AssessmentProgress> => {
  const progress = localStorage.getItem(ASSESSMENT_PROGRESS_KEY);
  return progress ? JSON.parse(progress) : {};
};

// 清除测评进度
export const clearAssessmentProgress = (scaleId: string): void => {
  const progress = getAssessmentProgress();
  delete progress[scaleId];
  localStorage.setItem(ASSESSMENT_PROGRESS_KEY, JSON.stringify(progress));
};

// 检查是否有未完成的测评
export const hasUnfinishedAssessment = (): boolean => {
  const progress = getAssessmentProgress();
  return Object.keys(progress).length > 0;
};

// 初始化推送服务
export const initPushService = (): void => {
  // 检查是否启用了推送
  const config = getPushConfig();
  if (!config.enabled) return;

  // 计算下次推送时间
  const now = new Date();
  const [hours, minutes] = config.time.split(':').map(Number);
  const nextPush = new Date();
  nextPush.setHours(hours, minutes, 0, 0);

  // 如果时间已过，设置为明天
  if (nextPush <= now) {
    nextPush.setDate(nextPush.getDate() + 1);
  }

  // 计算延迟时间
  const delay = nextPush.getTime() - now.getTime();

  // 设置定时器
  setTimeout(() => {
    // 发送推送
    sendAssessmentReminder();
    
    // 每天重复
    setInterval(() => {
      sendAssessmentReminder();
    }, 24 * 60 * 60 * 1000);
  }, delay);
};

// 发送测评提醒
const sendAssessmentReminder = (): void => {
  const config = getPushConfig();
  if (!config.enabled) return;

  // 检查是否支持通知
  if ('Notification' in window) {
    // 请求通知权限
    if (Notification.permission === 'granted') {
      new Notification('心理测评提醒', {
        body: '请完成今天的心理测评，关注您的心理健康',
        icon: '/src/assets/favicon.ico'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('心理测评提醒', {
            body: '请完成今天的心理测评，关注您的心理健康',
            icon: '/src/assets/favicon.ico'
          });
        }
      });
    }
  }

  // 在页面上显示提醒（如果在应用内）
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('assessment-reminder', {
      detail: { scales: config.scales }
    }));
  }
};

// 发送碎片化填写提醒
export const sendFragmentReminder = (scaleId: string): void => {
  const config = getPushConfig();
  if (!config.enabled) return;

  // 检查是否支持通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('测评继续提醒', {
      body: '您有未完成的测评，点击继续填写',
      icon: '/src/assets/favicon.ico'
    });
  }
};
