import mysql from 'mysql2/promise';

import { BASE_SCHEMA_STATEMENTS } from './schema.js';
import { runBootstrapVersionedMigrations } from './versioned.js';
import { logWarn } from '../../utils/logger.js';

async function createDatabaseIfPossible({ DB_CONFIG, formatDbError }) {
  let rootPool;
  try {
    rootPool = mysql.createPool({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      charset: 'utf8mb4',
    });

    try {
      await rootPool.query(
        `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } catch (err) {
      logWarn('database_create_failed_try_existing', { message: formatDbError(err) });
    }
  } finally {
    if (rootPool) {
      try {
        await rootPool.end();
      } catch { /* intentional */ }
    }
  }
}

async function ensureBootstrapSchema({ runStatements }) {
  await runStatements(BASE_SCHEMA_STATEMENTS);
}

export async function runDatabaseBootstrap({
  pool,
  DB_CONFIG,
  formatDbError,
  runStatements,
}) {
  await createDatabaseIfPossible({ DB_CONFIG, formatDbError });
  await pool.query('SELECT 1');
  await ensureBootstrapSchema({ runStatements });
  await runBootstrapVersionedMigrations(pool);
}
