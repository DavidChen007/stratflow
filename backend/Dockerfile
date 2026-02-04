# 后端 Dockerfile - NestJS
FROM m.daocloud.io/docker.io/library/node:22-alpine

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖（包括开发依赖，因为需要编译 TypeScript）
RUN npm ci

# 复制源代码和配置文件
COPY . .

# 构建应用
RUN npm run build

# 删除开发依赖，只保留生产依赖
RUN npm prune --production

# 暴露端口
EXPOSE 3001

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["node", "dist/main.js"]
