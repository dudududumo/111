import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'school_mental_health.db');
export const db = new Database(dbPath);

// 启用外键约束
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化数据库（执行 schema.sql）
export function initDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  
  // 分割 SQL 语句并执行
  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        db.exec(statement + ';');
      } catch (error: any) {
        // 自动执行迁移：如果缺少 manager_id 列
        if (error.message.includes('no such column: manager_id')) {
          try {
            db.exec('ALTER TABLE users ADD COLUMN manager_id TEXT REFERENCES users(id);');
            console.log('Successfully added manager_id column to users table');
            // 重新执行刚才失败的语句
            db.exec(statement + ';');
          } catch (migrationError) {
            console.error('Migration failed:', migrationError);
          }
        }
        // 自动执行迁移：如果缺少 read_at 列（用于一级预警已读）
        else if (error.message.includes('no such column: read_at')) {
          try {
            db.exec('ALTER TABLE warnings ADD COLUMN read_at TIMESTAMP;');
            console.log('Successfully added read_at column to warnings table');
            // 重新执行刚才失败的语句
            db.exec(statement + ';');
          } catch (migrationError) {
            console.error('Migration failed:', migrationError);
          }
        }
        // 忽略表已存在的错误
        else if (!error.message.includes('already exists')) {
          console.error('Error executing SQL:', error);
        }
      }
    }
  }
  
  // 检查并添加 read_at 列（如果还不存在）
  try {
    db.exec('SELECT read_at FROM warnings LIMIT 1;');
  } catch (error: any) {
    if (error.message.includes('no such column: read_at')) {
      try {
        db.exec('ALTER TABLE warnings ADD COLUMN read_at TIMESTAMP;');
        console.log('Successfully added read_at column to warnings table');
      } catch (migrationError) {
        console.error('Migration failed:', migrationError);
      }
    }
  }
  
  // 迁移：将管理员和心理医生创建的活动设置为全校可见
  try {
    const updateStmt = db.prepare(`
      UPDATE activities 
      SET visibility = 'school' 
      WHERE created_by_role IN ('admin', 'psychologist') AND visibility = 'group'
    `);
    const result = updateStmt.run();
    if (result.changes > 0) {
      console.log(`Successfully updated ${result.changes} activities to school-wide visibility`);
    }
  } catch (migrationError) {
    console.error('Migration failed:', migrationError);
  }
  
  // 迁移：为 mental_resources 表添加 category 列
  try {
    db.exec('SELECT category FROM mental_resources LIMIT 1;');
  } catch (error: any) {
    if (error.message.includes('no such column: category')) {
      try {
        db.exec('ALTER TABLE mental_resources ADD COLUMN category TEXT;');
        console.log('Successfully added category column to mental_resources table');
      } catch (migrationError) {
        console.error('Migration failed:', migrationError);
      }
    }
  }
  
  console.log('Database initialized successfully');
  
  // 初始化默认心理资源（如果还没有资源）
  const existingResources = db.prepare('SELECT COUNT(*) as count FROM mental_resources').get() as { count: number };
  if (existingResources.count === 0) {
    console.log('Creating default mental resources...');
    const defaultResources = [
      {
        title: '校内心理咨询师预约',
        type: 'internal',
        category: 'counselor',
        description: '专业心理咨询师一对一咨询服务，帮助您解决工作、生活中的心理困扰。每次咨询时长50分钟，请提前预约。',
        tags: ['心理咨询', '一对一', '专业支持', '工作压力', '情绪管理'],
        contact: 'psychologist@school.com',
        location: '心理健康中心 301室',
        isVerified: true,
        agreementSigned: true
      },
      {
        title: '沙盘室预约',
        type: 'internal',
        category: 'sandplay',
        description: '通过沙盘游戏进行心理表达和探索，适合不善于用语言表达情绪的老师。提供安全、放松的自我探索空间。',
        tags: ['沙盘游戏', '非语言表达', '情绪释放', '自我探索', '放松减压'],
        contact: 'sandplay@school.com',
        location: '心理健康中心 205室',
        isVerified: true,
        agreementSigned: true
      },
      {
        title: '团体活动报名',
        type: 'internal',
        category: 'group',
        description: '定期举办茶话会、团体沙盘、心理工作坊等团体活动。在团体中分享、学习、成长，建立支持网络。',
        tags: ['团体活动', '同伴支持', '茶话会', '工作坊', '社交'],
        contact: 'group@school.com',
        location: '教师之家 多功能厅',
        isVerified: true,
        agreementSigned: true
      },
      {
        title: '市精神卫生中心',
        type: 'external',
        category: 'hospital',
        description: '经学校审核合作的专业医疗机构，提供心理科门诊服务。严重心理问题可转介至此，享受绿色通道。',
        tags: ['医院', '精神科', '药物治疗', '专业医疗', '转介服务'],
        contact: '021-64387250',
        location: '宛平南路600号',
        isVerified: true,
        agreementSigned: true
      },
      {
        title: '24小时心理援助热线',
        type: 'external',
        category: 'hotline',
        description: '全天候免费心理咨询热线，由专业机构运营。紧急心理困扰可随时拨打，专业咨询师在线接听。',
        tags: ['热线', '24小时', '免费', '紧急支持', '即时帮助'],
        contact: '400-161-9995',
        location: '全国热线',
        isVerified: true,
        agreementSigned: true
      }
    ];
    
    for (const resource of defaultResources) {
      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO mental_resources (id, title, type, category, description, tags, contact, location, is_verified, agreement_signed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        resource.title,
        resource.type,
        resource.category,
        resource.description,
        JSON.stringify(resource.tags),
        resource.contact,
        resource.location,
        resource.isVerified ? 1 : 0,
        resource.agreementSigned ? 1 : 0
      );
    }
    console.log(`Created ${defaultResources.length} default mental resources`);
  }
}

