import { getAssignmentDetailByTeacher } from './assignmentCrudService.js';
import {
  escapeCsvCell,
  getAssignmentStatusLabelForExport,
} from './assignmentSharedService.js';
import db from '../db/database.js';

function buildAssignmentExportCsv({ assignment, rows }) {
  const header = [
    '学生姓名',
    '账号编号',
    '班级',
    '作业名称',
    '任务状态',
    '提交方式',
    '提交时间',
    '得分',
    '满分',
    '快速反馈',
    '教师评价',
    '详细反馈',
    '教师评价摘要',
  ];

  const lines = rows.map((row) => [
    row.student_name || '',
    row.account_code || '',
    assignment.className || '',
    assignment.title || '',
    row.task_status || '',
    row.submission_mode || '',
    row.submitted_at ? new Date(Number(row.submitted_at)).toLocaleString('zh-CN') : '',
    row.latest_score == null ? '' : Number(row.latest_score),
    assignment.maxScore || '',
    row.quick_feedback_status || '',
    row.teacher_comment_status || '',
    row.detailed_feedback_status || '',
    row.teacher_comment_summary || '',
  ]);

  return `\ufeff${[header, ...lines].map((cells) => cells.map(escapeCsvCell).join(',')).join('\n')}`;
}

export function deriveSubmissionModeLabel(row = {}) {
  if (!row?.writing_id && !row?.submitted_at) return '';
  if (row?.submitted_by_teacher) return '教师代交';
  return '学生提交';
}

function buildAssignmentSummaryCsv({ assignment, rows }) {
  const metrics = buildAssignmentSummaryMetrics({ assignment, rows });
  const rowsForCsv = [
    ['班级', assignment.className || ''],
    ['作业名称', assignment.title || ''],
    ['作业状态', getAssignmentStatusLabelForExport(assignment.status)],
    ['任务总数', metrics.totalStudents],
    ['已提交', metrics.submittedCount],
    ['已返回', metrics.returnedCount],
    ['已完成率', metrics.completionRate],
    ['教师评价已补充', metrics.commentReadyCount],
    ['教师评价覆盖率', metrics.teacherCommentCoverageRate],
    ['详细反馈已生成', metrics.detailedReadyCount],
    ['详细反馈触发率', metrics.detailedFeedbackTriggerRate],
    ['平均分', metrics.averageScore],
    ['最高分', metrics.maxScore],
    ['最低分', metrics.minScore],
    ['分数分布（90%-100%）', metrics.distribution.excellent],
    ['分数分布（80%-89%）', metrics.distribution.good],
    ['分数分布（70%-79%）', metrics.distribution.medium],
    ['分数分布（60%-69%）', metrics.distribution.warning],
    ['分数分布（60%以下）', metrics.distribution.fail],
    ['偏题人数', metrics.offTopicCount],
    ['偏题占比', metrics.offTopicRate],
    ['高风险人数', metrics.highRiskCount],
    ['高风险占比', metrics.highRiskRate],
  ];

  return `\ufeff${rowsForCsv.map((cells) => cells.map(escapeCsvCell).join(',')).join('\n')}`;
}

