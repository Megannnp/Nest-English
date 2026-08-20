#!/bin/bash
# =============================================================================
# Docker 部署前端不更新 — 一键诊断脚本
# 在服务器上运行：bash scripts/docker-deploy-diagnose.sh
# =============================================================================
set -uo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
sec()  { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN} $1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ---- 0. 前置：定位 compose 目录 ----
REMOTE_DIR="${REMOTE_DIR:-/var/www/nest}"
cd "$REMOTE_DIR" 2>/dev/null || { fail "未找到 $REMOTE_DIR，请设置 REMOTE_DIR"; exit 1; }

sec "0. 项目目录"
echo "  cwd = $(pwd)"
echo "  docker-compose.yml: $([ -f docker-compose.yml ] && echo present || echo MISSING)"

# ---- 1. 容器状态 ----
sec "1. 容器运行状态"
docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null
echo "---"
echo "  app 容器 Created/Started 时间（看是不是刚重建）："
docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.CreatedAt}}' 2>/dev/null

# ---- 2. 镜像构建时间（核心！判断是否真的重建过） ----
sec "2. app 镜像构建时间与哈希"
APP_IMAGE=$(docker compose config --images 2>/dev/null | grep -E 'nest|app' || docker compose images 2>/dev/null | awk 'NR>1{print $1":"$2}')
echo "  app 镜像: $APP_IMAGE"
docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.CreatedSince}}\t{{.CreatedAt}}' | grep -iE 'nest|app' || true
echo "---"
echo "  👉 若 CreatedAt 不是最近一次部署的时间，说明镜像根本没重建（根因 A）"

# ---- 3. 80/443 端口到底谁在占（核心！判断流量是否命中 Docker） ----
sec "3. 80/443 端口占用情况（判断流量是否真的进 Docker）"
echo "--- ss -ltnp ---"
ss -ltnp 2>/dev/null | grep -E ':80\b|:443\b' || netstat -ltnp 2>/dev/null | grep -E ':80\b|:443\b'
echo "--- 是否有宿主机 nginx/systemd-nginx 在跑（update.sh 的残留）---"
systemctl is-active nginx 2>/dev/null && warn "宿主机 systemd nginx 仍在运行！它会抢 80/443" || ok "宿主机 nginx 未运行"
pgrep -a nginx | grep -v docker || echo "  (无宿主机 nginx 进程)"
echo "--- 是否有 PM2 在跑（update.sh 的残留）---"
pgrep -a pm2 2>/dev/null && warn "PM2 仍在运行！旧栈可能还在服务" || ok "无 PM2 进程"

# ---- 4. app 容器内 dist 是否存在 + 构建产物时间 ----
sec "4. app 容器内 /app/client/dist 内容与时间"
APP_CTR=$(docker compose ps -q app 2>/dev/null)
if [ -z "$APP_CTR" ]; then fail "app 容器未运行"; else
  echo "--- dist 目录列表（含时间戳）---"
  docker exec "$APP_CTR" sh -c 'ls -la --time-style=full-iso /app/client/dist/ 2>/dev/null || ls -la /app/client/dist/' 2>/dev/null
  echo "--- index.html 引用的资源哈希（关键指纹）---"
  docker exec "$APP_CTR" sh -c 'grep -oE "assets/[a-zA-Z0-9_-]+\.(js|css)" /app/client/dist/index.html | head -5' 2>/dev/null
  echo "--- server.js 进程启动时间（容器内）---"
  docker exec "$APP_CTR" sh -c 'ps -o pid,lstart,cmd | grep "[s]erver.js"' 2>/dev/null
fi

# ---- 5. 通过域名实际请求，看返回的 index.html 指纹 ----
sec "5. 线上实际返回的 index.html 指纹（对比容器内）"
DOMAIN="${DOMAIN:-nestenglish.com}"
echo "--- curl https://$DOMAIN ---"
curl -sI "https://$DOMAIN/" | grep -iE 'HTTP|server|via|cf-|x-cache|cache-control|etag'
echo "--- 返回 index.html 引用的资源哈希 ---"
curl -s "https://$DOMAIN/?_t=$(date +%s)" | grep -oE 'assets/[a-zA-Z0-9_-]+\.(js|css)' | head -5
echo "  👉 若此处哈希 ≠ 第 4 步容器内哈希，说明流量没进 Docker 容器（根因 B）"

# ---- 6. 直接打容器内 app（绕过 nginx/CDN），看是否最新 ----
sec "6. 直连 app 容器 3001（绕过所有中间层）"
if [ -n "$APP_CTR" ]; then
  echo "--- 从宿主机直连容器 3001 ---"
  curl -s "http://localhost:3001/?_t=$(date +%s)" 2>/dev/null | grep -oE 'assets/[a-zA-Z0-9_-]+\.(js|css)' | head -5 || \
    docker exec "$APP_CTR" wget -qO- "http://localhost:3001/" | grep -oE 'assets/[a-zA-Z0-9_-]+\.(js|css)' | head -5
  echo "  👉 此处哈希应与第 4 步完全一致；若线上(第5步)不同则中间层有问题"
fi

# ---- 7. compose 配置确认：app 是否有挂载覆盖 dist ----
sec "7. compose 配置：app 服务是否有 volume 覆盖 dist"
docker compose config 2>/dev/null | sed -n '/services:/,/volumes:/p' | grep -A30 '  app:' | grep -E 'volumes:|/app/client|dist' || ok "app 无 volume 挂载（dist 纯来自镜像，正确）"

# ---- 8. 镜像构建缓存层检查 ----
sec "8. 最近一次 build 的层历史（看 npm run build 是否被跳过）"
docker history --no-trunc --format 'table {{.CreatedBy}}\t{{.CreatedAt}}' "$APP_IMAGE" 2>/dev/null | grep -iE 'npm run build|COPY client|dist' | head -10 || \
  docker history "$APP_IMAGE" 2>/dev/null | head -15

echo ""
sec "诊断完成"
echo "  重点看："
echo "   ① 第2步镜像时间是否 = 本次部署时间（否则镜像没重建）"
echo "   ② 第3步 80/443 是否被宿主机 nginx 抢占（否则流量没进 Docker）"
echo "   ③ 第4步容器内哈希 vs 第5步线上哈希是否一致（不一致=流量未命中容器）"
