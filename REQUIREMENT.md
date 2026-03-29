# 心桥教师关怀系统 - 项目需求文档

## 📋 项目概述

**项目名称**: 心桥教师关怀系统 - 五色心理健康支持平台

**项目目标**: 为教师提供全方位的心理健康支持，包括预防、测评、调适、干预和管理五大模块，构建完整的心理健康服务体系。

**当前版本**: v1.0.0

**完成度**: 85%

## 🎯 核心功能模块

### 1. 🟢 绿色模块 - 个人看板与测评系统 (完成度: 90%)

#### 功能描述
- **个人看板**: 展示教师的心理健康状态、生理数据和行为数据
- **绿色测评**: 多维度心理量表评估系统

#### 主要功能
- 心理健康状态可视化（雷达图、折线图等）
- HRV、睡眠质量等生理数据展示
- 行为活跃度、工作量负荷等行为数据追踪
- 多种心理量表评估（抑郁、焦虑、压力等）
- 测评进度保存和恢复
- 可穿戴设备数据同步
- 测评历史记录和趋势分析

#### 技术实现
- 组件: `Dashboard.tsx`, `AssessmentPage.tsx`
- 数据库表: `assessments`, `users`
- API端点: `/api/assessments/*`

#### 待完善
- 测评结果的专业解读和建议
- 更多心理量表支持

---

### 2. 🔵 蓝色模块 - 调适工具与社区 (完成度: 85%)

#### 功能描述
- **调适工具**: 提供各种心理健康调适工具
- **社区功能**: 教师互助社区和经验分享

#### 主要功能
- 冥想音乐和放松练习
- 呼吸训练和正念练习
- 心情日记和情绪记录
- 心理健康任务管理
- 教师互助社区
- 经验分享和互动交流
- 工具使用统计和效果分析

#### 技术实现
- 组件: `Toolkit.tsx`, `Community.tsx`, `CommunityPost.tsx`
- 数据库表: `diary_entries`, `community_posts`, `tool_usage`
- API端点: `/api/diary/*`, `/api/community/*`, `/api/tools/*`

#### 待完善
- 更多样化的调适工具
- 社区内容审核机制

---

### 3. 🟠 橙色模块 - 干预系统 (完成度: 80%)

#### 功能描述
- **干预任务**: 为需要帮助的教师提供专业干预服务
- **专家资源**: 心理专家库和在线咨询

#### 主要功能
- 干预任务创建、分配、追踪、完成
- 心理专家库管理和预约系统
- 在线咨询和沟通功能
- 团体辅导和工作坊组织
- 干预效果评估和进度监控
- 干预记录和档案管理

#### 技术实现
- 组件: `Intervention.tsx`
- 数据库表: `intervention_tasks`, `group_activities`, `mental_resources`
- API端点: `/api/intervention/*`, `/api/experts/*`

#### 待完善
- 视频会议功能
- 更丰富的干预策略

---

### 4. 🔴 红色模块 - 预警系统 (完成度: 95%)

#### 功能描述
- **风险扫描引擎**: 基于LSTM算法的智能风险识别
- **三级预警响应**: 自动化的分级响应机制
- **通知系统**: 实时通知相关人员

#### 主要功能
- LSTM风险预测模型
- 多维度风险因子分析（抑郁因子、风险指数、连续超标等）
- 三级预警机制：
  - 一级提醒（自助）：向教师本人推送关怀消息和调适工具
  - 二级关注（互助）：向教研组长/年级主任推送脱敏信息
  - 三级干预（专业）：向心理专家推送紧急干预通知
- 动态阈值配置和响应策略自定义
- 实时通知系统（未读提醒、状态管理）
- 预警列表和风险图谱可视化
- 严格的权限控制和信息脱敏
- 红橙联动：预警自动创建干预任务

#### 技术实现
- 组件: `WarningCenter.tsx`, `NotificationDropdown.tsx`
- 服务: `redWarningService.ts`, `riskEngineService.ts`
- 数据库表: `warnings`, `warning_configs`, `notifications`
- API端点: `/api/warnings/*`, `/api/warning-configs/*`, `/api/notifications/*`

#### 已完成
- ✅ 完整的风险扫描引擎
- ✅ 三级预警响应机制
- ✅ 自动化响应和通知系统
- ✅ 配置管理和持久化
- ✅ 数据可视化和权限控制
- ✅ 红橙联动功能

