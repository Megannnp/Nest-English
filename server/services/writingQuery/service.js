import db from '../../db/database.js';
import {
  getQuestionAnalysisTaskSnapshot,
} from '../questionAnalysisQueueService.js';
import {
  getLatestWritingTaskByType,
  getWritingTasksByWritingId,
  WRITING_TASK_TYPE,
} from '../writingTaskService.js';
import { assertTeacherStudentWritingAccess, loadAccessibleWriting, loadAccessibleWritingTasks } from './access.js';
import { mapWritingDetail, mapWritingListItem } from './mappers.js';
import { WRITING_LIST_SQL } from './sql.js';

export async function attachLatestQuestionAnalysisTask(row) {
  if (!row?.id) return row;
  const task = await getLatestWritingTaskByType(row.id, WRITING_TASK_TYPE.QUESTION_ANALYSIS);
  if (!task) return row;

  return {
    ...row,
    task_status: task.status,
    task_queue_name: task.queueName,
    task_attempts: task.attempts,
    task_error_message: task.errorMessage,
    task_next_run_at: task.nextRunAt,
    task_last_heartbeat_at: task.lastHeartbeatAt,
    task_dead_lettered_at: task.deadLetteredAt,
  };
}

export async function listWritingsForUser(userId) {
  const rows = await db.prepare(WRITING_LIST_SQL).all(userId);
  return rows.map(mapWritingListItem);
}

export async function listWritingsForTeacherStudent({ teacherId, studentId }) {
  await assertTeacherStudentWritingAccess({ teacherId, studentId, db });
  const rows = await db.prepare(WRITING_LIST_SQL).all(studentId);
  return rows.map(mapWritingListItem);
}

function _detailedFeedbackStatus(detailedTaskStatus) {
  if (['success', 'ready'].includes(detailedTaskStatus)) return 'ready';
  return ['pending', 'running', 'failed', 'dead_letter'].includes(detailedTaskStatus)
    ? detailedTaskStatus : 'not_requested';
}

function _detailedFeedbackPayload(detailedTaskStatus, detailedTask) {
  if (detailedTaskStatus !== 'success' && detailedTaskStatus !== 'ready') return {};
  const result = detailedTask?.result;
  return result && typeof result === 'object' && !Array.isArray(result) ? result : {};
}

export async function getWritingDetailForUser({ writingId, user }) {
  const row = await loadAccessibleWriting({ writingId, user });
  const rowWithTask = await attachLatestQuestionAnalysisTask(row);
  const detail = mapWritingDetail(rowWithTask);
  const detailedTask = await getLatestWritingTaskByType(row.id, WRITING_TASK_TYPE.DETAILED_FEEDBACK);
  const detailedTaskStatus = String(detailedTask?.status || '').toLowerCase();

  if (detail.feedback) {
    detail.feedback = {
      ...detail.feedback,
      selectedType: detail.feedback.selectedType || row.selected_type,
      detailedFeedbackStatus: _detailedFeedbackStatus(detailedTaskStatus),
      ..._detailedFeedbackPayload(detailedTaskStatus, detailedTask),
    };
  }

  if (!detail.promptText) {
    if (row.question_id) {
      const questionRow = await db.prepare("SELECT COALESCE(prompt_text, content, '') AS prompt_text FROM questions WHERE id = ?").get(row.question_id);
      detail.promptText = questionRow?.prompt_text || '';
    }
    if (!detail.promptText && row.assignment_id) {
      const assignmentRow = await db.prepare('SELECT prompt_text FROM assignments WHERE id = ?').get(row.assignment_id);
      detail.promptText = assignmentRow?.prompt_text || '';
    }
  }

  const versionGroupId = row.version_group_id || row.id;
  const versionRows = await db.prepare(
    'SELECT id, version_no, previous_writing_id, created_at, word_count FROM writings WHERE version_group_id = ? ORDER BY version_no ASC'
  ).all(versionGroupId);

  if (versionRows.length > 1) {
    detail.versions = versionRows.map((v) => ({
      id: v.id,
      versionNo: v.version_no || 1,
      previousWritingId: v.previous_writing_id || null,
      createdAt: v.created_at,
      wordCount: v.word_count,
      isCurrent: v.id === row.id,
    }));
  }

  return detail;
}

export async function getWritingTasksForUser({ writingId, user }) {
  await loadAccessibleWritingTasks({ writingId, user });
  const tasks = await getWritingTasksByWritingId(writingId);
  const questionAnalysisTask = await getQuestionAnalysisTaskSnapshot(writingId);

  return {
    tasks,
    questionAnalysisTask,
  };
}
