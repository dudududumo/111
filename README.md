# 心桥教师关怀系统

<div align="center">
  <img width="1200" height="475" alt="心桥教师关怀系统" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  
  **五色心理健康支持平台**
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
  [![React Version](https://img.shields.io/badge/react-19.0.0-blue)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org)
  
  为教师提供全方位的心理健康支持，构建完整的心理健康服务体系
</div>

## 📖 项目简介

心桥教师关怀系统是一个基于五色心理健康理论的综合支持平台，旨在为教师提供从预防到干预的全流程心理健康服务。系统采用现代化的技术栈，结合智能化的风险预警机制，为不同角色的用户提供个性化的心理健康支持。

### 🎯 核心特性

- **五色心理健康体系**: 绿色测评、蓝色调适、橙色干预、红色预警、紫色管理
- **智能风险预警**: 基于LSTM算法的风险识别和三级响应机制
- **角色权限管理**: 完善的用户角色和权限控制系统
- **数据可视化**: 丰富的图表展示和数据分析
- **实时通知系统**: 及时的通知推送和状态管理
- **响应式设计**: 适配不同设备和屏幕尺寸

### 📊 项目完成度

| 模块 | 完成度 | 状态 |
|------|--------|------|
| 🟢 绿色模块 - 个人看板与测评 | 90% | ✅ 基本完成 |
| 🔵 蓝色模块 - 调适工具与社区 | 85% | ✅ 基本完成 |
| 🟠 橙色模块 - 干预系统 | 80% | ✅ 基本完成 |
| 🔴 红色模块 - 预警系统 | 95% | ✅ 基本完成 |
| 🟣 紫色模块 - 管理驾驶舱 | 75% | 🔄 开发中 |
| **整体进度** | **85%** | **✅ 可用** |

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **操作系统**: Windows, macOS, Linux

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/dudududumo/111.git
cd 111
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **访问应用**
- 前端界面: http://localhost:5173
- 后端API: http://localhost:3000

### 测试账号

| 角色 | 邮箱 | 密码 | 权限 |
|------|------|------|------|
| 管理员 | admin@school.com | 123456 | 全部功能 |
| 心理专家 | psychologist@school.com | 123456 | 基础功能 + 干预 + 预警 |
| 教研组长 | dept_head@school.com | 123456 | 基础功能 + 团队预警 |
| 教师 | teacher@school.com | 123456 | 基础功能 |

## 📚 功能模块

### 🟢 绿色模块 - 个人看板与测评

**功能亮点:**
- 心理健康状态可视化（雷达图、折线图等）
- HRV、睡眠质量等生理数据展示
- 多维度心理量表评估
- 可穿戴设备数据同步
- 测评历史记录和趋势分析

**技术实现:**
- 组件: `Dashboard.tsx`, `AssessmentPage.tsx`
- 图表库: Recharts
- 数据库: `assessments`, `users`

### 🔵 蓝色模块 - 调适工具与社区

**功能亮点:**
- 冥想音乐和放松练习
- 呼吸训练和正念练习
- 心情日记和情绪记录
- 教师互助社区
- 工具使用统计和效果分析

**技术实现:**
- 组件: `Toolkit.tsx`, `Community.tsx`
- 音频播放: HTML5 Audio
- 数据库: `diary_entries`, `community_posts`

### 🟠 橙色模块 - 干预系统

**功能亮点:**
- 干预任务创建、分配、追踪
- 心理专家库和预约系统
- 在线咨询和沟通功能
- 团体辅导和工作坊组织
- 干预效果评估

**技术实现:**
- 组件: `Intervention.tsx`
- 数据库: `intervention_tasks`, `group_activities`
- API: RESTful接口

### 🔴 红色模块 - 预警系统

**功能亮点:**
- 基于LSTM算法的风险识别
- 三级预警响应机制
  - 一级提醒（自助）：向教师本人推送关怀消息
  - 二级关注（互助）：向教研组长推送脱敏信息
  - 三级干预（专业）：向心理专家推送紧急通知
- 动态阈值配置
- 实时通知系统
- 严格的权限控制和信息脱敏

**技术实现:**
- 组件: `WarningCenter.tsx`, `NotificationDropdown.tsx`
- 服务: `redWarningService.ts`, `riskEngineService.ts`
- 算法: LSTM风险预测模型
- 数据库: `warnings`, `warning_configs`, `notifications`

### 🟣 紫色模块 - 管理驾驶舱

**功能亮点:**
- 整体心理健康状况统计
- 不同群体心理健康对比
- 风险分布和趋势分析
- PDF报告导出
- 用户管理和权限控制

**技术实现:**
- 组件: `AdminCockpit.tsx`
- 报告生成: jsPDF, html2canvas
- 数据库: 所有业务表

## 🏗️ 技术架构

### 前端技术栈

```
React 19.0.0          # UI框架
TypeScript 5.8        # 类型系统
React Router 7        # 路由管理
Tailwind CSS 4        # 样式框架
Motion 12             # 动画库
Recharts 3            # 图表库
Lucide React          # 图标库
Vite 6               # 构建工具
```

### 后端技术栈

```
Node.js               # 运行时环境
Express 4             # Web框架
SQLite 3              # 数据库
better-sqlite3        # SQLite驱动
JWT                   # 身份认证
bcryptjs              # 密码加密
TypeScript            # 类型系统
```

### 项目结构

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
│   ├── data/               # 数据文件
│   ├── assets/             # 静态资源
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
├── REQUIREMENT.md        # 需求文档
└── README.md            # 项目说明
```

## 👥 用户角色与权限

### 角色定义

| 角色 | 描述 | 权限范围 |
|------|------|---------|
| 教师 | 普通用户 | 个人看板、测评、调适、干预 |
| 教研组长 | 团队管理者 | 教师权限 + 团队预警查看 |
| 心理专家 | 专业人员 | 教师权限 + 干预管理 + 预警查看 |
| 管理员 | 系统管理员 | 全部功能 + 管理驾驶舱 |

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

## 🛠️ 开发指南

### 代码规范

- 使用TypeScript进行类型检查
- 遵循React Hooks最佳实践
- 使用Tailwind CSS进行样式开发
- 组件命名使用PascalCase
- 文件命名使用PascalCase（组件）或camelCase（工具）

### Git工作流

1. **创建功能分支**
```bash
git checkout -b feature/your-feature-name
```

2. **提交代码**
```bash
git add .
git commit -m "feat: add your feature description"
```

3. **推送到远程**
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

### 可用脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run lint         # 运行类型检查
npm run clean        # 清理构建文件
```

## 📊 数据库设计

### 核心数据表

- `users` - 用户信息
- `assessments` - 评估记录
- `warnings` - 预警记录
- `warning_configs` - 预警配置
- `notifications` - 通知记录
- `intervention_tasks` - 干预任务
- `diary_entries` - 日记记录
- `community_posts` - 社区帖子
- `tool_usage` - 工具使用记录
- `group_activities` - 团体活动
- `mental_resources` - 心理资源

### 数据库初始化

数据库文件已包含在项目中，首次运行时会自动创建所有必要的表结构。

## 🎯 开发路线图

### ✅ Phase 1 - 基础架构 (已完成)
- [x] 基础架构搭建
- [x] 五色系统核心功能
- [x] 用户权限系统
- [x] 红色预警系统

### 🔄 Phase 2 - 功能完善 (进行中)
- [ ] 紫色模块完善
- [ ] 橙色模块增强
- [ ] 系统优化

### 📋 Phase 3 - 优化部署 (计划中)
- [ ] 性能优化
- [ ] 安全加固
- [ ] 生产部署

## 🐛 已知问题

1. **数据库连接**: SQLite WAL文件可能导致并发问题
2. **性能优化**: 大数据量下的查询性能需要优化
3. **类型安全**: 部分API响应缺少类型定义
4. **错误处理**: 部分错误处理不够完善

## 📞 联系方式

- **项目负责人**: [你的名字]
- **GitHub仓库**: https://github.com/dudududumo/111
- **问题反馈**: [GitHub Issues](https://github.com/dudududumo/111/issues)
- **需求文档**: [REQUIREMENT.md](REQUIREMENT.md)

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和用户！

---

<div align="center">
  <p>用 ❤️ 构建教师心理健康支持系统</p>
  <p>© 2026 心桥教师关怀系统</p>
</div>
