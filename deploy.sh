#!/bin/bash
# ============================================================
# 五色教师心理健康支持系统 - 一键部署脚本
# 用法：
#   ./deploy.sh            # 在服务器 /root/111 下运行：拉取代码 + 构建 + 部署 + 重启
#   ./deploy.sh --push     # 在本地运行：提交并推送到 GitHub main
# ============================================================
set -e

APP_DIR="/root/111"
NGINX_HTML="/usr/share/nginx/html"
PM2_NAME="server-new"

if [ "$1" = "--push" ]; then
  echo "[本地] 提交并推送到 GitHub..."
  cd "$(dirname "$0")"
  git add -A
  git commit -m "chore: deploy $(date '+%Y-%m-%d %H:%M')" || echo "[本地] 无新提交"
  git push origin main
  echo "[本地] 推送完成 ✅"
  exit 0
fi

echo "[服务器] 开始部署 $APP_DIR"

# 1. 拉取最新代码（保留 .env 和数据库文件）
cd "$APP_DIR"
git pull origin main

# 2. 安装依赖（含 dev，因为 pm2 用 tsx 运行后端）
npm install

# 3. 构建前端
npm run build

# 4. 清理并同步前端产物到 nginx 目录（顺带删除 macOS 元数据文件）
rm -rf "$NGINX_HTML"/assets/*
find "$NGINX_HTML" -name '._*' -delete
cp -r dist/* "$NGINX_HTML"/
find "$NGINX_HTML" -name '._*' -delete

# 5. 重启后端服务
pm2 restart "$PM2_NAME" --update-env

echo "[服务器] 部署完成 ✅"
echo "  - 前端: $(cat "$NGINX_HTML/index.html" | grep -o 'index-[^"]*\.js')"
echo "  - 后端: pm2 $PM2_NAME ($(pm2 pid $PM2_NAME))"