// 用户相关操作
export const userDb = {
  // 创建用户
  create: (user: {
    email: string;
    displayName: string;
    passwordHash?: string;
    role: string;
    school?: string;
    department?: string;
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO users (id, email, display_name, password_hash, role, school, department)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, user.email, user.displayName, user.passwordHash || null, user.role, user.school || null, user.department || null);
    return id;
  },

  // 根据邮箱查找用户
  findByEmail: (email: string) => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },

  // 根据ID查找用户
  findById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },

  // 更新用户
  update: (id: string, updates: Record<string, any>) => {
    // 将 camelCase 转换为 snake_case，并处理布尔值
    const snakeCaseUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      // 强制将布尔值转换为数字（SQLite 不支持布尔值）
      let processedValue = value;
      if (typeof value === 'boolean') {
        processedValue = value ? 1 : 0;
      } else if (value === 'true') {
        processedValue = 1;
      } else if (value === 'false') {
        processedValue = 0;
      }
      snakeCaseUpdates[snakeCaseKey] = processedValue;
    }
    
    // 确保有字段需要更新
    if (Object.keys(snakeCaseUpdates).length === 0) {
      return;
    }
    
    // 构建 SQL 语句（使用参数绑定）
    const fields = Object.keys(snakeCaseUpdates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(snakeCaseUpdates);
    const sql = `UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = ?`;
    
    try {
      const stmt = db.prepare(sql);
      stmt.run(...values, id);
    } catch (error: any) {
      // 运行时迁移：如果更新时发现缺少 manager_id
      if (error.message.includes('no such column: manager_id')) {
        try {
          db.exec('ALTER TABLE users ADD COLUMN manager_id TEXT REFERENCES users(id);');
          console.log('Runtime migration: added manager_id column to users table');
          // 重新执行更新
          const stmt = db.prepare(sql);
          stmt.run(...values, id);
          return;
        } catch (migrationError) {
          console.error('Runtime migration failed:', migrationError);
        }
      }
      console.error('Update error:', error);
      throw error;
    }
  },

  // 获取所有教师（用于管理驾驶舱）
  getAllTeachers: () => {
    const stmt = db.prepare("SELECT * FROM users WHERE role = 'teacher'");
    return stmt.all();
  },

  // 获取所有部门负责人（教研组长/年级主任）
  getManagers: () => {
    const stmt = db.prepare("SELECT * FROM users WHERE role = 'dept_head'");
    return stmt.all();
  },

  // 获取所有心理专家
  getPsychologists: () => {
    const stmt = db.prepare("SELECT * FROM users WHERE role = 'psychologist'");
    return stmt.all();
  },

  // 获取所有用户
  getAll: () => {
    const stmt = db.prepare("SELECT * FROM users");
    return stmt.all();
  }
};

// 评估记录相关操作
export const assessmentDb = {
  // 创建评估
  create: (assessment: {
    userId: string;
    type: string;
    scores: Record<string, number>;
    rawAnswers: Record<number, number>;
    riskLevel: string;
    depressionScore?: number;
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO assessments (id, user_id, type, scores, raw_answers, risk_level, depression_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, assessment.userId, assessment.type, JSON.stringify(assessment.scores), JSON.stringify(assessment.rawAnswers), assessment.riskLevel, assessment.depressionScore !== undefined ? assessment.depressionScore : null);
    return id;
  },

  // 获取用户的所有评估
  getByUserId: (userId: string) => {
    const stmt = db.prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY timestamp DESC');
    return stmt.all(userId);
  },

  // 获取最近的评估
  getRecent: (userId: string, limit: number = 4) => {
    const stmt = db.prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?');
    return stmt.all(userId, limit);
  },

  // 获取所有评估
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM assessments ORDER BY timestamp DESC');
    return stmt.all();
  }
};

