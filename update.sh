#!/bin/bash
# =============================================================================
# update.sh — Docker 统一部署入口（本地运行）
# 用法：./update.sh [--no-cache]
#   --no-cache  强制忽略 Docker 构建缓存（前端彻底重建，慢但保险）
# 服务器配置写在 .deploy.local（已加入 .gitignore）：
#   DEPLOY_HOST=deploy@your-server
#   REMOTE_DIR=/var/www/nest        # 可选，默认 /var/www/nest
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[ -f "$SCRIPT_DIR/.deploy.local" ] && source "$SCRIPT_DIR/.deploy.local"

DEPLOY_HOST="${DEPLOY_HOST:?未找到 DEPLOY_HOST，请在 .deploy.local 中写入：DEPLOY_HOST=deploy@your-server}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/nest}"

# 透传 --no-cache 给远程脚本
REMOTE_ARGS=""
[[ "${1:-}" == "--no-cache" ]] && REMOTE_ARGS="--no-cache"

echo "========================================"
echo " 🚀 Docker 部署（统一流程）"
echo " 目标：$DEPLOY_HOST:$REMOTE_DIR"
echo " 参数：${REMOTE_ARGS:-（默认带缓存构建）}"
echo "========================================"

# ── 1. 同步代码（排除构建产物与本地环境文件） ────────────────────────────────
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='client/dist' \
  --exclude='client/dist_backup_*' \
  --exclude='.env' \
  --exclude='.deploy.local' \
  --exclude='server/backups' \
  --exclude='.workbuddy' \
  ./ "$DEPLOY_HOST:$REMOTE_DIR/"

echo "✅ 代码同步完成"

# ── 2. 远程执行 Docker 部署 ──────────────────────────────────────────────────
ssh "$DEPLOY_HOST" "bash $REMOTE_DIR/scripts/remote-deploy.sh $REMOTE_ARGS"
