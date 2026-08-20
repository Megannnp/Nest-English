import { enqueueQuestionAnalysisRetryJob } from './questionAnalysisQueueLoopService.js';
import { buildQuestionAnalysisRetryPayload, markWritingQueuedForQuestionAnalysis } from './questionAnalysisQueueMutationService.js';
import { getQuestionAnalysisQueueState } from './questionAnalysisQueueRuntime.js';
import {
  getLatestWritingTaskByType,
  replayWritingTask,
  WRITING_TASK_TYPE,
  WRITING_TASK_STATUS,
} from './writingTaskService.js';
import { ConflictError } from '../utils/appError.js';

export async function queueQuestionAnalysisForWriting(row, options = {}) {
  const queueState = getQuestionAnalysisQueueState(row?.id);
  if (queueState !== 'idle') {
    return { queued: false, state: queueState };
  }

  await markWritingQueuedForQuestionAnalysis(row, options);
  const enqueueResult = enqueueQuestionAnalysisRetryJob(row.id);
  return { queued: enqueueResult.accepted, state: enqueueResult.state };
}

export async function getQuestionAnalysisTaskSnapshot(writingId) {
  const task = await getLatestWritingTaskByType(writingId, WRITING_TASK_TYPE.QUESTION_ANALYSIS);
  if (!task) return null;

  return {
    ...task,
    queueState: getQuestionAnalysisQueueState(writingId, task),
    isDeadLetter: task.status === WRITING_TASK_STATUS.DEAD_LETTER,
    canReplay: task.status === WRITING_TASK_STATUS.DEAD_LETTER,
  };
}

export async function replayQuestionAnalysisDeadLetter(row) {
  const task = await getLatestWritingTaskByType(row?.id, WRITING_TASK_TYPE.QUESTION_ANALYSIS);
  if (!task || task.status !== WRITING_TASK_STATUS.DEAD_LETTER) {
    throw new ConflictError('当前没有可重放的死信任务');
  }

  await replayWritingTask({
    writingId: row.id,
    taskType: WRITING_TASK_TYPE.QUESTION_ANALYSIS,
    queueName: 'question_analysis_manual_replay',
    payload: buildQuestionAnalysisRetryPayload(row),
  });

  await markWritingQueuedForQuestionAnalysis(row, {
    incrementRetry: false,
    resetRetryCount: true,
    manualReplay: true,
    clearLastError: true,
    overview: '题目分析死信任务已重新加入队列，请稍候查看。',
  });

  const enqueueResult = enqueueQuestionAnalysisRetryJob(row.id);
  return {
    replayed: enqueueResult.accepted,
    state: enqueueResult.state,
  };
}
