#!/bin/bash
# =============================================================================
# docker-rollback.sh — 回滚到上一个 app 镜像版本（在服务器上运行）
# 用法：bash scripts/docker-rollback.sh
#
# 原理：remote-deploy.sh 在构建新镜像前，会把当前 latest 打 tag 为 :prev。
#       回滚即把 :prev 重新 tag 回 latest，并 force-recreate app 容器。
# =============================================================================
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-/var/www/nest}"
cd "$REMOTE_DIR"

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; C='\033[0;36m'; N='\033[0m'
ok()   { echo -e "${G}[✓]${N} $1"; }
fail() { echo -e "${R}[✗]${N} $1"; }

PROJECT=$(docker compose config --format json 2>/dev/null | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
PROJECT="${PROJECT:-nestenglish}"
APP_IMAGE="${PROJECT}-app"

echo -e "${C}━━━ 回滚 app 容器到上一版本 ━━━${N}"

if ! docker image inspect "$APP_IMAGE:prev" >/dev/null 2>&1; then
  fail "未找到备份镜像 $APP_IMAGE:prev"
  echo "  可能是首次部署，或已回滚过一次（:prev 只保留一层）"
  echo "  可用镜像："
  docker images "$APP_IMAGE" --format 'table {{.Tag}}\t{{.ID}}\t{{.CreatedAt}}'
  exit 1
fi

echo "  当前 latest:  $(docker image inspect "$APP_IMAGE:latest" --format '{{.Id}}' 2>/dev/null | cut -c1-19)"
echo "  回滚目标 prev: $(docker image inspect "$APP_IMAGE:prev" --format '{{.Id}}' 2>/dev/null | cut -c1-19)"

# 把当前 latest 再存一份（万一想撤销回滚），再把 prev 提为 latest
docker tag "$APP_IMAGE:latest" "$APP_IMAGE:failed" 2>/dev/null || true
docker tag "$APP_IMAGE:prev" "$APP_IMAGE:latest"
ok "镜像已切换"

echo "  重建 app 容器..."
docker compose up -d --force-recreate app
ok "app 容器已回滚"

echo "  等待健康检查..."
for i in $(seq 1 12); do
  if docker compose ps app | grep -q "healthy"; then ok "app 已健康"; break; fi
  sleep 5
  [ $i -eq 12 ] && echo "  ${Y}[!]${N} healthcheck 未转 healthy，请手动检查 docker compose logs app"
done

echo ""
echo "=================================================="
echo " ✅ 已回滚到上一版本"
echo " ⚠️  若要再次回滚到更早版本，:prev 已被覆盖，需从镜像仓库手动拉取"
echo "=================================================="
