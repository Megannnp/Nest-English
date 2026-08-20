import { WRITING_TASK_STATUS } from './model.js';
import { saveWritingTask } from './store.js';

export async function markWritingTaskQueued({
  writingId,
  taskType,
  queueName = '',
  payload = undefined,
  attempts = 0,
}) {
  return saveWritingTask({
    writingId,
    taskType,
    status: WRITING_TASK_STATUS.PENDING,
    queueName,
    payload,
    attempts,
    startedAt: null,
    finishedAt: null,
    nextRunAt: null,
    lastHeartbeatAt: null,
    deadLetteredAt: null,
    errorMessage: null,
  });
}

export async function markWritingTaskRunning({
  writingId,
  taskType,
  queueName = '',
  payload = undefined,
  attempts = 1,
}) {
  return saveWritingTask({
    writingId,
    taskType,
    status: WRITING_TASK_STATUS.RUNNING,
    queueName,
    payload,
    attempts,
    startedAt: Date.now(),
    finishedAt: null,
    nextRunAt: null,
    lastHeartbeatAt: Date.now(),
    deadLetteredAt: null,
    errorMessage: null,
  });
}

export async function markWritingTaskSuccess({
  writingId,
  taskType,
  queueName = '',
  payload = undefined,
  result = undefined,
  attempts = 1,
}) {
  return saveWritingTask({
    writingId,
    taskType,
    status: WRITING_TASK_STATUS.SUCCESS,
    queueName,
    payload,
    result,
    attempts,
    nextRunAt: null,
    lastHeartbeatAt: Date.now(),
    deadLetteredAt: null,
    finishedAt: Date.now(),
    errorMessage: null,
  });
}

export async function markWritingTaskFailed({
  writingId,
  taskType,
  queueName = '',
  payload = undefined,
  errorMessage = '任务执行失败',
  attempts = 1,
}) {
  return saveWritingTask({
    writingId,
    taskType,
    status: WRITING_TASK_STATUS.FAILED,
    queueName,
    payload,
    result: null,
    attempts,
    nextRunAt: null,
    lastHeartbeatAt: Date.now(),
    deadLetteredAt: null,
    finishedAt: Date.now(),
    errorMessage,
  });
}

export async function markWritingTaskRetryPending({
  writingId,
  taskType,
  queueName = '',
  payload = undefined,
  errorMessage = '任务执行失败，等待重试',
  attempts = 1,
  nextRunAt = Date.now(),
}) {
  return saveWritingTask({
    writingId,
    taskType,
    status: WRITING_TASK_STATUS.PENDING,
    queueName,
    payload,
    result: null,
    attempts,
    nextRunAt,
    lastHeartbeatAt: Date.now(),
    deadLetteredAt: null,
    finishedAt: null,
    errorMessage,
  });
}

export async function markWritingTaskDeadLetter({
  writingId,
  taskType,
  queueName = '',
  payload = undefined,
  errorMessage = '任务已进入死信队列',
  attempts = 1,
}) {
  return saveWritingTask({
    writingId,
    taskType,
    status: WRITING_TASK_STATUS.DEAD_LETTER,
    queueName,
    payload,
    result: null,
    attempts,
    nextRunAt: null,
    lastHeartbeatAt: Date.now(),
    deadLetteredAt: Date.now(),
    finishedAt: Date.now(),
    errorMessage,
  });
}

export async function replayWritingTask({
  writingId,
  taskType,
  queueName = '',
  payload = undefined,
}) {
  return saveWritingTask({
    writingId,
    taskType,
    status: WRITING_TASK_STATUS.PENDING,
    queueName,
    payload,
    result: null,
    attempts: 0,
    nextRunAt: null,
    lastHeartbeatAt: null,
    deadLetteredAt: null,
    startedAt: null,
    finishedAt: null,
    errorMessage: null,
  });
}
