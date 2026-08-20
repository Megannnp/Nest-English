import {
  getQuestionAnalysisProcessingMetrics as getQuestionAnalysisProcessingMetricsInternal,
} from './questionAnalysisMetrics.js';
import {
  enqueueQuestionAnalysisRetryJob,
  startQuestionAnalysisRecoveryLoop,
  startQuestionAnalysisWorkerLoop,
  stopQuestionAnalysisLoops,
} from './questionAnalysisQueueLoopService.js';
import {
  getQuestionAnalysisQueueMetrics,
  getQuestionAnalysisQueueState,
  getQuestionAnalysisQueueStateFromTask,
  setQuestionAnalysisWorker,
  shouldAutoQueueQuestionAnalysis as shouldAutoQueueQuestionAnalysisInternal,
} from './questionAnalysisQueueRuntime.js';
import {
  getQuestionAnalysisTaskSnapshot,
  queueQuestionAnalysisForWriting,
  replayQuestionAnalysisDeadLetter,
} from './questionAnalysisQueueTaskService.js';
import {
  normalizeWritingType,
} from '../utils/feedbackSchema.js';
import { optionalTrimmedString } from '../utils/routeValidation.js';

export function shouldAutoQueueQuestionAnalysis(payload) {
  return shouldAutoQueueQuestionAnalysisInternal(payload, normalizeWritingType, optionalTrimmedString);
}

export function getQuestionAnalysisObservabilityMetrics() {
  return {
    queue: getQuestionAnalysisQueueMetrics(),
    processing: getQuestionAnalysisProcessingMetricsInternal(),
  };
}

export { getQuestionAnalysisQueueMetrics, getQuestionAnalysisProcessingMetricsInternal as getQuestionAnalysisProcessingMetrics, getQuestionAnalysisQueueState, getQuestionAnalysisQueueStateFromTask, setQuestionAnalysisWorker };
export {
  enqueueQuestionAnalysisRetryJob,
  startQuestionAnalysisRecoveryLoop,
  startQuestionAnalysisWorkerLoop,
  stopQuestionAnalysisLoops,
  queueQuestionAnalysisForWriting,
  getQuestionAnalysisTaskSnapshot,
  replayQuestionAnalysisDeadLetter,
};
