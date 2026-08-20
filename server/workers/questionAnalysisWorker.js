import '../utils/env.js';
import db from '../db/database.js';
import {
  setQuestionAnalysisWorker,
  startQuestionAnalysisRecoveryLoop,
  startQuestionAnalysisWorkerLoop,
  stopQuestionAnalysisLoops,
} from '../services/questionAnalysisQueueService.js';
import { generateQuestionAnalysisResult } from '../services/questionAnalysisService.js';
import { closeSharedRedisClient } from '../services/redisClient.js';
import { logError, logInfo } from '../utils/logger.js';

setQuestionAnalysisWorker(generateQuestionAnalysisResult);
startQuestionAnalysisRecoveryLoop();
startQuestionAnalysisWorkerLoop();

logInfo('question_analysis_worker_started', {
  mode: process.env.NODE_ENV !== 'production' ? 'development' : 'production',
  taskSource: 'writing_tasks claim/recovery',
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// PM2 sends SIGTERM on restart/stop; systemd also uses SIGTERM.
// Stop polling loops first so no new tasks are claimed, then close connections.

async function gracefulShutdown(signal) {
  logInfo('question_analysis_worker_shutdown', { signal });
  stopQuestionAnalysisLoops();
  try {
    await closeSharedRedisClient();
  } catch { /* intentional */ }
  try {
    await db.pool.end();
  } catch { /* intentional */ }
  process.exit(0);
}

process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
process.on('SIGINT',  () => { void gracefulShutdown('SIGINT');  });

process.on('uncaughtException', (err) => {
  logError('question_analysis_worker_uncaught_exception', { message: err.message });
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  logError('question_analysis_worker_unhandled_rejection', { reason: reason instanceof Error ? reason.message : String(reason) });
});
