import {
  startBatchGradingRecoveryLoop,
  startBatchGradingWorkerLoop,
  stopBatchGradingLoops,
} from './batchGradingService.js';
import {
  startExamImportRecoveryLoop,
  startExamImportWorkerLoop,
  stopExamImportLoops,
} from './examImportService.js';
import {
  startFeedbackTaskRecoveryLoop,
  startFeedbackTaskWorkerLoop,
  stopFeedbackTaskLoops,
} from './feedbackTaskQueueService.js';
import {
  startQuestionAnalysisRecoveryLoop,
  startQuestionAnalysisWorkerLoop,
  stopQuestionAnalysisLoops,
  setQuestionAnalysisWorker,
} from './questionAnalysisQueueService.js';
import { generateQuestionAnalysisResult } from './questionAnalysisService.js';

let startedWorkerRuntimes = null;

export function startQuestionAnalysisRuntime() {
  setQuestionAnalysisWorker(generateQuestionAnalysisResult);
  startQuestionAnalysisRecoveryLoop();
  startQuestionAnalysisWorkerLoop();
}

export function startWorkerRuntimes(flags = {}) {
  const started = [];

  if (flags.feedback) {
    startFeedbackTaskRecoveryLoop();
    startFeedbackTaskWorkerLoop();
    started.push('feedback');
  }

  if (flags.batchGrading) {
    startBatchGradingRecoveryLoop();
    startBatchGradingWorkerLoop();
    started.push('batchGrading');
  }

  if (flags.examImport) {
    startExamImportRecoveryLoop();
    startExamImportWorkerLoop();
    started.push('examImport');
  }

  if (flags.questionAnalysis) {
    startQuestionAnalysisRuntime();
    started.push('questionAnalysis');
  }

  return started;
}

export async function startWorkerRuntimesAfterDatabaseReady({
  databaseInitialization,
  flags = {},
  onDatabaseFailed,
  startRuntimes = startWorkerRuntimes,
} = {}) {
  if (!databaseInitialization) {
    startedWorkerRuntimes = startRuntimes(flags);
    return startedWorkerRuntimes;
  }

  try {
    await databaseInitialization;
    if (startedWorkerRuntimes) {
      return startedWorkerRuntimes;
    }
    startedWorkerRuntimes = startRuntimes(flags);
    return startedWorkerRuntimes;
  } catch (error) {
    if (typeof onDatabaseFailed === 'function') {
      onDatabaseFailed(error);
    }
    return [];
  }
}

/**
 * Stop all background loops started by startWorkerRuntimes / startWorkerRuntimesAfterDatabaseReady.
 * Safe to call on SIGTERM/SIGINT before closing DB and Redis connections.
 */
export function stopWorkerRuntimes() {
  stopFeedbackTaskLoops();
  stopBatchGradingLoops();
  stopQuestionAnalysisLoops();
  stopExamImportLoops();
}

export function resetStartedWorkerRuntimesForTests() {
  if (process.env.NODE_ENV !== 'test') return;
  startedWorkerRuntimes = null;
}
