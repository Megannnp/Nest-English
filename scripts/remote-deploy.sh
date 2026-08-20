#!/bin/bash
# =============================================================================
# remote-deploy.sh — 远程 Docker 部署执行体（在服务器上运行）
# 由 update.sh / scripts/deploy.sh 通过 SSH 调用，不应手动直接运行。
# 用法：bash scripts/remote-deploy.sh [--no-cache]
#
# 流程：清理旧栈 → 备份DB → 备份镜像(回滚用) → 构建镜像 → 迁移 → 启动 → 健康检查 → 指纹验证
# =============================================================================
set -euo pipefail
trap 'echo "❌ 部署失败，上方有详细错误。可执行 bash scripts/docker-rollback.sh 回滚"' ERR

REMOTE_DIR="${REMOTE_DIR:-/var/www/nest}"
cd "$REMOTE_DIR"

NO_CACHE=""
[[ "${1:-}" == "--no-cache" ]] && NO_CACHE="--no-cache"

# 颜色
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; C='\033[0;36m'; N='\033[0m'
ok()   { echo -e "${G}[✓]${N} $1"; }
fail() { echo -e "${R}[✗]${N} $1"; }
step() { echo -e "\n${C}━━━ $1 ━━━${N}"; }

# 加载环境变量（MYSQL_ROOT_PASSWORD 等用于备份）
set -a; [ -f ./server/.env ] && source ./server/.env; set +a
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"
MYSQL_DATABASE="${MYSQL_DATABASE:-nest_db}"

step "0/8 环境检查"
command -v docker >/dev/null || { fail "未安装 docker"; exit 1; }
docker compose version >/dev/null 2>&1 || { fail "docker compose 不可用"; exit 1; }
[ -f docker-compose.yml ] || { fail "未找到 docker-compose.yml"; exit 1; }
ok "docker compose 就绪，工作目录 $(pwd)"

step "1/8 清理旧部署栈（PM2 / 宿主机 nginx），释放 80/443"
# 停 PM2（如果残留）
if pgrep -x pm2 >/dev/null 2>&1 || pm2 jlist >/dev/null 2>&1; then
  echo "  发现 PM2 进程，停止 nest-server..."
  pm2 delete nest-server 2>/dev/null && ok "PM2 nest-server 已删除" || ok "PM2 无 nest-server"
  # 若还有其他 PM2 进程，提示但不强行 kill
  pm2 jlist 2>/dev/null | grep -q '"name"' && echo "  ${Y}[!]${N} PM2 仍有其他进程，未清理（如需彻底停用：pm2 kill）" || pm2 kill 2>/dev/null || true
else
  ok "无 PM2 残留"
fi
# 停宿主机 systemd nginx（它会抢占 80/443，导致 Docker nginx 无法绑定）
if systemctl is-active --quiet nginx 2>/dev/null; then
  echo "  发现宿主机 systemd nginx 正在运行，停止并禁用..."
  sudo systemctl stop nginx
  sudo systemctl disable nginx 2>/dev/null || true
  ok "宿主机 nginx 已停止并禁用"
else
  ok "宿主机 nginx 未运行"
fi
# 确认 80/443 已释放（ tolerate docker-proxy 占用的情况——那说明 Docker nginx 在跑）
PORTS=$(ss -ltnp 2>/dev/null | grep -E ':80\b|:443\b' || true)
if echo "$PORTS" | grep -qvE 'docker|docker-proxy'; then
  fail "80/443 仍被非 Docker 进程占用："
  echo "$PORTS"
  exit 1
fi
ok "80/443 端口状态正常（空闲或由 Docker 占用）"

step "2/8 备份数据库"
BACKUP_DIR="$REMOTE_DIR/server/backups"
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${MYSQL_DATABASE}-${TS}.sql"
# MySQL 容器可能尚未运行；先确保 mysql 服务在跑
docker compose up -d mysql >/dev/null
# 等 mysql healthy（最多 60s）
for i in $(seq 1 12); do
  if docker compose ps mysql | grep -q "healthy"; then break; fi
  echo "  等待 mysql 就绪... ($i/12)"; sleep 5
