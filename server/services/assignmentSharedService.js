import db from '../db/database.js';
import { NotFoundError } from '../utils/appError.js';

export function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function derivePrimarySelectedType(selectedType = '', selectedTypeMix = []) {
  if (Array.isArray(selectedTypeMix) && selectedTypeMix.length > 0) {
    const sorted = [...selectedTypeMix].sort((left, right) => Number(right.percentage || 0) - Number(left.percentage || 0));
    return sorted[0]?.type || selectedType || '';
  }
  return selectedType || '';
}

export function normalizeAssignmentStatus(status) {
  if (status === 'active') return 'published';
  return status || 'draft';
}

export function coerceDueAt(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.trunc(num);
}

export function escapeCsvCell(value) {
  const text = value == null ? '' : String(value);
  const raw = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function getAssignmentStatusLabelForExport(status) {
  const normalized = normalizeAssignmentStatus(status);
  if (normalized === 'published') return '已发布';
  if (normalized === 'closed') return '已关闭';
  if (normalized === 'archived') return '已归档';
  return '草稿';
}

export function toClientAssignment(row) {
  if (!row) return null;
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    title: row.title,
    promptText: row.prompt_text || '',
    questionId: row.question_id || null,
    questionTitle: row.question_title || '',
    selectedType: row.selected_type || '',
    selectedTypeMix: parseJsonArray(row.selected_type_mix),
    selectedThemes: parseJsonArray(row.selected_themes),
    maxScore: Number(row.max_score || 0),
    dueAt: row.due_at || null,
    allowLate: Boolean(row.allow_late),
    status: normalizeAssignmentStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function _taskAssignmentFields(row) {
  return {
    id: row.assignment_id,
    classId: row.assignment_class_id || row.class_id,
    title: row.title,
    promptText: row.prompt_text || '',
    questionId: row.question_id || null,
    questionTitle: row.question_title || '',
    selectedType: row.selected_type || '',
    selectedTypeMix: parseJsonArray(row.selected_type_mix),
    selectedThemes: parseJsonArray(row.selected_themes),
    maxScore: Number(row.max_score || 0),
    dueAt: row.due_at || null,
    allowLate: Boolean(row.allow_late),
    status: row.assignment_status || row.status,
    createdAt: row.assignment_created_at || row.created_at,
    updatedAt: row.assignment_updated_at || row.updated_at,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    className: row.class_name || '',
  };
}

export function toClientAssignmentTask(row) {
  if (!row) return null;
  return {
    id: row.task_id || row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    classId: row.class_id,
    status: row.task_status || row.status,
    writingId: row.writing_id || null,
    latestScore: row.latest_score == null ? null : Number(row.latest_score),
    submittedAt: row.submitted_at || null,
    gradedAt: row.graded_at || null,
    viewedAt: row.viewed_at || null,
    createdAt: row.task_created_at || row.created_at,
    updatedAt: row.task_updated_at || row.updated_at,
    assignment: _taskAssignmentFields(row),
  };
}

export async function assertTeacherOwnsClass(teacherId, classId) {
  const row = await db.prepare(`
    SELECT id, class_name, class_code, teacher_id, teacher_name
    FROM classes
    WHERE id = ? AND teacher_id = ?
    LIMIT 1
  `).get(classId, teacherId);

  if (!row) {
    throw new NotFoundError('班级不存在或无权限操作');
  }

  return row;
}
