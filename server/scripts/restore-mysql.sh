#!/usr/bin/env bash
set -euo pipefail

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_DATABASE="${MYSQL_DATABASE:-nest_db}"
RESTORE_FILE="${RESTORE_FILE:-}"

if [[ -z "${RESTORE_FILE}" ]]; then
  echo "RESTORE_FILE is required for db:restore" >&2
  exit 1
fi

if [[ ! -f "${RESTORE_FILE}" ]]; then
  echo "Restore file not found: ${RESTORE_FILE}" >&2
  exit 1
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql client is required for db:restore" >&2
  exit 1
fi

MYSQL_PWD="${MYSQL_PASSWORD}" mysql \
  --host="${MYSQL_HOST}" \
  --port="${MYSQL_PORT}" \
  --user="${MYSQL_USER}" \
  "${MYSQL_DATABASE}" < "${RESTORE_FILE}"

echo "Restore completed from ${RESTORE_FILE}"
