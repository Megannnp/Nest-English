import './utils/env.js';
import { createApp } from './app.js';
import { validateProductionEnv } from './config/validateEnv.js';
import { getDatabaseInitMode, startDatabaseInitialization } from './db/database.js';
import { attachAsrWebSocketServer } from './services/asrRealtimeService.js';
import {
  startQuestionAnalysisRecoveryLoop,
  startQuestionAnalysisWorkerLoop,
  stopQuestionAnalysisLoops,
  setQuestionAnalysisWorker,
} from './services/questionAnalysisQueueService.js';
import { generateQuestionAnalysisResult } from './services/questionAnalysisService.js';
import { closeSharedRedisClient } from './services/redisClient.js';
import { recoverStaleRunningTasks } from './services/writingTaskService.js';
import { logInfo } from './utils/logger.js';

const PORT = process.env.PORT || 3001;
const DEV  = process.env.NODE_ENV !== 'production';
const EMBEDDED_QUESTION_ANALYSIS_WORKER =
  process.env.QUESTION_ANALYSIS_EMBEDDED_WORKER === '1' ||
  (process.env.QUESTION_ANALYSIS_EMBEDDED_WORKER == null && DEV);

validateProductionEnv();

const app = createApp();
void startDatabaseInitialization();

// ── 启动 ─────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  recoverStaleRunningTasks({ taskType: 'grading', staleBefore: Date.now() - 30000 })
    .then((n) => { if (n > 0) logInfo('stale_grading_tasks_recovered', { count: n }); })
    .catch(() => {});
  startQuestionAnalysisRecoveryLoop();
  if (EMBEDDED_QUESTION_ANALYSIS_WORKER) {
    setQuestionAnalysisWorker(generateQuestionAnalysisResult);
    startQuestionAnalysisWorkerLoop();
  }
  logInfo('server_started', {
    url: `http://localhost:${PORT}`,
    mode: DEV ? 'development' : 'production',
    aiProvider: process.env.AI_PROVIDER || 'volcengine',
    streamSupport: true,
    databaseInitMode: getDatabaseInitMode(),
    questionAnalysisWorker: EMBEDDED_QUESTION_ANALYSIS_WORKER ? 'embedded' : 'external',
    cors: DEV ? 'Allow localhost:5173' : 'nestenglish.com only',
    healthCheck: `http://localhost:${PORT}/api/health`,
    aiStreamApi: `http://localhost:${PORT}/api/ai/complete-stream`,
  });
});
const asrWebSocketServer = attachAsrWebSocketServer(server);

// ── 优雅关闭 ─────────────────────────────────────────────────────
// Handle both SIGTERM (PM2 / systemd restart) and SIGINT (Ctrl-C / dev).
async function gracefulShutdown(signal) {
  logInfo('server_shutdown_start', { signal });
  // Stop background job loops first so no new tasks are claimed.
  stopQuestionAnalysisLoops();
  // Close HTTP server — stops accepting new connections.
  await new Promise((resolve) => server.close(resolve));
  asrWebSocketServer.close();
  // Release shared resources.
  await closeSharedRedisClient();
  logInfo('server_shutdown_complete', { signal });
  process.exit(0);
}

process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
process.on('SIGINT',  () => { void gracefulShutdown('SIGINT');  });

process.on('uncaughtException', (err) => {
  logInfo('uncaught_exception', { message: err.message });
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  logInfo('unhandled_rejection', { reason: String(reason) });
});