export function buildAssignmentSummaryMetrics({ assignment, rows }) {
  const validScores = rows.filter((row) => row.latest_score != null).map((row) => Number(row.latest_score));
  const totalStudents = rows.length;
  const submittedCount = rows.filter((row) => ['submitted', 'grading', 'returned'].includes(row.task_status)).length;
  const returnedCount = rows.filter((row) => row.task_status === 'returned').length;
  const commentReadyCount = rows.filter((row) => row.teacher_comment_status === '已评价').length;
  const detailedReadyCount = rows.filter((row) => row.detailed_feedback_status === '已生成').length;
  const averageScore = validScores.length ? (validScores.reduce((sum, value) => sum + value, 0) / validScores.length).toFixed(2) : '';
  const maxScore = validScores.length ? Math.max(...validScores) : '';
  const minScore = validScores.length ? Math.min(...validScores) : '';
  const maxScoreValue = assignment.maxScore ? Number(assignment.maxScore) : 0;
  const distribution = { excellent: 0, good: 0, medium: 0, warning: 0, fail: 0 };
  let offTopicCount = 0;
  let highRiskCount = 0;

  rows.forEach((row) => {
    const latestScore = row.latest_score == null ? null : Number(row.latest_score);
    const ratio = latestScore != null && maxScoreValue > 0 ? latestScore / maxScoreValue : null;
    const feedbackText = `${row.feedback_summary || ''} ${row.feedback_payload || ''}`;
    const isOffTopic = /偏题|跑题|离题/.test(feedbackText);

    if (ratio != null) {
      if (ratio >= 0.9) distribution.excellent += 1;
      else if (ratio >= 0.8) distribution.good += 1;
      else if (ratio >= 0.7) distribution.medium += 1;
      else if (ratio >= 0.6) distribution.warning += 1;
      else distribution.fail += 1;
    }

    if (isOffTopic) offTopicCount += 1;
    if (isOffTopic || (ratio != null && ratio < 0.6)) highRiskCount += 1;
  });

  return {
    totalStudents,
    submittedCount,
    returnedCount,
    commentReadyCount,
    detailedReadyCount,
    averageScore,
    maxScore,
    minScore,
    completionRate: totalStudents > 0 ? `${Math.round((returnedCount / totalStudents) * 100)}%` : '0%',
    teacherCommentCoverageRate: returnedCount > 0 ? `${Math.round((commentReadyCount / returnedCount) * 100)}%` : '0%',
    detailedFeedbackTriggerRate: returnedCount > 0 ? `${Math.round((detailedReadyCount / returnedCount) * 100)}%` : '0%',
    distribution,
    offTopicCount,
    offTopicRate: totalStudents > 0 ? `${Math.round((offTopicCount / totalStudents) * 100)}%` : '0%',
    highRiskCount,
    highRiskRate: totalStudents > 0 ? `${Math.round((highRiskCount / totalStudents) * 100)}%` : '0%',
  };
}

export async function getAssignmentExportPayload({ teacherId, assignmentId }) {
  const detail = await getAssignmentDetailByTeacher(teacherId, assignmentId);
  const [rows] = await db.pool.query(`
    SELECT
      u.real_name AS student_name,
      COALESCE(u.email, u.phone, '') AS account_code,
      t.writing_id,
      t.status AS task_status,
      t.submitted_at,
      t.latest_score AS latest_score,
      JSON_UNQUOTE(JSON_EXTRACT(w.submitted_by_teacher, '$.teacherId')) AS submitted_by_teacher,
      JSON_UNQUOTE(JSON_EXTRACT(w.feedback, '$.summary')) AS feedback_summary,
      w.feedback AS feedback_payload,
      CASE
        WHEN w.feedback IS NULL THEN '未生成'
        ELSE '已生成'
      END AS quick_feedback_status,
      CASE
        WHEN w.teacher_comment IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')) = '' THEN '未评价'
        ELSE '已评价'
      END AS teacher_comment_status,
      CASE
        WHEN dt.status = 'done' THEN '已生成'
        WHEN dt.status IS NULL THEN '未生成'
        ELSE '生成中'
      END AS detailed_feedback_status,
      LEFT(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(w.teacher_comment, '$.content')), ''), 60) AS teacher_comment_summary
    FROM assignment_tasks t
    JOIN users u ON u.id = t.student_id
    LEFT JOIN writings w ON w.id = t.writing_id
    LEFT JOIN writing_tasks dt
      ON dt.writing_id = t.writing_id AND dt.task_type = 'detailed_feedback'
    WHERE t.assignment_id = ?
    ORDER BY submitted_at DESC, u.real_name ASC
  `, [assignmentId]);

  const normalizedRows = rows.map((row) => ({
    ...row,
    submission_mode: deriveSubmissionModeLabel(row),
  }));

  return {
    assignment: detail.assignment,
    summary: detail.summary,
    metrics: buildAssignmentSummaryMetrics({ assignment: detail.assignment, rows: normalizedRows }),
    rows: normalizedRows,
  };
}

export async function exportAssignmentCsv({ teacherId, assignmentId, exportType = 'detail' }) {
  const payload = await getAssignmentExportPayload({ teacherId, assignmentId });
  const detail = await getAssignmentDetailByTeacher(teacherId, assignmentId);
  const rows = payload.rows;
  const normalizedType = exportType === 'summary' ? 'summary' : 'detail';
  return {
    filename: `${detail.assignment.className || '班级'}-${detail.assignment.title || '作业数据'}-${normalizedType === 'summary' ? '汇总' : '明细'}.csv`,
    csv: normalizedType === 'summary'
      ? buildAssignmentSummaryCsv({ assignment: detail.assignment, rows })
      : buildAssignmentExportCsv({ assignment: detail.assignment, rows }),
  };
}