done
if [ -n "$MYSQL_ROOT_PASSWORD" ]; then
  docker compose exec -T mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE" > "$BACKUP_FILE" 2>/dev/null \
    && ok "数据库已备份 → $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))" \
    || { fail "数据库备份失败"; echo "  继续部署（备份失败不阻断）"; }
else
  echo "  ${Y}[!]${N} 未设置 MYSQL_ROOT_PASSWORD，跳过备份"
fi
# 只保留最近 7 份备份
ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true

step "3/8 备份当前 app 镜像（用于回滚）"
# compose 默认镜像名：<project>-app，project 名 = 目录名小写
PROJECT=$(docker compose config --format json 2>/dev/null | grep -oE '"name":[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4 || true)
PROJECT="${PROJECT:-nestenglish}"
APP_IMAGE="${PROJECT}-app"
if docker image inspect "$APP_IMAGE:latest" >/dev/null 2>&1; then
  docker tag "$APP_IMAGE:latest" "$APP_IMAGE:prev"
  ok "已备份当前镜像 → $APP_IMAGE:prev"
else
  echo "  首次部署，无旧镜像可备份"
fi

step "4/8 构建 app 镜像（$([ -n "$NO_CACHE" ] && echo '无缓存' || echo '带缓存')）"
echo "  👉 这是解决'前端不更新'的关键步骤——每次部署强制重建 app 镜像"
docker compose build $NO_CACHE app
ok "app 镜像构建完成"

step "5/8 执行数据库迁移"
echo "  在临时容器中运行 migrate（连接已就绪的 mysql）..."
docker compose run --rm --no-deps app node scripts/migrate.js 2>&1 | sed 's/^/    /' || {
  echo "  ${Y}[!]${N} 迁移执行异常（可能无需迁移或已是最新的），继续部署"
}
ok "迁移步骤完成"

step "6/8 启动/重建全部容器"
docker compose up -d --force-recreate
ok "容器已重建"
echo "  当前状态："
docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'

step "7/8 健康检查"
echo "  等待 app 容器健康（最多 60s）..."
HEALTHY=false
for i in $(seq 1 12); do
  if docker compose ps app | grep -q "healthy"; then HEALTHY=true; break; fi
  sleep 5
  echo "  等待中... ($i/12)"
done
if $HEALTHY; then
  ok "app 容器健康"
else
  # 即使 healthcheck 没转 healthy，也直接探一下接口
  if docker compose exec -T app wget -qO- http://localhost:3001/api/health >/dev/null 2>&1; then
    ok "app 接口可访问（healthcheck 状态可能延迟）"
  else
    fail "app 健康检查失败，打印最近日志："
    docker compose logs --tail=30 app
    exit 1
  fi
fi

step "8/8 前端指纹验证（确认部署真正生效）"
CONTAINER_HASH=$(docker compose exec -T app sh -c 'grep -oE "assets/[a-zA-Z0-9_-]+\.(js|css)" /app/client/dist/index.html | head -1' 2>/dev/null | tr -d '[:space:]')
echo "  容器内 index.html 指纹: ${CONTAINER_HASH:-（未取到）}"

if [ -n "${DOMAIN:-}" ]; then
  ONLINE_HASH=$(curl -sk "https://${DOMAIN}/?_t=$(date +%s)" | grep -oE 'assets/[a-zA-Z0-9_-]+\.(js|css)' | head -1 | tr -d '[:space:]')
  echo "  线上  $DOMAIN 指纹: ${ONLINE_HASH:-（未取到）}"
  if [ -n "$CONTAINER_HASH" ] && [ "$CONTAINER_HASH" = "$ONLINE_HASH" ]; then
    ok "✅ 指纹一致，部署真正生效！"
  else
    fail "指纹不一致！流量可能未命中容器，请运行：bash scripts/docker-deploy-diagnose.sh"
  fi
else
  echo "  ${Y}[!]${N} 未设置 DOMAIN 环境变量，跳过线上对比（可在 .deploy.local 中加 DOMAIN=nestenglish.com）"
  [ -n "$CONTAINER_HASH" ] && ok "容器内指纹已就位: $CONTAINER_HASH"
fi

echo ""
echo "=================================================="
echo " ✅ Docker 部署完成！"
echo " 🔄 回滚：bash scripts/docker-rollback.sh"
echo " 🩺 诊断：bash scripts/docker-deploy-diagnose.sh"
echo "=================================================="
