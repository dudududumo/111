-- 教师心理健康监测系统数据库架构
-- 支持 SQLite 和 PostgreSQL

-- 用户表（替代 Firebase Auth）
CREATE TABLE users (
    id TEXT PRIMARY KEY,  -- UUID
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT,  -- 如果不用 OAuth，需要存密码
    role TEXT NOT NULL CHECK (role IN ('teacher', 'admin', 'psychologist', 'dept_head')),
    school TEXT,
    department TEXT,
    dept_id TEXT,
    manager_id TEXT REFERENCES users(id),
    consent_accepted BOOLEAN DEFAULT FALSE,
    wearable_brand TEXT CHECK (wearable_brand IN ('Apple', 'Huawei', 'Xiaomi')),
    sync_frequency TEXT CHECK (sync_frequency IN ('hourly', 'daily', 'realtime')),
    preferences TEXT,  -- JSON 数组
    favorite_tools TEXT,  -- JSON 数组，收藏的工具
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 评估记录表
CREATE TABLE assessments (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('scl90', 'sas', 'sds', 'mbi', 'phq9', 'gad7')),
    scores TEXT NOT NULL,  -- JSON: {"维度名": 分数}
    raw_answers TEXT NOT NULL,  -- JSON: {"题号": 答案}
    risk_level TEXT NOT NULL CHECK (risk_level IN ('green', 'blue', 'yellow', 'orange', 'red')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 预警记录表
CREATE TABLE warnings (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_name TEXT,
    level TEXT NOT NULL CHECK (level IN ('attention', 'intervention', 'emergency')),
    risk_score REAL NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    factors TEXT NOT NULL,  -- JSON 数组
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'resolved')),
    assigned_to TEXT REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_log TEXT  -- JSON 数组
);

-- 干预任务表
CREATE TABLE intervention_tasks (
    id TEXT PRIMARY KEY,  -- UUID
    warning_id TEXT REFERENCES warnings(id) ON DELETE CASCADE,
    teacher_id TEXT NOT NULL REFERENCES users(id),
    teacher_name TEXT,
    assigned_to TEXT REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    care_records TEXT,  -- JSON 数组
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 日记条目表
CREATE TABLE diary_entries (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mood INTEGER CHECK (mood >= 1 AND mood <= 10),
    tags TEXT,  -- JSON 数组
    image_url TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工具使用记录表
CREATE TABLE tool_usage (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_id TEXT NOT NULL,
    duration INTEGER,  -- 分钟
    feeling TEXT CHECK (feeling IN ('better', 'same', 'worse')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 个人任务表（工具箱中的任务）
CREATE TABLE user_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    quadrant TEXT CHECK (quadrant IN ('重要紧急', '重要不紧急', '紧急不重要', '不紧急不重要')),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 社区帖子表
CREATE TABLE community_posts (
    id TEXT PRIMARY KEY,  -- UUID
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    topic TEXT NOT NULL,
    identity TEXT,  --  legacy: 单个身份标签
    identities TEXT,  -- 多个身份标签（JSON 数组）
    likes INTEGER DEFAULT 0,
    liked_by TEXT,  -- JSON 数组
    is_flagged BOOLEAN DEFAULT FALSE,
    is_moderator BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 社区评论表
CREATE TABLE community_comments (
    id TEXT PRIMARY KEY,  -- UUID
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_moderator BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 团体活动表
CREATE TABLE activities (
    id TEXT PRIMARY KEY,  -- UUID
    group_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('sandplay', 'tea', 'workshop', 'other')),
    description TEXT,
    date TEXT NOT NULL,
    location TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    participants TEXT,  -- JSON 数组
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 心理资源表
CREATE TABLE mental_resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('counseling', 'room', 'activity', 'external')),
    description TEXT,
    tags TEXT,  -- JSON 数组
    contact TEXT,
    location TEXT,
    image_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    agreement_signed BOOLEAN DEFAULT FALSE
);

-- 生理数据表（从可穿戴设备同步）
CREATE TABLE physiological_data (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hrv TEXT,  -- JSON 数组
    resting_hr TEXT,  -- JSON 数组
    sleep_duration TEXT,  -- JSON 数组
    deep_sleep_ratio TEXT,  -- JSON 数组
    activity_level TEXT,  -- JSON 数组
    timestamps TEXT,  -- JSON 数组
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工作负载数据表
CREATE TABLE workload_data (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_hours INTEGER,
    meeting_hours INTEGER,
    non_teaching_tasks INTEGER,
    total_workload_index INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 预警配置表
CREATE TABLE warning_configs (
    id TEXT PRIMARY KEY,  -- UUID
    level TEXT NOT NULL CHECK (level IN ('level1', 'level2', 'level3')),
    name TEXT NOT NULL,
    threshold REAL NOT NULL CHECK (threshold >= 0 AND threshold <= 1),
    triggers TEXT NOT NULL,  -- JSON 数组
    responses TEXT NOT NULL,  -- JSON 数组
    variables TEXT,  -- JSON 对象，存储阈值变量配置
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--- 创建索引（提高查询性能）
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_timestamp ON assessments(timestamp);
CREATE INDEX idx_warnings_user_id ON warnings(user_id);
CREATE INDEX idx_warnings_status ON warnings(status);
CREATE INDEX idx_warnings_level ON warnings(level);
CREATE INDEX idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX idx_tool_usage_user_id ON tool_usage(user_id);
CREATE INDEX idx_community_posts_author ON community_posts(author_id);
CREATE INDEX idx_community_comments_post ON community_comments(post_id);
