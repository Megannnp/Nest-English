import '../utils/env.js';
import mysql from 'mysql2/promise';

import { logWarn } from '../utils/logger.js';

export const DEV = process.env.NODE_ENV !== 'production';
export const SKIP_DB_INIT = process.env.SKIP_DB_INIT === '1';
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? '';
export const MYSQL_DATABASE = process.env.MYSQL_DATABASE || process.env.MYSQL_DB || 'nest_db';

if (!MYSQL_PASSWORD && !DEV) {
  throw new Error('生产环境未配置 MYSQL_PASSWORD');
}

if (!MYSQL_PASSWORD && DEV) {
  logWarn('mysql_password_missing_in_dev', {
    message: '开发环境未配置 MYSQL_PASSWORD，当前将尝试使用空密码连接 MySQL',
  });
}

export const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 50,
  multipleStatements: false,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  connectTimeout: 30000,
  idleTimeout: 60000,
};

export const pool = mysql.createPool(DB_CONFIG);

export function formatDbError(err) {
  if (!err) return '未知数据库错误';
  const code = err.code ? `[${err.code}] ` : '';
  const message = err.message || '数据库操作失败';
  return `${code}${message}`;
}

export async function runStatements(statements) {
  for (const statement of statements) {
    await pool.query(statement);
  }
}