#### 待完善
- LSTM模型的实际训练和优化
- 更多的风险因子分析

---

### 5. 🟣 紫色模块 - 管理驾驶舱 (完成度: 75%)

#### 功能描述
- **数据统计**: 整体心理健康状况的统计分析
- **管理功能**: 用户管理、权限管理、系统配置

#### 主要功能
- 整体心理健康状况统计
- 不同群体心理健康对比分析
- 风险分布和趋势分析
- PDF报告导出
- 用户管理和权限控制
- 系统配置和参数设置
- 数据导出和备份

#### 技术实现
- 组件: `AdminCockpit.tsx`
- 数据库表: 所有业务表
- API端点: `/api/admin/*`, `/api/users/*`

#### 待完善
- 更深入的数据分析
- 预测性分析功能

## 👥 用户角色与权限

### 角色定义
1. **教师 (teacher)**: 普通用户，使用基础功能
2. **教研组长/年级主任 (dept_head)**: 管理团队，查看团队预警信息
3. **心理专家 (psychologist)**: 提供专业干预服务
4. **管理员 (admin)**: 系统管理，拥有所有权限

### 权限矩阵

| 功能模块 | 教师 | 教研组长 | 心理专家 | 管理员 |
|---------|------|---------|---------|--------|
| 个人看板 | ✅ | ✅ | ✅ | ✅ |
| 绿色测评 | ✅ | ✅ | ✅ | ✅ |
| 蓝色调适 | ✅ | ✅ | ✅ | ✅ |
| 橙色干预 | ✅ | ✅ | ✅ | ✅ |
| 红色预警 | ❌ | ✅ | ✅ | ✅ |
| 紫色驾驶舱 | ❌ | ❌ | ❌ | ✅ |

### 信息脱敏规则
- 教研组长查看预警时，教师姓名显示为"匿名教师"
- 只有管理员和心理专家可以查看真实姓名
- 所有访问记录都会被审计

## 🔧 技术架构

### 前端技术栈
- **框架**: React 19 + TypeScript
- **路由**: React Router 7
- **样式**: Tailwind CSS 4
- **动画**: Motion (Framer Motion)
- **图表**: Recharts
- **图标**: Lucide React
- **构建**: Vite 6

### 后端技术栈
- **运行时**: Node.js
- **框架**: Express 4
- **数据库**: SQLite 3 (better-sqlite3)
- **认证**: JWT (jsonwebtoken)
- **加密**: bcryptjs
- **类型**: TypeScript

### 核心服务
- **API服务**: `src/services/api.ts`
- **认证服务**: `src/services/auth.ts`
- **风险引擎**: `src/services/riskEngineService.ts`
- **红色预警**: `src/services/redWarningService.ts`
- **推送服务**: `src/services/pushService.ts`
- **可穿戴设备**: `src/services/wearable.ts`

### 数据库设计
- **用户表**: `users`
- **评估记录**: `assessments`
- **预警记录**: `warnings`
- **预警配置**: `warning_configs`
- **通知记录**: `notifications`
- **干预任务**: `intervention_tasks`
- **日记记录**: `diary_entries`
- **社区帖子**: `community_posts`
- **工具使用**: `tool_usage`
- **团体活动**: `group_activities`
- **心理资源**: `mental_resources`

## 📊 项目结构

```
111/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Community.tsx
│   │   ├── CommunityPost.tsx
│   │   ├── ConsentModal.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── NotificationDropdown.tsx
│   │   ├── PsychologicalProfile.tsx
│   │   └── WearableSync.tsx
│   ├── pages/              # 页面组件
│   │   ├── Dashboard.tsx           # 个人看板
│   │   ├── AssessmentPage.tsx     # 绿色测评
│   │   ├── Toolkit.tsx            # 蓝色调适
│   │   ├── Intervention.tsx       # 橙色干预
│   │   ├── WarningCenter.tsx      # 红色预警
│   │   └── AdminCockpit.tsx       # 紫色驾驶舱
│   ├── services/           # 服务层
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── pushService.ts
│   │   ├── redWarningService.ts
│   │   ├── riskEngineService.ts
│   │   └── wearable.ts
│   ├── utils/              # 工具函数
│   │   └── firestoreErrorHandler.ts
│   ├── data/               # 数据文件
│   │   ├── scales.ts
│   │   └── teacherAssessmentData.json
│   ├── assets/            # 静态资源
│   │   └── audio/         # 冥想音乐
│   ├── App.tsx            # 主应用组件
│   ├── types.ts           # 类型定义
│   └── index.css          # 全局样式
├── database/              # 数据库文件
│   ├── db.ts             # 数据库操作
│   ├── schema.sql        # 数据库结构
│   └── school_mental_health.db
├── server-new.ts         # 后端服务器
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript配置
├── vite.config.ts        # Vite配置
└── README.md            # 项目说明
```