// 预警相关操作
export const warningDb = {
  // 创建预警 - 直接设置为 active 状态（自动响应）
  create: (warning: {
    userId: string;
    teacherName?: string;
    level: string;
    riskScore: number;
    factors: string[];
    reason: string;
    status?: string;
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO warnings (id, user_id, teacher_name, level, risk_score, factors, reason, status, response_log)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const responseLog = JSON.stringify([{
      action: `系统自动触发${warning.level === 'level3' ? '三级紧急' : warning.level === 'level2' ? '二级关注' : '一级提醒'}预警并执行自动响应`,
      timestamp: new Date().toISOString(),
      actor: "LSTM 风险引擎"
    }]);
    stmt.run(id, warning.userId, warning.teacherName || null, warning.level, warning.riskScore, JSON.stringify(warning.factors), warning.reason, 'active', responseLog);
    return id;
  },

  // 获取所有预警（关联用户信息）
  getAll: () => {
    const stmt = db.prepare(`
      SELECT warnings.*, users.display_name
      FROM warnings
      JOIN users ON warnings.user_id = users.id
      ORDER BY warnings.timestamp DESC
    `);
    return stmt.all();
  },

  // 获取用户可见的预警
  getByUser: (userId: string, userRole: string, userDeptId?: string) => {
    let stmt;
    let warnings;
    if (userRole === 'admin' || userRole === 'psychologist') {
      // 管理员和心理医生可以看到所有预警
      stmt = db.prepare(`
        SELECT warnings.*, users.display_name
        FROM warnings
        JOIN users ON warnings.user_id = users.id
        ORDER BY warnings.timestamp DESC
      `);
      warnings = stmt.all();
    } else if (userRole === 'dept_head') {
      // 教研组长只能看到自己组的预警（通过 manager_id 关联）
      stmt = db.prepare(`
        SELECT warnings.*, users.display_name
        FROM warnings
        JOIN users ON warnings.user_id = users.id
        WHERE users.manager_id = ?
        ORDER BY warnings.timestamp DESC
      `);
      warnings = stmt.all(userId);
    } else {
      // 普通教师只能看到自己的预警
      stmt = db.prepare(`
        SELECT warnings.*, users.display_name
        FROM warnings
        JOIN users ON warnings.user_id = users.id
        WHERE warnings.user_id = ?
        ORDER BY warnings.timestamp DESC
      `);
      warnings = stmt.all(userId);
    }
    return warnings;
  },

  // 获取用户的预警（关联用户信息）
  getByUserId: (userId: string) => {
    const stmt = db.prepare(`
      SELECT warnings.*, users.display_name
      FROM warnings
      JOIN users ON warnings.user_id = users.id
      WHERE warnings.user_id = ?
      ORDER BY warnings.timestamp DESC
    `);
    return stmt.all(userId);
  },

  // 更新预警状态
  updateStatus: (id: string, status: string) => {
    const stmt = db.prepare('UPDATE warnings SET status = ? WHERE id = ?');
    stmt.run(status, id);
  },

  // 标记一级预警为已读
  markAsRead: (id: string) => {
    const stmt = db.prepare('UPDATE warnings SET read_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?');
    stmt.run('resolved', id);
  },

  // 获取用户的未解决预警
  getPendingByUserId: (userId: string) => {
    const stmt = db.prepare(`
      SELECT warnings.*, users.display_name
      FROM warnings
      JOIN users ON warnings.user_id = users.id
      WHERE warnings.user_id = ? AND warnings.status = 'pending'
      ORDER BY warnings.timestamp DESC
    `);
    return stmt.all(userId);
  },

  // 更新预警
  update: (id: string, updates: { level?: string; riskScore?: number; factors?: string[]; reason?: string; status?: string }) => {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.level) {
      fields.push('level = ?');
      values.push(updates.level);
    }
    if (updates.riskScore !== undefined) {
      fields.push('risk_score = ?');
      values.push(updates.riskScore);
    }
    if (updates.factors) {
      fields.push('factors = ?');
      values.push(JSON.stringify(updates.factors));
    }
    if (updates.reason) {
      fields.push('reason = ?');
      values.push(updates.reason);
    }
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    
    if (fields.length === 0) return;
    
    const sql = `UPDATE warnings SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...values, id);
  },

  // 删除所有预警
  deleteAll: () => {
    const stmt = db.prepare('DELETE FROM warnings');
    stmt.run();
  },

  // 删除单个预警
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM warnings WHERE id = ?');
    stmt.run(id);
  },

  // 创建或更新预警（避免重复）
  upsert: (warning: {
    userId: string;
    teacherName?: string;
    level: string;
    riskScore: number;
    factors: string[];
    reason: string;
    status?: string;
  }) => {
    // 检查是否已存在该用户的未解决预警
    const existing = db.prepare(`
      SELECT id FROM warnings 
      WHERE user_id = ? AND status = 'pending'
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get(warning.userId) as { id: string } | undefined;

    if (existing) {
      // 更新现有预警
      const stmt = db.prepare(`
        UPDATE warnings 
        SET level = ?, risk_score = ?, factors = ?, reason = ?, response_log = response_log || ?
        WHERE id = ?
      `);
      const responseLog = JSON.stringify([{
        action: `系统自动更新预警级别为${warning.level === 'emergency' ? '三级紧急' : warning.level === 'intervention' ? '二级介入' : '一级关注'}`,
        timestamp: new Date().toISOString(),
        actor: "LSTM 风险引擎"
      }]);
      stmt.run(warning.level, warning.riskScore, JSON.stringify(warning.factors), warning.reason, responseLog, existing.id);
      return { id: existing.id, action: 'updated' };
    } else {
      // 创建新预警
      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO warnings (id, user_id, level, risk_score, factors, reason, status, response_log)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const responseLog = JSON.stringify([{
        action: `系统自动触发${warning.level === 'emergency' ? '三级紧急' : warning.level === 'intervention' ? '二级介入' : '一级关注'}预警`,
        timestamp: new Date().toISOString(),
        actor: "LSTM 风险引擎"
      }]);
      stmt.run(id, warning.userId, warning.level, warning.riskScore, JSON.stringify(warning.factors), warning.reason, warning.status || 'pending', responseLog);
      return { id, action: 'created' };
    }
  }
};

