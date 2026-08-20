/* eslint-disable complexity */
import { getAssignmentDetailByTeacher } from './query.js';
import db from '../../db/database.js';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/appError.js';
import { nanoid } from '../../utils/nanoid.js';
import {
  assertTeacherOwnsClass,
  coerceDueAt,
  derivePrimarySelectedType,
  normalizeAssignmentStatus,
  toClientAssignment,
} from '../assignmentSharedService.js';

// ── Assignment editability helpers ────────────────────────────────────────────

const EDITABLE_STATUSES = new Set(['draft', 'published', 'active', 'closed']);

export function isEditableAssignmentStatus(status) {
  return EDITABLE_STATUSES.has(status);
}

export function isAssignmentClassSelectionMutable(status) {
  return status === 'draft';
}

export function getAssignmentEffectiveClassIds(assignment) {
  if (assignment.class_ids) {
    try {
      const parsed = JSON.parse(assignment.class_ids);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through
    }
  }
  if (Array.isArray(assignment.classIds)) return assignment.classIds;
  if (assignment.class_id) return [assignment.class_id];
  return [];
}

export function hasAssignmentClassSelectionChanged(assignment, newClassIds) {
  const current = [...getAssignmentEffectiveClassIds(assignment)].sort();
  const next = [...newClassIds].sort();
  if (current.length !== next.length) return true;
  return current.some((id, i) => id !== next[i]);
}

export async function assertAssignableQuestion(questionId, teacherId) {
  if (!questionId) return null;
  const row = await db.prepare(`
    SELECT q.id, q.user_id, q.source_type, q.status, q.is_disabled, q.prompt_text, q.content, q.module_id, m.code AS module_code
    FROM questions q
    LEFT JOIN modules m ON m.id = q.module_id
    WHERE q.id = ?
    LIMIT 1
  `).get(questionId);
  if (!row) throw new ValidationError('题目不存在');

  const isDeleted = String(row.status || '').toLowerCase() === 'deleted';
  const isDisabled = Number(row.is_disabled || 0) === 1 || String(row.status || '').toLowerCase() === 'disabled';
  if (isDeleted || isDisabled) throw new ValidationError('题目已停用，不能布置为作业');

  const isWritingQuestion = !row.module_id || row.module_code === 'writing';
  const isOwnerQuestion = row.user_id === teacherId && isWritingQuestion;
  const isSystemWritingQuestion = String(row.source_type || '') === 'system'
    && isWritingQuestion;
  if (!isOwnerQuestion && !isSystemWritingQuestion) throw new ValidationError('题目不属于写作题库，不能布置为写作作业');
  if (!String(row.prompt_text || row.content || '').trim()) throw new ValidationError('题目缺少题干，不能布置为作业');
  return row;
}

export async function createAssignment({
  teacher,
  classId,
  title,
  promptText,
  questionId,
  questionTitle,
  selectedType,
  selectedTypeMix,
  selectedThemes,
  maxScore,
  dueAt,
  allowLate,
}) {
  const cls = await assertTeacherOwnsClass(teacher.id, classId);
  await assertAssignableQuestion(questionId, teacher.id);
  const now = Date.now();
  const assignmentId = nanoid();
  const primarySelectedType = derivePrimarySelectedType(selectedType, selectedTypeMix);
  await db.pool.query(`
    INSERT INTO assignments (
      id, class_id, teacher_id, teacher_name, title, prompt_text,
      question_id, question_title, selected_type, selected_type_mix, selected_themes,
      max_score, due_at, allow_late, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
  `, [
    assignmentId,
    classId,
    teacher.id,
    teacher.realName || teacher.name || '教师',
    title,
    promptText || '',
    questionId || null,
    questionTitle || '',
    primarySelectedType,
    JSON.stringify(selectedTypeMix || []),
    JSON.stringify(selectedThemes || []),
    maxScore,
    dueAt || null,
    allowLate ? 1 : 0,
    now,
    now,
  ]);

  const assignmentRow = await db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
  return {
    assignment: toClientAssignment(assignmentRow),
    taskCount: 0,
    className: cls.class_name,
  };
}

export async function updateAssignment({
  teacherId,
  assignmentId,
  title,
  promptText,
  questionId,
  questionTitle,
  selectedType,
  selectedTypeMix,
  selectedThemes,
  maxScore,
  dueAt,
  allowLate,
}) {
  const current = await db.prepare(`
    SELECT *
    FROM assignments
    WHERE id = ? AND teacher_id = ?
    LIMIT 1
  `).get(assignmentId, teacherId);

  if (!current) {
    throw new NotFoundError('作业不存在或无权限编辑');
  }

  if (normalizeAssignmentStatus(current.status) !== 'draft') {
    throw new ConflictError('只有草稿作业可以编辑');
  }

  await assertAssignableQuestion(questionId, teacherId);
  const primarySelectedType = derivePrimarySelectedType(selectedType, selectedTypeMix);
  const now = Date.now();
  await db.prepare(`
    UPDATE assignments
    SET
      title = ?,
      prompt_text = ?,
      question_id = ?,
      question_title = ?,
      selected_type = ?,
      selected_type_mix = ?,
      selected_themes = ?,
      max_score = ?,
      due_at = ?,
      allow_late = ?,
      updated_at = ?
    WHERE id = ? AND teacher_id = ?
  `).run(
    title,
    promptText || '',
    questionId || null,
    questionTitle || '',
    primarySelectedType,
    JSON.stringify(selectedTypeMix || []),
    JSON.stringify(selectedThemes || []),
    maxScore,
    coerceDueAt(dueAt),
    allowLate ? 1 : 0,
    now,
    assignmentId,
    teacherId
  );

  return getAssignmentDetailByTeacher(teacherId, assignmentId);
}
