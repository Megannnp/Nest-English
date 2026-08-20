import {
  deriveSubmissionStatusSummary,
  SUBMISSION_GRADING_STATUS,
  SUBMISSION_WORKFLOW_STATUS,
} from './assignmentSubmissionStatus.js';
import db from '../db/database.js';

function normalizeScore(value) {
  if (value === undefined || value === null || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function resolveSubmissionRecordType(row) {
  return row.record_type || 'task';
}

function resolveLatestSubmissionScore(row) {
  return normalizeScore(row.total_score ?? row.latest_score);
}

function resolveTeacherCommentReady(row) {
  return Boolean(row.teacher_comment);
}

function buildSubmissionStatusSummary(row, { recordType, latestScore, teacherCommentReady }) {
  return deriveSubmissionStatusSummary({
    ...row,
    recordType,
    feedbackGenerated: latestScore != null,
    teacherCommentReady,
  });
}

function buildSubmissionStatusFields(statusSummary) {
  return {
    bindStatus: statusSummary.bindStatus,
    gradingStatus: statusSummary.gradingStatus,
    workflowStatus: statusSummary.workflowStatus,
    workflowLabel: statusSummary.workflowLabel,
    statusLabel: statusSummary.statusLabel,
    nextAction: statusSummary.nextAction,
    queueSection: statusSummary.queueSection,
    taskStatus: statusSummary.gradingStatus,
    isPendingRoster: statusSummary.bindStatus !== 'bound',
  };
}

function buildSubmissionIdentityFields(row) {
  const writingId = row.writing_id || row.id || null;
  return {
    studentId: row.student_id || null,
    rosterId: row.roster_id || null,
    writingId,
    id: writingId || row.task_id || row.roster_id || row.student_id,
  };
}

function buildSubmissionDisplayFields(row) {
  return {
    studentName: row.student_name || row.user_name || '未命名学生',
    accountCode: row.account_code || '',
    classId: row.class_id || null,
    className: row.class_name || '',
    assignmentId: row.assignment_id || null,
    assignmentTitle: row.assignment_title || '未命名任务',
    writingTitle: row.writing_title || '未命名写作',
    maxScore: row.max_score == null ? null : Number(row.max_score),
    quickSummary: row.quick_summary || '',
  };
}

function buildSubmissionFeedbackFields(row, { latestScore, teacherCommentReady }) {
  return {
    latestScore,
    feedbackGenerated: latestScore != null,
    teacherCommentReady,
    submittedByTeacher: row.submitted_by_teacher || null,
    submittedAt: row.submitted_at || null,
    gradedAt: row.graded_at || null,
    createdAt: row.created_at || null,
    gradingTaskStatus: row.grading_task_status || null,
    detailedFeedbackStatus: row.detailed_feedback_status || null,
    teacherCommentStatus: row.teacher_comment_status || null,
    teacherCommentSummary: row.teacher_comment_summary || '',
    feedbackPayload: row.feedback_payload || '',
  };
}

function mapSubmissionRow(row) {
  const recordType = resolveSubmissionRecordType(row);
  const latestScore = resolveLatestSubmissionScore(row);
  const teacherCommentReady = resolveTeacherCommentReady(row);
  const statusSummary = buildSubmissionStatusSummary(row, {
    recordType,
    latestScore,
    teacherCommentReady,
  });

  return {
    recordType,
    ...buildSubmissionStatusFields(statusSummary),
    ...buildSubmissionIdentityFields(row),
    ...buildSubmissionDisplayFields(row),
    ...buildSubmissionFeedbackFields(row, { latestScore, teacherCommentReady }),
  };
}

export async function listAssignmentSubmissionRows({
  teacherId,
  assignmentId = null,
  classId = null,
  limit = null,
  queueFilter = '',
} = {}) {
  const filters = [];
  const params = [teacherId];
  const rosterFilters = [];
  const rosterParams = [teacherId];

  if (queueFilter === 'gradings') {
    filters.push(`(
      t.status IN ('submitted', 'grading')
      OR (
        t.status = 'returned'
        AND (
          w.teacher_comment IS NULL
          OR JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')) IS NULL
          OR JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')) = ''
        )
      )
    )`);
    rosterFilters.push(`(
      JSON_EXTRACT(w.feedback, '$.totalScore') IS NULL
      OR JSON_EXTRACT(w.feedback, '$.totalScore') IS NOT NULL
    )`);
  }

  if (queueFilter === 'pending_comments') {
    filters.push(`(
      t.status = 'returned'
      AND (
        w.teacher_comment IS NULL
        OR JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')) IS NULL
        OR JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')) = ''
      )
    )`);
    rosterFilters.push(`JSON_EXTRACT(w.feedback, '$.totalScore') IS NOT NULL`);
  }

  if (assignmentId) {
    filters.push('t.assignment_id = ?');
    params.push(assignmentId);
    rosterFilters.push('w.assignment_id = ?');
    rosterParams.push(assignmentId);
  }
  if (classId) {
    filters.push('t.class_id = ?');
    params.push(classId);
    rosterFilters.push('sr.class_id = ?');
    rosterParams.push(classId);
  }

  const taskWhere = filters.length ? `AND ${filters.join(' AND ')}` : '';
  const rosterWhere = rosterFilters.length ? `AND ${rosterFilters.join(' AND ')}` : '';
  const limitClause = limit ? 'LIMIT ?' : '';
  const finalParams = [...params, ...rosterParams];
  if (limit) finalParams.push(Number(limit));

  const [rows] = await db.pool.query(`
    SELECT *
    FROM (
      SELECT
        'task' AS record_type,
        t.id AS task_id,
        t.assignment_id,
        t.student_id,
        NULL AS roster_id,
        t.class_id,
        t.status AS raw_task_status,
        t.writing_id,
        t.submitted_at,
        t.graded_at,
        t.created_at,
        u.real_name AS student_name,
        COALESCE(u.email, u.phone, '') AS account_code,
        COALESCE(w.class_name, u.class_name, c.class_name, '') AS class_name,
        a.title AS assignment_title,
        a.max_score,
        w.writing_title,
        COALESCE(t.latest_score, JSON_EXTRACT(w.feedback, '$.totalScore')) AS total_score,
        JSON_UNQUOTE(JSON_EXTRACT(w.feedback, '$.summary')) AS quick_summary,
        w.feedback AS feedback_payload,
        w.teacher_comment,
        JSON_UNQUOTE(JSON_EXTRACT(w.submitted_by_teacher, '$.teacherId')) AS submitted_by_teacher,
        gt.status AS grading_task_status,
        CASE
          WHEN dt.status = 'success' THEN '已生成'
          WHEN dt.status IS NULL THEN '未生成'
          ELSE '生成中'
        END AS detailed_feedback_status,
        CASE
          WHEN w.teacher_comment IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')) = '' THEN '未评价'
          ELSE '已评价'
        END AS teacher_comment_status,
        LEFT(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')), ''), 60) AS teacher_comment_summary,
        CASE t.status
          WHEN 'submitted' THEN 0
          WHEN 'grading' THEN 1
          WHEN 'returned' THEN 2
          WHEN 'overdue' THEN 3
          ELSE 4
        END AS sort_order
      FROM assignment_tasks t
      JOIN assignments a ON a.id = t.assignment_id
      LEFT JOIN classes c ON c.id = t.class_id
      JOIN users u ON u.id = t.student_id
      LEFT JOIN writings w ON w.id = t.writing_id
      LEFT JOIN writing_tasks gt ON gt.writing_id = t.writing_id AND gt.task_type = 'grading'
      LEFT JOIN writing_tasks dt ON dt.writing_id = t.writing_id AND dt.task_type = 'detailed_feedback'
      WHERE a.teacher_id = ?
        ${taskWhere}
      UNION ALL
      SELECT
        'pending_roster' AS record_type,
        NULL AS task_id,
        w.assignment_id,
        NULL AS student_id,
        w.roster_id,
        sr.class_id,
        NULL AS raw_task_status,
        w.id AS writing_id,
        w.created_at AS submitted_at,
        CASE WHEN JSON_EXTRACT(w.feedback, '$.totalScore') IS NULL THEN NULL ELSE w.created_at END AS graded_at,
        w.created_at,
        COALESCE(sr.student_name, w.user_name) AS student_name,
        '未绑定' AS account_code,
        COALESCE(w.class_name, c.class_name, '') AS class_name,
        a.title AS assignment_title,
        a.max_score,
        w.writing_title,
        JSON_EXTRACT(w.feedback, '$.totalScore') AS total_score,
        JSON_UNQUOTE(JSON_EXTRACT(w.feedback, '$.summary')) AS quick_summary,
        w.feedback AS feedback_payload,
        w.teacher_comment,
        JSON_UNQUOTE(JSON_EXTRACT(w.submitted_by_teacher, '$.teacherId')) AS submitted_by_teacher,
        gt.status AS grading_task_status,
        CASE
          WHEN dt.status = 'success' THEN '已生成'
          WHEN dt.status IS NULL THEN '未生成'
          ELSE '生成中'
        END AS detailed_feedback_status,
        CASE
          WHEN w.teacher_comment IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')) = '' THEN '未评价'
          ELSE '已评价'
        END AS teacher_comment_status,
        LEFT(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')), ''), 60) AS teacher_comment_summary,
        CASE
          WHEN JSON_EXTRACT(w.feedback, '$.totalScore') IS NULL THEN 1
          ELSE 2
        END AS sort_order
      FROM writings w
      JOIN assignments a ON a.id = w.assignment_id
      LEFT JOIN student_roster sr ON sr.id = w.roster_id
      LEFT JOIN classes c ON c.id = sr.class_id
      LEFT JOIN writing_tasks gt ON gt.writing_id = w.id AND gt.task_type = 'grading'
      LEFT JOIN writing_tasks dt ON dt.writing_id = w.id AND dt.task_type = 'detailed_feedback'
      WHERE a.teacher_id = ?
        AND w.assignment_id IS NOT NULL
        AND w.user_id IS NULL
        AND w.roster_id IS NOT NULL
        ${rosterWhere}
    ) submission_rows
    ORDER BY sort_order ASC, created_at DESC
    ${limitClause}
  `, finalParams);

  return rows.map(mapSubmissionRow);
}

export function buildAssignmentSubmissionSummary(rows = []) {
  const officialRows = rows.filter((row) => row.recordType === 'task');
  const pendingRosterRows = rows.filter((row) => row.recordType === 'pending_roster');
  const feedbackReadyCount = rows.filter((row) => [
    SUBMISSION_WORKFLOW_STATUS.FEEDBACK_READY,
    SUBMISSION_WORKFLOW_STATUS.AWAITING_TEACHER_REVIEW,
    SUBMISSION_WORKFLOW_STATUS.COMPLETED,
    SUBMISSION_WORKFLOW_STATUS.PENDING_BINDING_READY,
  ].includes(row.workflowStatus)).length;
  const awaitingTeacherReviewCount = rows.filter((row) => row.workflowStatus === SUBMISSION_WORKFLOW_STATUS.AWAITING_TEACHER_REVIEW).length;
  const completedCount = rows.filter((row) => row.workflowStatus === SUBMISSION_WORKFLOW_STATUS.COMPLETED).length;
  const feedbackGeneratingCount = rows.filter((row) => [
    SUBMISSION_WORKFLOW_STATUS.FEEDBACK_GENERATING,
    SUBMISSION_WORKFLOW_STATUS.PENDING_BINDING_GENERATING,
  ].includes(row.workflowStatus)).length;

  return {
    totalCount: officialRows.length,
    pendingCount: officialRows.filter((row) => [SUBMISSION_GRADING_STATUS.PENDING, SUBMISSION_GRADING_STATUS.OVERDUE].includes(row.gradingStatus)).length,
    gradingCount: rows.filter((row) => [SUBMISSION_GRADING_STATUS.SUBMITTED, SUBMISSION_GRADING_STATUS.GRADING].includes(row.gradingStatus)).length,
    returnedCount: rows.filter((row) => row.gradingStatus === SUBMISSION_GRADING_STATUS.RETURNED).length,
    overdueCount: officialRows.filter((row) => row.gradingStatus === SUBMISSION_GRADING_STATUS.OVERDUE).length,
    feedbackGeneratingCount,
    feedbackReadyCount,
    awaitingTeacherReviewCount,
    completedCount,
    pendingRosterCount: pendingRosterRows.length,
    pendingRosterGradingCount: pendingRosterRows.filter((row) => row.gradingStatus === SUBMISSION_GRADING_STATUS.GRADING).length,
    pendingRosterReturnedCount: pendingRosterRows.filter((row) => row.gradingStatus === SUBMISSION_GRADING_STATUS.RETURNED).length,
    pendingRosterFailedCount: 0,
  };
}
