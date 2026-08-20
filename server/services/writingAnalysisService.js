import {
  getQuestionAnalysisTaskSnapshot,
  queueQuestionAnalysisForWriting,
  replayQuestionAnalysisDeadLetter,
} from './questionAnalysisQueueService.js';
import {
  attachLatestQuestionAnalysisTask,
  mapWritingDetail,
} from './writingQueryService.js';
import {
  assertWritingAccess,
  assertWritingCanBeDeleted,
  buildTeacherCommentPayload,
  loadWritingOrThrow,
} from './writingService.js';
import {
  getLatestWritingTaskByType,
  WRITING_TASK_TYPE,
} from './writingTaskService.js';
import db from '../db/database.js';
import { ConflictError, ValidationError } from '../utils/appError.js';
import {
  finalizeFeedback,
  mergeFeedback,
  safeJsonParse,
  sanitizeQuestionAnalysisPatch,
  serializeFeedback,
} from '../utils/writingFeedback.js';

export async function updateQuestionAnalysisFeedback({ writingId, user, feedbackPatch }) {
  const row = await loadWritingOrThrow(writingId);
  await assertWritingAccess({
    user,
    row,
    allowOwner: true,
    allowTeacher: true,
    forbiddenMessage: '无权限修改此写作',
  });

  const patch = sanitizeQuestionAnalysisPatch(feedbackPatch);
  if (!patch) {
    throw new ValidationError('仅允许更新题目分析相关字段');
  }

  const existingFeedback = safeJsonParse(row.feedback, {}) || {};
  const mergedFeedback = mergeFeedback(existingFeedback, patch);
  const finalizedFeedback = finalizeFeedback(existingFeedback, mergedFeedback, patch, row.selected_type);

  await db.prepare('UPDATE writings SET feedback = ? WHERE id = ?')
    .run(serializeFeedback(finalizedFeedback), writingId);

  const updated = await db.prepare('SELECT * FROM writings WHERE id = ?').get(writingId);
  const updatedWithTask = await attachLatestQuestionAnalysisTask(updated);
  return mapWritingDetail(updatedWithTask);
}

export async function retryQuestionAnalysisForWriting({ writingId, user }) {
  const row = await loadWritingOrThrow(writingId);
  await assertWritingAccess({
    user,
    row,
    allowOwner: true,
    allowTeacher: true,
    forbiddenMessage: '无权限重跑此写作的题目分析',
  });

  const taskSnapshot = await getQuestionAnalysisTaskSnapshot(writingId);
  const queueState = taskSnapshot?.queueState || 'idle';
  if (queueState !== 'idle') {
    const latest = await db.prepare('SELECT * FROM writings WHERE id = ?').get(writingId);
    const latestWithTask = await attachLatestQuestionAnalysisTask(latest);
    return {
      statusCode: 202,
      msg: queueState === 'running' ? '题目分析正在后台运行' : '题目分析已在队列中等待处理',
      data: mapWritingDetail(latestWithTask),
    };
  }

  await queueQuestionAnalysisForWriting(row, {
    incrementRetry: true,
    clearLastError: true,
    overview: '题目分析重新生成中，请稍候查看。',
  });

  const updated = await db.prepare('SELECT * FROM writings WHERE id = ?').get(writingId);
  const updatedWithTask = await attachLatestQuestionAnalysisTask(updated);
  return {
    statusCode: 202,
    msg: '题目分析已加入后台队列',
    data: mapWritingDetail(updatedWithTask),
  };
}

export async function replayQuestionAnalysisForWriting({ writingId, user }) {
  const row = await loadWritingOrThrow(writingId);
  await assertWritingAccess({
    user,
    row,
    allowOwner: true,
    allowTeacher: true,
    forbiddenMessage: '无权限重放此写作的死信任务',
  });

  const latestTask = await getLatestWritingTaskByType(writingId, WRITING_TASK_TYPE.QUESTION_ANALYSIS);
  if (!latestTask || latestTask.status !== 'dead_letter') {
    throw new ConflictError('当前没有可重放的死信任务');
  }

  await replayQuestionAnalysisDeadLetter(row);

  const updated = await db.prepare('SELECT * FROM writings WHERE id = ?').get(writingId);
  const updatedWithTask = await attachLatestQuestionAnalysisTask(updated);
  const questionAnalysisTask = await getQuestionAnalysisTaskSnapshot(writingId);

  return {
    statusCode: 202,
    msg: '死信任务已重新加入后台队列',
    data: {
      writing: mapWritingDetail(updatedWithTask),
      questionAnalysisTask,
    },
  };
}

export async function saveTeacherCommentForWriting({ writingId, user, content, annotatedImage }) {
  const row = await loadWritingOrThrow(writingId);
  await assertWritingAccess({
    user,
    row,
    allowOwner: false,
    allowTeacher: true,
    forbiddenMessage: '无权限评阅此写作',
  });

  const comment = buildTeacherCommentPayload({
    content,
    annotatedImage,
    teacher: user,
  });

  await db.prepare('UPDATE writings SET teacher_comment = ? WHERE id = ?')
    .run(JSON.stringify(comment), writingId);

  const updated = await db.prepare('SELECT * FROM writings WHERE id = ?').get(writingId);
  const updatedWithTask = await attachLatestQuestionAnalysisTask(updated);
  return mapWritingDetail(updatedWithTask);
}

export async function deleteWritingForUser({ writingId, user }) {
  const row = await loadWritingOrThrow(writingId);
  await assertWritingAccess({
    user,
    row,
    allowOwner: true,
    allowTeacher: false,
    forbiddenMessage: '无权限删除此写作',
  });
  assertWritingCanBeDeleted(row);

  await db.prepare('DELETE FROM writings WHERE id = ?').run(writingId);
  return {
    id: writingId,
    deleted: true,
  };
}