## 🚀 开发环境搭建

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装步骤
1. 克隆项目
```bash
git clone https://github.com/dudududumo/111.git
cd 111
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 访问应用
- 前端: http://localhost:5173
- 后端API: http://localhost:3000

### 测试账号
- **管理员**: admin@school.com / 123456
- **心理专家**: psychologist@school.com / 123456
- **教研组长**: dept_head@school.com / 123456
- **教师**: teacher@school.com / 123456

## 📝 开发指南

### 代码规范
- 使用TypeScript进行类型检查
- 遵循React Hooks最佳实践
- 使用Tailwind CSS进行样式开发
- 组件命名使用PascalCase
- 文件命名使用PascalCase（组件）或camelCase（工具）

### Git工作流
1. 创建功能分支
```bash
git checkout -b feature/your-feature-name
```

2. 提交代码
```bash
git add .
git commit -m "feat: add your feature description"
```

3. 推送到远程
```bash
git push origin feature/your-feature-name
```

### 提交信息规范
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

## 🎯 当前开发进度

### 已完成 (85%)
- ✅ 完整的五色心理健康系统架构
- ✅ 用户认证和权限管理系统
- ✅ 个人看板和测评系统
- ✅ 调适工具和社区功能
- ✅ 干预任务管理系统
- ✅ 红色预警系统（95%完成）
- ✅ 管理驾驶舱基础功能
- ✅ 数据库设计和实现
- ✅ API接口开发
- ✅ 前后端集成

### 待完成 (15%)

#### 高优先级
1. **紫色模块完善**
   - 更深入的数据分析功能
   - 预测性分析功能
   - 高级报告生成

2. **橙色模块增强**
   - 视频会议功能
   - 更丰富的干预策略
   - 专家评价系统

3. **蓝色模块扩展**
   - 更多调适工具
   - 社区内容审核机制
   - 用户行为分析

#### 中优先级
4. **绿色模块优化**
   - 更多心理量表
   - 测评结果专业解读
   - 个性化建议系统

5. **红色模块优化**
   - LSTM模型训练和优化
   - 更多风险因子分析
   - 预警准确性提升

6. **系统优化**
   - 性能优化
   - 安全加固
   - 监控和日志系统

#### 低优先级
7. **用户体验**
   - UI/UX细节优化
   - 移动端适配优化
   - 国际化支持
   - 离线功能支持

## 🐛 已知问题

1. **数据库连接**: SQLite WAL文件可能导致并发问题
2. **性能优化**: 大数据量下的查询性能需要优化
3. **类型安全**: 部分API响应缺少类型定义
4. **错误处理**: 部分错误处理不够完善

## 📞 联系方式

- **项目负责人**: [你的名字]
- **GitHub**: https://github.com/dudududumo/111
- **问题反馈**: 通过GitHub Issues提交

## 📅 里程碑计划

### Phase 1 (已完成)
- ✅ 基础架构搭建
- ✅ 五色系统核心功能
- ✅ 用户权限系统
- ✅ 红色预警系统

### Phase 2 (进行中)
- 🔄 紫色模块完善
- 🔄 橙色模块增强
- 🔄 系统优化

### Phase 3 (计划中)
- 📋 性能优化
- 📋 安全加固
- 📋 生产部署

## 🎓 学习资源

- **React文档**: https://react.dev
- **TypeScript文档**: https://www.typescriptlang.org
- **Tailwind CSS**: https://tailwindcss.com
- **Node.js文档**: https://nodejs.org

---

**最后更新**: 2026-03-29
**文档版本**: v1.0.0
