import { safeJsonParse } from '../../utils/writingFeedback.js';
import { getLatestWritingTaskByType } from '../writingTaskService.js';
import {
  getDetailedFeedbackPayload,
  getDetailedFeedbackStatus,
  getSupplementalFeedbackTaskSnapshot,
  WRITING_TASK_TYPE,
} from './query.js';
import {
  buildFeedbackStatusSnapshot,
  getSupplementalFeedbackStatus,
  getTeacherCommentStatus,
  hasUsableQuickFeedback,
} from './status.js';

function _buildNextActions(feedback) {
  if (Array.isArray(feedback.nextActions)) return feedback.nextActions;
  if (!Array.isArray(feedback.improvements)) return [];
  return feedback.improvements
    .map((item) => (typeof item === 'string' ? item : (item?.detail || item?.title || '')))
    .filter(Boolean)
    .slice(0, 3);
}

function _buildQuickScoreFields(feedback, row) {
  return {
    totalScore: feedback.totalScore ?? null,
    maxScore: row.max_score ?? feedback.maxScore ?? null,
    tier: feedback.tier ?? null,
    summary: feedback.summary ?? '',
  };
}

function _buildQuickResult(feedback, row) {
  if (!hasUsableQuickFeedback(feedback)) return null;
  return {
    ..._buildQuickScoreFields(feedback, row),
    categories: Array.isArray(feedback.categories) ? feedback.categories : [],
    highlights: feedback.highlights && typeof feedback.highlights === 'object' ? feedback.highlights : {},
    grammarIssues: Array.isArray(feedback.grammarIssues) ? feedback.grammarIssues : [],
    weaknesses: Array.isArray(feedback.weaknesses) ? feedback.weaknesses : [],
    improvements: Array.isArray(feedback.improvements) ? feedback.improvements : [],
    mainProblems: Array.isArray(feedback.mainProblems)
      ? feedback.mainProblems
      : (Array.isArray(feedback.weaknesses) ? feedback.weaknesses.slice(0, 3) : []),
    nextActions: _buildNextActions(feedback),
  };
}

export function buildSupplementalFeedbackResponse(feedback, supplementalTask = {}) {
  const supplementalStatusFromFeedback = getSupplementalFeedbackStatus(feedback);
  const supplementalStatus = supplementalStatusFromFeedback !== 'not_started'
    ? supplementalStatusFromFeedback
    : (supplementalTask.status || 'not_requested');
  return {
    ...supplementalTask,
    status: supplementalStatus,
  };
}

export function isDetailedFeedbackReady(detailedStatus, statusSnapshot = {}) {
  return detailedStatus === 'ready' || statusSnapshot?.supplementalFeedbackStatus === 'ready';
}

export async function buildFeedbackResponse(row) {
  const feedback = safeJsonParse(row?.feedback, null);
  const teacherComment = safeJsonParse(row?.teacher_comment, null);
  const detailedStatus = await getDetailedFeedbackStatus(row);
  const detailedPayload = detailedStatus === 'ready' ? await getDetailedFeedbackPayload(row) : null;
  const supplementalTask = await getSupplementalFeedbackTaskSnapshot(row);
  const supplementalFeedback = buildSupplementalFeedbackResponse(feedback, supplementalTask);
  const quickTask = await getLatestWritingTaskByType(row?.id, WRITING_TASK_TYPE.GRADING);
  const quickTaskStatus = String(quickTask?.status || '').toLowerCase();
  const statusSnapshot = buildFeedbackStatusSnapshot(row, {
    detailedTaskStatus: detailedStatus,
    quickTaskStatus,
  });
  const teacherStatus = getTeacherCommentStatus(teacherComment);
  const quickResult = _buildQuickResult(feedback, row);

  return {
    writingId: row.id,
    assignmentId: row.assignment_id || null,
    source: row.source || 'self',
    quickFeedback: {
      status: statusSnapshot.quickFeedbackStatus,
      result: quickResult,
    },
    teacherComment: {
      status: teacherStatus,
      result: teacherComment,
    },
    supplementalFeedback: {
      ...supplementalFeedback,
    },
    detailedFeedback: {
      status: detailedStatus,
      result: detailedPayload,
    },
  };
}

function _buildQuickTaskStatus(quickTask, quickTaskStatus) {
  return {
    status: quickTaskStatus || 'not_started',
    attempts: Number(quickTask?.attempts || 0),
    errorMessage: quickTask?.errorMessage || null,
    startedAt: quickTask?.startedAt || null,
    updatedAt: quickTask?.updatedAt || null,
    finishedAt: quickTask?.finishedAt || null,
    lastHeartbeatAt: quickTask?.lastHeartbeatAt || null,
  };
}

export async function buildFeedbackStatusResponse(row) {
  const quickTask = await getLatestWritingTaskByType(row?.id, WRITING_TASK_TYPE.GRADING);
  const detailedStatus = await getDetailedFeedbackStatus(row);
  const quickTaskStatus = String(quickTask?.status || '').toLowerCase();
  const statusSnapshot = buildFeedbackStatusSnapshot(row, { detailedTaskStatus: detailedStatus, quickTaskStatus });

  return {
    writingId: row.id,
    ...statusSnapshot,
    taskStatus: { quick: _buildQuickTaskStatus(quickTask, quickTaskStatus) },
    ready: {
      quick: statusSnapshot.quickFeedbackStatus === 'ready',
      detailed: isDetailedFeedbackReady(detailedStatus, statusSnapshot),
    },
  };
}
