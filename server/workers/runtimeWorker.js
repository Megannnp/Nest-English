import '../utils/env.js';
import { getRuntimeTopology, getWorkerRuntimeFlags } from '../config/runtimeTopology.js';
import { validateProductionEnv } from '../config/validateEnv.js';
import db, { getDatabaseInitMode, startDatabaseInitialization } from '../db/database.js';
import { closeSharedRedisClient } from '../services/redisClient.js';
import { startWorkerRuntimes, stopWorkerRuntimes } from '../services/runtimeOrchestrationService.js';
import { logError, logInfo } from '../utils/logger.js';

validateProductionEnv();

async function bootstrapWorker() {
  await startDatabaseInitialization();

  const runtimeTopology = getRuntimeTopology();
  const startedWorkers = startWorkerRuntimes(getWorkerRuntimeFlags());

  logInfo('runtime_worker_started', {
    mode: process.env.NODE_ENV !== 'production' ? 'development' : 'production',
    runtimeRole: runtimeTopology.runtimeRole,
    databaseInitMode: getDatabaseInitMode(),
    activeWorkers: startedWorkers,
  });
}

bootstrapWorker().catch((err) => {
  logError('runtime_worker_bootstrap_failed', { message: err?.message || String(err) });
  process.exit(1);
});

async function gracefulShutdown(signal) {
  logInfo('runtime_worker_shutdown', { signal });
  stopWorkerRuntimes();
  try { await closeSharedRedisClient(); } catch { /* ignore */ }
  try { await db.pool.end(); } catch { /* ignore */ }
  process.exit(0);
}

process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
process.on('SIGINT',  () => { void gracefulShutdown('SIGINT');  });

process.on('uncaughtException', (err) => {
  logError('runtime_worker_uncaught_exception', { message: err.message });
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  logError('runtime_worker_unhandled_rejection', { reason: reason instanceof Error ? reason.message : String(reason) });
});
