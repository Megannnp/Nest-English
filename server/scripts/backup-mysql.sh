#!/usr/bin/env bash
set -euo pipefail

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_DATABASE="${MYSQL_DATABASE:-nest_db}"
BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
OUTPUT_FILE="${BACKUP_DIR}/${MYSQL_DATABASE}-${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

if ! command -v mysqldump >/dev/null 2>&1; then
  echo "mysqldump is required for db:backup" >&2
  exit 1
fi

MYSQL_PWD="${MYSQL_PASSWORD}" mysqldump \
  --host="${MYSQL_HOST}" \
  --port="${MYSQL_PORT}" \
  --user="${MYSQL_USER}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  "${MYSQL_DATABASE}" > "${OUTPUT_FILE}"

echo "Backup written to ${OUTPUT_FILE}"
