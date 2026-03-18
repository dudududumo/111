# Firebase 迁移到自建后端 完成清单

## ✅ 已完成的工作

### 1. 数据库架构
- [x] `database/schema.sql` - SQL 表结构设计
- [x] `database/db.ts` - 数据库操作层

### 2. 后端 API
- [x] `server-new.ts` - 新的 Express 后端
  - JWT 认证
  - 所有 RESTful API 端点
  - SQLite 数据库支持

### 3. 前端 API 服务
- [x] `src/services/api.ts` - API 调用封装
- [x] `src/services/auth.ts` - 认证服务

### 4. 环境变量
- [x] `.env.example` - 配置模板
- [x] `.env` - 本地配置

### 5. 前端组件修改
- [x] `src/App.tsx` - 主应用（登录/注册界面）
- [x] `src/pages/Dashboard.tsx` - 仪表板

## 📝 待修改的文件

以下文件还需要把 Firebase 引用替换为新的 API：

### 页面组件
- [ ] `src/pages/AssessmentPage.tsx` - 评估页面
- [ ] `src/pages/WarningCenter.tsx` - 预警中心
- [ ] `src/pages/Toolkit.tsx` - 工具包
- [ ] `src/pages/Intervention.tsx` - 干预管理
- [ ] `src/pages/AdminCockpit.tsx` - 管理驾驶舱

### 组件
- [ ] `src/components/PsychologicalProfile.tsx` - 心理档案
- [ ] `src/components/WearableSync.tsx` - 可穿戴设备同步

### 服务
- [ ] `src/services/riskEngineService.ts` - 风险引擎服务

### 工具
- [ ] `src/utils/firestoreErrorHandler.ts` - 错误处理（可以删除）

## 🚀 部署步骤

### 1. 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 2. 生产部署（阿里云）

#### 2.1 购买资源
- 阿里云 ECS（2核4G，约 60元/月）
- 阿里云 RDS PostgreSQL（基础版，约 50元/月）

#### 2.2 服务器配置
```bash
# 连接服务器
ssh root@your-server-ip

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
npm install -g pm2

# 克隆代码
git clone your-repo.git
cd your-project

# 安装依赖
npm install --production

# 配置环境变量
vim .env
# 修改 DATABASE_URL 为阿里云 RDS 地址

# 启动服务
pm2 start server-new.ts --name mental-health
```

#### 2.3 数据库迁移
```bash
# 导出 SQLite 数据（本地）
sqlite3 mental_health.db .dump > backup.sql

# 导入到 PostgreSQL（服务器）
psql -h your-rds-host -U username -d mental_health < backup.sql
```

#### 2.4 Nginx 配置
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📋 API 端点列表

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 用户
- `GET /api/users/teachers` - 获取所有教师
- `PATCH /api/users/:id` - 更新用户信息

### 评估
- `POST /api/assessments` - 创建评估
- `GET /api/assessments/my` - 获取我的评估

### 预警
- `GET /api/warnings` - 获取所有预警（管理）
- `GET /api/warnings/my` - 获取我的预警

### 风险分析
- `POST /api/risk-engine/analyze/:userId` - 分析风险

### 生理数据
- `GET /api/physiological/:userId` - 获取生理数据

### 工作负载
- `GET /api/workload/:userId` - 获取工作负载

### 日记
- `POST /api/diary` - 创建日记
- `GET /api/diary/my` - 获取我的日记

### 社区
- `GET /api/community/posts` - 获取帖子
- `POST /api/community/posts` - 创建帖子

## 💰 费用估算

| 资源 | 配置 | 月费用 |
|------|------|--------|
| 阿里云 ECS | 2核4G | ~60元 |
| 阿里云 RDS | PostgreSQL 基础版 | ~50元 |
| 域名 | .com | ~50元/年 |
| **总计** | | **~110元/月** |

## 🔧 技术栈变化

### 之前（Firebase）
- 前端: React + Firebase SDK
- 后端: Firebase Functions (可选)
- 数据库: Firestore
- 认证: Firebase Auth

### 之后（自建）
- 前端: React + REST API
- 后端: Express + TypeScript
- 数据库: SQLite (开发) / PostgreSQL (生产)
- 认证: JWT

## 📝 注意事项

1. **数据迁移**: 原 Firebase 数据需要导出并导入到新数据库
2. **图片存储**: 原 Firebase Storage 需要替换为阿里云 OSS
3. **实时功能**: Firestore 的实时订阅需要改为轮询或 WebSocket
4. **安全性**: 生产环境必须修改 JWT_SECRET
