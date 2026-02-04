<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/180qk8YL08yQr24k9BGhW1XpM7BKLGjf8

## Run Locally

**Prerequisites:**  Node.js, Docker (可选，用于数据库)

### 方式一：完整运行（前端 + 后端 + 数据库）

#### 1. 启动数据库（使用 Docker）
```bash
docker compose up -d db
```

数据库配置：
- 端口：3306
- 用户名：root
- 密码：root
- 数据库名：stratflow

#### 2. 启动后端服务
```bash
cd backend
npm install
npm run start:dev
```

后端服务将运行在：http://localhost:3001/api

#### 3. 启动前端服务
```bash
# 在项目根目录
npm install
npm run dev
```

前端服务将运行在：http://localhost:3000

### 方式二：仅运行前端（不需要后端和数据库）

1. 安装依赖：
   ```bash
   npm install
   ```

2. （可选）设置 `GEMINI_API_KEY` 在 [.env.local](.env.local) 文件中

3. 运行前端：
   ```bash
   npm run dev
   ```

### 使用 Docker Compose 一键启动所有服务

```bash
docker compose up -d
```

这将启动：
- MySQL 数据库（端口 3306）
- NestJS 后端（通过 Docker 内部网络）
- 前端（端口 80）

访问应用：http://localhost

### 使用 Docker 单独构建和运行

#### 构建前端镜像
```bash
docker build -t stratflow-frontend .
docker run -p 80:80 stratflow-frontend
```

#### 构建后端镜像
```bash
cd backend
docker build -t stratflow-backend .
docker run -p 3001:3001 \
  -e DB_HOST=192.168.0.80 \
  -e DB_USER=root \
  -e DB_PASSWORD=feixun@123ERP \
  -e DB_NAME=stratflow \
  stratflow-backend
```

### Docker 镜像说明

**前端镜像**：
- 基于 Node.js 22 Alpine 构建
- 使用多阶段构建优化镜像大小
- 最终使用 Nginx Alpine 提供静态文件服务
- 包含 API 代理配置

**后端镜像**：
- 基于 Node.js 22 Alpine
- 编译 TypeScript 代码
- 生产环境优化（删除开发依赖）
- 支持环境变量配置数据库连接

### API 端点

后端提供以下 API 端点：

- **企业管理**: `/api/enterprises`
- **工作区**: `/api/workspace/*`
- **认证**: `/api/auth/login`
- **用户管理**: `/api/users`

### 当前运行状态

✅ 前端开发服务器：http://localhost:3000
✅ 后端开发服务器：http://localhost:3001/api
⚠️ 数据库：需要启动 Docker 容器
