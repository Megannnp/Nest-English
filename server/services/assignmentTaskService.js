import { toClientAssignmentTask } from './assignmentSharedService.js';
import db from '../db/database.js';
import { NotFoundError } from '../utils/appError.js';

export async function listAssignmentTasksForStudent(studentId) {
  const rows = await db.prepare(`
    SELECT
      t.id AS task_id,
      t.assignment_id,
      t.student_id,
      t.class_id,
      t.status AS task_status,
      t.writing_id,
      t.latest_score,
      t.submitted_at,
      t.graded_at,
      t.viewed_at,
      t.created_at AS task_created_at,
      t.updated_at AS task_updated_at,
      a.class_id AS assignment_class_id,
      a.teacher_id,
      a.teacher_name,
      a.title,
      a.prompt_text,
      a.question_id,
      a.question_title,
      a.selected_type,
      a.selected_type_mix,
      a.selected_themes,
      a.max_score,
      a.due_at,
      a.allow_late,
      a.status AS assignment_status,
      a.created_at AS assignment_created_at,
      a.updated_at AS assignment_updated_at,
      c.class_name
    FROM assignment_tasks t
    JOIN assignments a ON a.id = t.assignment_id
    JOIN classes c ON c.id = a.class_id
    WHERE t.student_id = ?
    ORDER BY
      CASE t.status
        WHEN 'pending' THEN 0
        WHEN 'submitted' THEN 1
        WHEN 'grading' THEN 2
        WHEN 'returned' THEN 3
        ELSE 4
      END,
      COALESCE(a.due_at, a.created_at) ASC,
      a.created_at DESC
  `).all(studentId);

  return rows.map(toClientAssignmentTask);
}

export async function getAssignmentTaskForStudent(taskId, studentId) {
  const row = await db.prepare(`
    SELECT
      t.id AS task_id,
      t.assignment_id,
      t.student_id,
      t.class_id,
      t.status AS task_status,
      t.writing_id,
      t.latest_score,
      t.submitted_at,
      t.graded_at,
      t.viewed_at,
      t.created_at AS task_created_at,
      t.updated_at AS task_updated_at,
      a.class_id AS assignment_class_id,
      a.teacher_id,
      a.teacher_name,
      a.title,
      a.prompt_text,
      a.question_id,
      a.question_title,
      a.selected_type,
      a.selected_type_mix,
      a.selected_themes,
      a.max_score,
      a.due_at,
      a.allow_late,
      a.status AS assignment_status,
      a.created_at AS assignment_created_at,
      a.updated_at AS assignment_updated_at,
      c.class_name
    FROM assignment_tasks t
    JOIN assignments a ON a.id = t.assignment_id
    JOIN classes c ON c.id = a.class_id
    WHERE t.id = ? AND t.student_id = ?
    LIMIT 1
  `).get(taskId, studentId);

  if (!row) {
    throw new NotFoundError('任务不存在或无权限查看');
  }

  return toClientAssignmentTask(row);
}

export async function markAssignmentTaskSubmitted({
  assignmentId,
  studentId,
  writingId,
}) {
  if (!assignmentId || !studentId || !writingId) return null;
  const now = Date.now();
  await db.prepare(`
    UPDATE assignment_tasks
    SET status = 'submitted', writing_id = ?, submitted_at = ?, updated_at = ?
    WHERE assignment_id = ? AND student_id = ? AND status NOT IN ('returned')
  `).run(writingId, now, now, assignmentId, studentId);
  return db.prepare(`
    SELECT *
    FROM assignment_tasks
    WHERE assignment_id = ? AND student_id = ?
    LIMIT 1
  `).get(assignmentId, studentId);
}

export async function markAssignmentTaskGrading({
  assignmentId,
  studentId,
  writingId,
}) {
  if (!assignmentId || !studentId || !writingId) return null;
  const now = Date.now();
  await db.prepare(`
    UPDATE assignment_tasks
    SET status = 'grading', writing_id = ?, updated_at = ?
    WHERE assignment_id = ? AND student_id = ? AND status NOT IN ('returned')
  `).run(writingId, now, assignmentId, studentId);
  return db.prepare(`
    SELECT *
    FROM assignment_tasks
    WHERE assignment_id = ? AND student_id = ?
    LIMIT 1
  `).get(assignmentId, studentId);
}

export async function markAssignmentTaskSubmittedAndGrading({
  assignmentId,
  studentId,
  writingId,
}) {
  if (!assignmentId || !studentId || !writingId) return null;
  const now = Date.now();
  await db.prepare(`
    UPDATE assignment_tasks
    SET status = 'grading', writing_id = ?, submitted_at = ?, updated_at = ?
    WHERE assignment_id = ? AND student_id = ?
  `).run(writingId, now, now, assignmentId, studentId);
  return db.prepare(`
    SELECT *
    FROM assignment_tasks
    WHERE assignment_id = ? AND student_id = ?
    LIMIT 1
  `).get(assignmentId, studentId);
}

export async function markAssignmentTaskGraded({
  assignmentId,
  studentId,
  writingId,
  latestScore = null,
}) {
  if (!assignmentId || !studentId || !writingId) return null;
  const now = Date.now();
  await db.prepare(`
    UPDATE assignment_tasks
    SET status = 'returned', writing_id = ?, latest_score = ?, graded_at = ?, updated_at = ?
    WHERE assignment_id = ? AND student_id = ?
  `).run(writingId, latestScore, now, now, assignmentId, studentId);
  return db.prepare(`
    SELECT *
    FROM assignment_tasks
    WHERE assignment_id = ? AND student_id = ?
    LIMIT 1
  `).get(assignmentId, studentId);
}

export async function getAssignmentTaskByAssignmentAndStudent(assignmentId, studentId) {
  return db.prepare(`
    SELECT *
    FROM assignment_tasks
    WHERE assignment_id = ? AND student_id = ?
    LIMIT 1
  `).get(assignmentId, studentId);
}
