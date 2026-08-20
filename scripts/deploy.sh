#!/bin/bash
# =============================================================================
# deploy.sh — Docker 部署入口（本地运行，固定服务器版本）
# 推荐使用根目录 update.sh + .deploy.local（更灵活）。
# 本脚本保留向后兼容，内部调用 update.sh 的同一远程流程。
# 服务器地址写在 .deploy.local（已加入 .gitignore，不进入公开仓库）：
#   DEPLOY_HOST=deploy@your-server
#   REMOTE_DIR=/var/www/nest        # 可选，默认 /var/www/nest
# =============================================================================
set -euo pipefail
trap 'echo "❌ 本地部署失败，请查看上方报错信息"' ERR

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[ -f "$SCRIPT_DIR/../.deploy.local" ] && source "$SCRIPT_DIR/../.deploy.local"

# 服务器地址：优先 .deploy.local；未配置时用占位符（不在公开仓库硬编码生产地址）
SERVER="${DEPLOY_HOST:-root@YOUR_SERVER_IP}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/nest}"

echo "========================================"
echo " 🚀 Docker 部署 → $SERVER:$REMOTE_DIR"
echo "========================================"

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
  ./ "${SERVER}:${REMOTE_DIR}/"

echo "✅ 代码同步完成"

ssh "${SERVER}" "bash ${REMOTE_DIR}/scripts/remote-deploy.sh ${1:-}"