// 预警配置相关操作
export const warningConfigDb = {
  // 获取所有配置
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM warning_configs ORDER BY level');
    return stmt.all();
  },

  // 保存或更新配置
  upsert: (config: {
    level: string;
    name: string;
    triggers: Array<{ type: string; operator: string; value: number; description: string }>;
    responses: Array<{ type: string; target: string; content: string; description: string }>;
    variables?: { depressionThreshold?: number; riskThreshold?: number; consecutiveWeeks?: number; durationDays?: number };
  }) => {
    console.log('数据库操作 - 保存配置:', config.level, 'triggers:', config.triggers, 'variables:', config.variables);
    const existing = db.prepare('SELECT id FROM warning_configs WHERE level = ?').get(config.level) as { id: string } | undefined;
    
    if (existing) {
      console.log('数据库操作 - 更新现有配置:', existing.id);
      const stmt = db.prepare(`
        UPDATE warning_configs 
        SET name = ?, triggers = ?, responses = ?, variables = ?, updated_at = datetime('now')
        WHERE level = ?
      `);
      const result = stmt.run(config.name, JSON.stringify(config.triggers), JSON.stringify(config.responses), JSON.stringify(config.variables || {}), config.level);
      console.log('数据库操作 - 更新结果:', result);
    } else {
      console.log('数据库操作 - 创建新配置');
      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO warning_configs (id, level, name, triggers, responses, variables)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(id, config.level, config.name, JSON.stringify(config.triggers), JSON.stringify(config.responses), JSON.stringify(config.variables || {}));
      console.log('数据库操作 - 插入结果:', result);
    }
  },

  // 重置为默认配置
  resetToDefault: () => {
    db.exec('DELETE FROM warning_configs');

    const defaultConfigs = [
      {
        level: 'level1',
        name: '一级提醒（自助）',
        threshold: 0.7,
        variables: {
          depressionThreshold: 2.0,
          riskThreshold: 0.6,
          durationDays: 1
        },
        triggers: [
          { type: 'depression_score', operator: '>=', value: 2.0, description: '抑郁因子分首次≥2.0' },
          { type: 'risk_index', operator: '>=', value: 0.6, description: '风险指数≥0.6' }
        ],
        responses: [
          { type: 'message', target: 'user', content: '推送关怀消息', description: '推送关怀消息' },
          { type: 'resource', target: 'user', content: '推荐调适工具', description: '推荐调适工具' }
        ]
      },
      {
        level: 'level2',
        name: '二级关注（互助）',
        threshold: 0.8,
        variables: {
          depressionThreshold: 2.0,
          riskThreshold: 0.7,
          consecutiveWeeks: 1,
          durationDays: 7
        },
        triggers: [
          { type: 'depression_score', operator: '>=', value: 2.0, description: '抑郁因子分持续≥2.0' },
          { type: 'consecutive_count', operator: '>=', value: 2, description: '连续2次测评超标' },
          { type: 'risk_index', operator: '>=', value: 0.7, description: '风险指数≥0.7' }
        ],
        responses: [
          { type: 'notification', target: 'manager', content: '通知管理人员', description: '通知管理人员' },
          { type: 'message', target: 'user', content: '增加心理测评频率', description: '增加心理测评频率' }
        ]
      },
      {
        level: 'level3',
        name: '三级干预（专业）',
        threshold: 0.8,
        variables: {
          depressionThreshold: 2.5,
          riskThreshold: 0.8,
          durationDays: 1
        },
        triggers: [
          { type: 'depression_score', operator: '>=', value: 2.5, description: '抑郁因子分≥2.5' },
          { type: 'risk_index', operator: '>=', value: 0.8, description: '风险指数≥0.8' }
        ],
        responses: [
          { type: 'message', target: 'user', content: '【紧急关怀】系统监测到您近期心理压力极大，建议您立即寻求专业心理支持。您可以预约校内咨询师或拨打24小时热线。', description: '向教师推送紧急关怀消息' },
          { type: 'notification', target: 'manager', content: '预警信息（脱敏后，仅显示“建议关注”）', description: '通知教研组长/年级主任' },
          { type: 'intervention', target: 'psychologist', content: '启动专业干预流程，自动创建干预任务', description: '通知学校心理负责人并创建干预任务' }
        ]
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO warning_configs (id, level, name, threshold, triggers, responses, variables)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    defaultConfigs.forEach(config => {
      const id = uuidv4();
      stmt.run(id, config.level, config.name, config.threshold, JSON.stringify(config.triggers), JSON.stringify(config.responses), JSON.stringify(config.variables));
    });
  }
};

// 日记相关操作
export const diaryDb = {
  // 创建日记
  create: (diary: {
    userId: string;
    content: string;
    mood: number;
    tags?: string[];
    imageUrl?: string;
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO diary_entries (id, user_id, content, mood, tags, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, diary.userId, diary.content, diary.mood, JSON.stringify(diary.tags || []), diary.imageUrl || null);
    return id;
  },

  // 获取用户的所有日记
  getByUserId: (userId: string) => {
    const stmt = db.prepare('SELECT * FROM diary_entries WHERE user_id = ? ORDER BY timestamp DESC');
    return stmt.all(userId);
  },

  // 删除日记
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM diary_entries WHERE id = ?');
    stmt.run(id);
  }
};

// 用户任务表
export const taskDb = {
  create: (task: {
    userId: string;
    title: string;
    quadrant: string;
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO user_tasks (id, user_id, title, quadrant)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, task.userId, task.title, task.quadrant);
    return id;
  },

  getByUserId: (userId: string) => {
    const stmt = db.prepare('SELECT * FROM user_tasks WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId);
  },

  update: (id: string, updates: Record<string, any>) => {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${snakeKey} = ?`);
      if (typeof value === 'boolean') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
    const sql = `UPDATE user_tasks SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...values, id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM user_tasks WHERE id = ?');
    stmt.run(id);
  }
};

// 工具使用记录
export const toolUsageDb = {
  create: (usage: {
    userId: string;
    toolId: string;
    duration?: number;
    feeling?: string;
  }) => {
    try {
      const id = uuidv4();
      console.log('数据库插入工具使用记录:', { id, ...usage });
      const stmt = db.prepare(`
        INSERT INTO tool_usage (id, user_id, tool_id, duration, feeling)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(id, usage.userId, usage.toolId, usage.duration ?? null, usage.feeling ?? null);
      console.log('数据库插入结果:', result);
      return id;
    } catch (error) {
      console.error('数据库插入工具使用记录失败:', error);
      throw error;
    }
  },

  getByUserId: (userId: string) => {
    const stmt = db.prepare('SELECT * FROM tool_usage WHERE user_id = ? ORDER BY timestamp DESC');
    return stmt.all(userId);
  }
};

// 社区相关操作
export const communityDb = {
  // 创建帖子
  createPost: (post: {
    authorId: string;
    content: string;
    topic: string;
    identity?: string;
    identities?: string[];
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO community_posts (id, author_id, content, topic, identity, identities, liked_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, post.authorId, post.content, post.topic, post.identity || null, post.identities ? JSON.stringify(post.identities) : null, JSON.stringify([]));
    
    // 返回完整的帖子对象
    return {
      id,
      author_id: post.authorId,
      content: post.content,
      topic: post.topic,
      identity: post.identity || null,
      identities: post.identities || [],
      likes: 0,
      liked_by: [],
      is_flagged: false,
      is_moderator: false,
      timestamp: new Date().toISOString()
    };
  },

  // 获取所有帖子
  getAllPosts: () => {
    const stmt = db.prepare('SELECT * FROM community_posts ORDER BY timestamp DESC');
    return stmt.all();
  },

  // 添加评论
  createComment: (comment: {
    postId: string;
    authorId: string;
    content: string;
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO community_comments (id, post_id, author_id, content)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, comment.postId, comment.authorId, comment.content);
    
    // 返回完整的评论对象
    return {
      id,
      post_id: comment.postId,
      author_id: comment.authorId,
      content: comment.content,
      is_moderator: false,
      timestamp: new Date().toISOString()
    };
  },

  // 获取帖子的评论
  getCommentsByPostId: (postId: string) => {
    const stmt = db.prepare('SELECT * FROM community_comments WHERE post_id = ? ORDER BY timestamp ASC');
    return stmt.all(postId);
  },

  // 获取所有评论
  getAllComments: () => {
    const stmt = db.prepare('SELECT * FROM community_comments ORDER BY timestamp ASC');
    return stmt.all();
  },

  // 删除帖子
  deletePost: (id: string) => {
    const stmt = db.prepare('DELETE FROM community_comments WHERE post_id = ?');
    stmt.run(id);
    const stmt2 = db.prepare('DELETE FROM community_posts WHERE id = ?');
    stmt2.run(id);
  },

  // 删除评论
  deleteComment: (id: string) => {
    const stmt = db.prepare('DELETE FROM community_comments WHERE id = ?');
    stmt.run(id);
  },

  // 切换点赞
  toggleLike: (postId: string, userId: string) => {
    const stmt = db.prepare('SELECT * FROM community_posts WHERE id = ?');
    const post = stmt.get(postId) as any;
    
    if (!post) return null;
    
    const likedBy = JSON.parse(post.liked_by || "[]");
    const isLiked = likedBy.includes(userId);
    
    let newLikedBy: string[];
    let newLikes: number;
    
    if (isLiked) {
      newLikedBy = likedBy.filter((id: string) => id !== userId);
      newLikes = Math.max(0, post.likes - 1);
    } else {
      newLikedBy = [...likedBy, userId];
      newLikes = post.likes + 1;
    }
    
    const updateStmt = db.prepare('UPDATE community_posts SET likes = ?, liked_by = ? WHERE id = ?');
    updateStmt.run(newLikes, JSON.stringify(newLikedBy), postId);
    
    return { likes: newLikes, likedBy: newLikedBy };
  }
};

// 生理数据操作
export const physiologicalDb = {
  create: (data: {
    userId: string;
    hrv: number[];
    restingHR: number[];
    sleepDuration: number[];
    deepSleepRatio: number[];
    activityLevel: number[];
    timestamps: string[];
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO physiological_data (id, user_id, hrv, resting_hr, sleep_duration, deep_sleep_ratio, activity_level, timestamps)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, data.userId, JSON.stringify(data.hrv), JSON.stringify(data.restingHR), JSON.stringify(data.sleepDuration), JSON.stringify(data.deepSleepRatio), JSON.stringify(data.activityLevel), JSON.stringify(data.timestamps));
    return id;
  },

  getByUserId: (userId: string) => {
    const stmt = db.prepare('SELECT * FROM physiological_data WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1');
    return stmt.get(userId);
  }
};

// 工作负载数据操作
export const workloadDb = {
  create: (data: {
    userId: string;
    classHours: number;
    meetingHours: number;
    nonTeachingTasks: number;
    totalWorkloadIndex: number;
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO workload_data (user_id, class_hours, meeting_hours, non_teaching_tasks, total_workload_index)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(data.userId, data.classHours, data.meetingHours, data.nonTeachingTasks, data.totalWorkloadIndex);
    return id;
  },

  getByUserId: (userId: string) => {
    const stmt = db.prepare('SELECT * FROM workload_data WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1');
    return stmt.get(userId);
  }
};

// 活动相关操作
export const activityDb = {
  // 创建活动
  create: (activity: {
    groupId: string;
    title: string;
    type: string;
    description: string;
    date: string;
    location: string;
    createdBy: string;
    createdByRole: string;
    visibility: string;
    maxParticipants?: number;
    participants: string[];
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO activities (id, group_id, title, type, description, date, location, created_by, created_by_role, visibility, max_participants, participants)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      activity.groupId,
      activity.title,
      activity.type,
      activity.description,
      activity.date,
      activity.location,
      activity.createdBy,
      activity.createdByRole,
      activity.visibility,
      activity.maxParticipants || null,
      JSON.stringify(activity.participants)
    );
    return id;
  },

  // 获取用户可见的活动
  getByUser: (userId: string, userRole: string, userDeptId?: string, userManagerId?: string) => {
    let stmt;
    let activities;
    if (userRole === 'admin' || userRole === 'psychologist') {
      // 管理员和心理医生可以看到所有活动
      stmt = db.prepare('SELECT * FROM activities ORDER BY date ASC');
      activities = stmt.all() as Array<{ 
        id: string; 
        participants?: string; 
        created_by?: string;
        created_by_role?: string;
      } & Record<string, any>>;
    } else if (userRole === 'dept_head') {
      // 教研组长可以看到自己创建的组内活动 + 所有全校可见活动
      stmt = db.prepare(`
        SELECT * FROM activities 
        WHERE visibility = 'school' OR (visibility = 'group' AND created_by = ?)
        ORDER BY date ASC
      `);
      activities = stmt.all(userId) as Array<{ 
        id: string; 
        participants?: string; 
        created_by?: string;
        created_by_role?: string;
      } & Record<string, any>>;
    } else {
      // 普通教师可以看到自己组长创建的组内活动 + 所有全校可见活动
      stmt = db.prepare(`
        SELECT * FROM activities 
        WHERE visibility = 'school' OR (visibility = 'group' AND created_by = ?)
        ORDER BY date ASC
      `);
      activities = stmt.all(userManagerId || '') as Array<{ 
        id: string; 
        participants?: string; 
        created_by?: string;
        created_by_role?: string;
      } & Record<string, any>>;
    }
    
    return activities.map(activity => ({
      ...activity,
      createdBy: activity.created_by,
      createdByRole: activity.created_by_role,
      participants: JSON.parse(activity.participants || '[]')
    }));
  },

  // 获取所有活动
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM activities ORDER BY date ASC');
    const activities = stmt.all() as Array<{ id: string; participants?: string; created_by?: string; created_by_role?: string } & Record<string, any>>;
    return activities.map(activity => ({
      ...activity,
      createdBy: activity.created_by,
      createdByRole: activity.created_by_role,
      participants: JSON.parse(activity.participants || '[]')
    }));
  },

  // 根据ID获取活动
  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM activities WHERE id = ?');
    const activity = stmt.get(id) as ({ id: string; participants?: string; created_by?: string; created_by_role?: string } & Record<string, any>) | undefined;
    if (activity) {
      return {
        ...activity,
        createdBy: activity.created_by,
        createdByRole: activity.created_by_role,
        participants: JSON.parse(activity.participants || '[]')
      };
    }
    return null;
  },

  // 添加参与者
  addParticipant: (id: string, userId: string) => {
    const activity = activityDb.getById(id);
    if (!activity) return null;
    
    const participants = [...activity.participants, userId];
    const stmt = db.prepare('UPDATE activities SET participants = ? WHERE id = ?');
    stmt.run(JSON.stringify(participants), id);
    return participants;
  },
  
  // 移除参与者
  removeParticipant: (id: string, userId: string) => {
    const activity = activityDb.getById(id);
    if (!activity) return null;
    
    const participants = activity.participants.filter(p => p !== userId);
    const stmt = db.prepare('UPDATE activities SET participants = ? WHERE id = ?');
    stmt.run(JSON.stringify(participants), id);
    return participants;
  },

  // 更新活动
  update: (id: string, updates: Partial<{
    title: string;
    type: string;
    description: string;
    date: string;
    location: string;
    visibility: string;
    maxParticipants?: number;
  }>) => {
    const fields = Object.keys(updates).map(key => {
      if (key === 'maxParticipants') return 'max_participants = ?';
      return key + ' = ?';
    }).join(', ');
    const values = Object.values(updates);
    values.push(id);
    
    const stmt = db.prepare(`UPDATE activities SET ${fields} WHERE id = ?`);
    stmt.run(...values);
    return activityDb.getById(id);
  },

  // 删除活动
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM activities WHERE id = ?');
    stmt.run(id);
    return true;
  }
};

// 团队资源相关操作
export const teamResourceDb = {
  // 创建资源
  create: (resource: {
    groupId: string;
    title: string;
    description?: string;
    content?: string;
    fileUrl?: string;
    createdBy: string;
    createdByRole: string;
    visibility: string;
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO team_resources (id, group_id, title, description, content, file_url, created_by, created_by_role, visibility)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      resource.groupId,
      resource.title,
      resource.description || null,
      resource.content || null,
      resource.fileUrl || null,
      resource.createdBy,
      resource.createdByRole,
      resource.visibility
    );
    return id;
  },

  // 获取用户可见的资源
  getByUser: (userId: string, userRole: string, userDeptId?: string) => {
    let stmt;
    let resources;
    if (userRole === 'admin' || userRole === 'psychologist') {
      // 管理员和心理医生可以看到所有资源
      stmt = db.prepare('SELECT * FROM team_resources ORDER BY created_at DESC');
      resources = stmt.all() as Array<{ 
        id: string; 
        created_by?: string;
        created_by_role?: string;
      } & Record<string, any>>;
    } else {
      // 普通教师和教研组长只能看到本组资源 + 全校可见的资源
      stmt = db.prepare(`
        SELECT * FROM team_resources 
        WHERE visibility = 'school' OR group_id = ?
        ORDER BY created_at DESC
      `);
      resources = stmt.all(userDeptId || '') as Array<{ 
        id: string; 
        created_by?: string;
        created_by_role?: string;
      } & Record<string, any>>;
    }
    
    return resources.map(resource => ({
      ...resource,
      createdBy: resource.created_by,
      createdByRole: resource.created_by_role
    }));
  },

  // 获取所有资源
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM team_resources ORDER BY created_at DESC');
    const resources = stmt.all() as Array<{ id: string; created_by?: string; created_by_role?: string } & Record<string, any>>;
    return resources.map(resource => ({
      ...resource,
      createdBy: resource.created_by,
      createdByRole: resource.created_by_role
    }));
  },

  // 删除资源
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM team_resources WHERE id = ?');
    stmt.run(id);
    return true;
  }
};

// 干预任务相关操作
export const interventionTaskDb = {
  // 创建任务
  create: (task: {
    warningId?: string;
    teacherId: string;
    teacherName?: string;
    assignedTo?: string;
    status: string;
    priority: string;
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO intervention_tasks (id, warning_id, teacher_id, teacher_name, assigned_to, status, priority, care_records)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, task.warningId || null, task.teacherId, task.teacherName || null, task.assignedTo || null, task.status, task.priority, JSON.stringify([]));
    return id;
  },

  // 获取所有任务
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM intervention_tasks ORDER BY created_at DESC');
    const tasks = stmt.all() as Array<{ id: string; care_records?: string; teacher_name?: string; assigned_to?: string; created_at?: string } & Record<string, any>>;
    return tasks.map(task => {
      let assignedToName = null;
      if (task.assigned_to) {
        const assignedUser = userDb.findById(task.assigned_to) as { display_name?: string } | undefined;
        if (assignedUser) {
          assignedToName = assignedUser.display_name;
        }
      }
      return {
        id: task.id,
        warningId: task.warning_id,
        teacherId: task.teacher_id,
        teacherName: task.teacher_name,
        assignedTo: task.assigned_to,
        assignedToName,
        status: task.status,
        priority: task.priority,
        careRecords: JSON.parse(task.care_records || '[]'),
        createdAt: task.created_at
      };
    });
  },

  // 根据ID获取任务
  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM intervention_tasks WHERE id = ?');
    const task = stmt.get(id) as ({ id: string; care_records?: string; teacher_name?: string; assigned_to?: string; created_at?: string } & Record<string, any>) | undefined;
    if (task) {
      return {
        id: task.id,
        warningId: task.warning_id,
        teacherId: task.teacher_id,
        teacherName: task.teacher_name,
        assignedTo: task.assigned_to,
        status: task.status,
        priority: task.priority,
        careRecords: JSON.parse(task.care_records || '[]'),
        createdAt: task.created_at
      };
    }
    return null;
  },

  // 更新任务状态
  updateStatus: (id: string, status: string) => {
    const stmt = db.prepare('UPDATE intervention_tasks SET status = ? WHERE id = ?');
    stmt.run(status, id);
  },

  // 添加护理记录
  addCareRecord: (id: string, careRecord: {
    date: string;
    summary: string;
    createdBy: string;
    isDeidentified: boolean;
  }) => {
    const task = interventionTaskDb.getById(id);
    if (!task) return null;
    
    const careRecords = [...task.careRecords, careRecord];
    const stmt = db.prepare('UPDATE intervention_tasks SET care_records = ?, status = ? WHERE id = ?');
    stmt.run(JSON.stringify(careRecords), 'in_progress', id);
    return careRecords;
  },

  // 删除任务
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM intervention_tasks WHERE id = ?');
    stmt.run(id);
  }
};

// 通知相关操作
export const notificationDb = {
  // 发送通知
  create: (notification: {
    userId: string;
    type: string;
    title: string;
    content: string;
    relatedId?: string;
  }) => {
    const id = uuidv4();
    console.log('数据库创建通知:', { id, ...notification });
    const stmt = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, content, related_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(id, notification.userId, notification.type, notification.title, notification.content, notification.relatedId || null);
    console.log('数据库创建通知结果:', result);
    return id;
  },

  // 获取用户通知
  getByUserId: (userId: string) => {
    const stmt = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId);
  },

  // 标记通知为已读
  markAsRead: (id: string) => {
    const stmt = db.prepare('UPDATE notifications SET status = ?, read_at = datetime(\'now\') WHERE id = ?');
    const result = stmt.run('read', id);
    console.log('数据库标记通知已读结果:', result);
    return result.changes > 0;
  },

  // 获取未读通知数量
  getUnreadCount: (userId: string) => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND status = \'unread\'');
    const result = stmt.get(userId) as { count: number } | undefined;
    return result?.count || 0;
  },

  // 删除通知
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM notifications WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};

// 心理资源相关操作
export const resourceDb = {
  // 获取所有资源
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM mental_resources ORDER BY created_at DESC');
    const resources = stmt.all() as Array<{ id: string; tags?: string } & Record<string, any>>;
    return resources.map(resource => ({
      ...resource,
      tags: JSON.parse(resource.tags || '[]')
    }));
  },

  // 根据ID获取资源
  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM mental_resources WHERE id = ?');
    const resource = stmt.get(id) as ({ id: string; tags?: string } & Record<string, any>) | undefined;
    if (resource) {
      return {
        ...resource,
        tags: JSON.parse(resource.tags || '[]')
      };
    }
    return null;
  },

  // 创建资源
  create: (resource: {
    title: string;
    type: string;
    description?: string;
    tags?: string[];
    contact?: string;
    location?: string;
    imageUrl?: string;
    isVerified?: boolean;
    agreementSigned?: boolean;
  }) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO mental_resources (id, title, type, description, tags, contact, location, image_url, is_verified, agreement_signed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      resource.title,
      resource.type,
      resource.description || null,
      JSON.stringify(resource.tags || []),
      resource.contact || null,
      resource.location || null,
      resource.imageUrl || null,
      resource.isVerified ? 1 : 0,
      resource.agreementSigned ? 1 : 0
    );
    return id;
  },

  // 更新资源
  update: (id: string, resource: {
    title?: string;
    type?: string;
    description?: string;
    tags?: string[];
    contact?: string;
    location?: string;
    imageUrl?: string;
    isVerified?: boolean;
    agreementSigned?: boolean;
  }) => {
    const sets: string[] = [];
    const values: any[] = [];

    if (resource.title !== undefined) { sets.push('title = ?'); values.push(resource.title); }
    if (resource.type !== undefined) { sets.push('type = ?'); values.push(resource.type); }
    if (resource.description !== undefined) { sets.push('description = ?'); values.push(resource.description); }
    if (resource.tags !== undefined) { sets.push('tags = ?'); values.push(JSON.stringify(resource.tags)); }
    if (resource.contact !== undefined) { sets.push('contact = ?'); values.push(resource.contact); }
    if (resource.location !== undefined) { sets.push('location = ?'); values.push(resource.location); }
    if (resource.imageUrl !== undefined) { sets.push('image_url = ?'); values.push(resource.imageUrl); }
    if (resource.isVerified !== undefined) { sets.push('is_verified = ?'); values.push(resource.isVerified ? 1 : 0); }
    if (resource.agreementSigned !== undefined) { sets.push('agreement_signed = ?'); values.push(resource.agreementSigned ? 1 : 0); }

    if (sets.length === 0) return false;

    values.push(id);
    const stmt = db.prepare(`UPDATE mental_resources SET ${sets.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return true;
  },

  // 删除资源
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM mental_resources WHERE id = ?');
    stmt.run(id);
    return true;
  },

  // 添加标签
  addTag: (id: string, tag: string) => {
    const resource = resourceDb.getById(id);
    if (!resource) return null;
    const tags = [...new Set([...resource.tags, tag])];
    const stmt = db.prepare('UPDATE mental_resources SET tags = ? WHERE id = ?');
    stmt.run(JSON.stringify(tags), id);
    return tags;
  },

  // 移除标签
  removeTag: (id: string, tag: string) => {
    const resource = resourceDb.getById(id);
    if (!resource) return null;
    const tags = resource.tags.filter((t: string) => t !== tag);
    const stmt = db.prepare('UPDATE mental_resources SET tags = ? WHERE id = ?');
    stmt.run(JSON.stringify(tags), id);
    return tags;
  }
};

// 资源预约相关操作
export const appointmentDb = {
  // 创建预约
  create: (appointment: {
    userId: string;
    resourceId: string;
    resourceTitle: string;
    appointmentDate?: string;
    appointmentTime?: string;
    notes?: string;
  }) => {
    // 检查是否存在同一资源、同一日期、同一时间段的预约
    if (appointment.appointmentDate && appointment.appointmentTime) {
      const existingAppointment = db.prepare(
        'SELECT * FROM resource_appointments WHERE resource_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ("pending", "confirmed", "completed")'
      ).get(appointment.resourceId, appointment.appointmentDate, appointment.appointmentTime);
      
      if (existingAppointment) {
        throw new Error('该时段已被预约');
      }
    }
    
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO resource_appointments (id, user_id, resource_id, resource_title, appointment_date, appointment_time, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    stmt.run(
      id,
      appointment.userId,
      appointment.resourceId,
      appointment.resourceTitle,
      appointment.appointmentDate || null,
      appointment.appointmentTime || null,
      appointment.notes || null
    );
    return id;
  },

  // 获取用户的所有预约
  getByUserId: (userId: string) => {
    const stmt = db.prepare('SELECT * FROM resource_appointments WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId);
  },

  // 获取所有预约（管理员用）
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM resource_appointments ORDER BY created_at DESC');
    return stmt.all();
  },

  // 根据ID获取预约
  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM resource_appointments WHERE id = ?');
    return stmt.get(id);
  },

  // 更新预约状态
  updateStatus: (id: string, status: string, adminNotes?: string) => {
    const stmt = db.prepare(`
      UPDATE resource_appointments 
      SET status = ?, admin_notes = ?, updated_at = datetime('now') 
      WHERE id = ?
    `);
    stmt.run(status, adminNotes || null, id);
  },

  // 取消预约
  cancel: (id: string, userId: string) => {
    const appointment = appointmentDb.getById(id) as { user_id: string } | undefined;
    if (!appointment || appointment.user_id !== userId) return false;
    
    const stmt = db.prepare('UPDATE resource_appointments SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
    stmt.run('cancelled', id);
    return true;
  },

  // 删除预约
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM resource_appointments WHERE id = ?');
    stmt.run(id);
    return true;
  }
};

export default db;
