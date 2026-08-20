import { randomInt } from 'node:crypto';

import { DB_CONFIG, DEV, SKIP_DB_INIT, formatDbError, pool, runStatements } from './client.js';
import { runDatabaseBootstrap } from './migrations/bootstrap.js';
import {
  dbHealth,
  markDatabaseFailed,
  markDatabaseInitializing,
  markDatabasePending,
  markDatabaseReady,
  markDatabaseSkipped,
} from './state.js';
import { logError, logInfo } from '../utils/logger.js';

function resolveDatabaseInitMode() {
  const explicitMode = String(process.env.DB_INIT_MODE || '').trim().toLowerCase();
  if (explicitMode === 'migrate' || explicitMode === 'connect') {
    return explicitMode;
  }

  if (process.env.DB_AUTO_BOOTSTRAP != null) {
    return process.env.DB_AUTO_BOOTSTRAP === '1' ? 'migrate' : 'connect';
  }

  return DEV ? 'migrate' : 'connect';
}

const DB_INIT_MODE = resolveDatabaseInitMode();
let databaseInitializationPromise = null;

export function prepare(sql) {
  return {
    async get(...params) {
      const [rows] = await pool.query(sql, params);
      return rows[0] ?? undefined;
    },
    async all(...params) {
      const [rows] = await pool.query(sql, params);
      return rows;
    },
    async run(...params) {
      const [result] = await pool.query(sql, params);
      return {
        changes: result.affectedRows ?? 0,
        lastInsertRowid: result.insertId ?? null,
      };
    },
  };
}

async function generateUniqueAccountCode(connection = pool) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const accountCode = String(randomInt(0, 1000000)).padStart(6, '0');
    const [rows] = await connection.query(
      'SELECT id FROM users WHERE account_code = ? LIMIT 1',
      [accountCode]
    );
    if (!rows.length) return accountCode;
  }
  throw new Error('生成 6 位账号编号失败，请重试');
}

async function initializeDatabase() {
  markDatabaseInitializing();
  try {
    logInfo('database_init_started', { initMode: DB_INIT_MODE });

    if (DB_INIT_MODE === 'migrate') {
      await runDatabaseBootstrap({
        pool,
        DB_CONFIG,
        formatDbError,
        runStatements,
        createUserAccountCode: generateUniqueAccountCode,
      });
      logInfo('database_migrations_completed', { initMode: DB_INIT_MODE });
    } else {
      await pool.query('SELECT 1');
      logInfo('database_connection_check_completed', { initMode: DB_INIT_MODE });
    }

    markDatabaseReady();
  } catch (err) {
    markDatabaseFailed(formatDbError(err));
    logError('database_init_failed', { message: formatDbError(err), initMode: DB_INIT_MODE });
    throw err;
  }
}

if (SKIP_DB_INIT) {
  markDatabaseSkipped('数据库初始化已在当前环境跳过');
} else {
  markDatabasePending();
}

export function startDatabaseInitialization() {
  if (SKIP_DB_INIT) {
    return Promise.resolve(getDatabaseHealth());
  }

  if (!databaseInitializationPromise) {
    databaseInitializationPromise = initializeDatabase().catch((err) => {
      logError('database_initialization_rejected', {
        message: err?.message || String(err),
        initMode: DB_INIT_MODE,
      });
      throw err;
    });
  }

  return databaseInitializationPromise;
}

export function getDatabaseHealth() {
  return {
    ...dbHealth,
    config: {
      host: DB_CONFIG.host,
      database: DB_CONFIG.database,
      user: DB_CONFIG.user,
      initMode: DB_INIT_MODE,
    },
  };
}

export function isDatabaseReady() {
  return dbHealth.ready;
}

export function setDatabaseReadyForTests(ready = true) {
  if (process.env.NODE_ENV !== 'test') return;
  databaseInitializationPromise = null;
  if (ready) {
    markDatabaseReady();
    return;
  }
  markDatabaseSkipped('测试环境手动关闭数据库就绪状态');
}

export async function runDatabaseMigrations() {
  await runDatabaseBootstrap({
    pool,
    DB_CONFIG,
    formatDbError,
    runStatements,
    createUserAccountCode: generateUniqueAccountCode,
  });
  markDatabaseReady();
  databaseInitializationPromise = Promise.resolve(getDatabaseHealth());
}

export function getDatabaseInitMode() {
  return DB_INIT_MODE;
}

export async function createUserAccountCode(connection) {
  return generateUniqueAccountCode(connection);
}

export default {
  prepare,
  exec: async (sql) => {
    await pool.query(sql);
  },
  pool,
};
