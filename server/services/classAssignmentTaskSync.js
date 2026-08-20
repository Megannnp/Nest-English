import { nanoid } from "../utils/nanoid.js";

export function parseWritingLatestScore(feedback) {
  try {
    const parsed = feedback ? JSON.parse(feedback) : null;
    const score = parsed?.totalScore == null ? null : Number(parsed.totalScore);
    return Number.isFinite(score) ? score : null;
  } catch {
    return null;
  }
}

export function buildAssignmentTaskSyncPayload(writing, userId, now) {
  const latestScore = parseWritingLatestScore(writing.feedback);
  return {
    assignmentId: writing.assignment_id,
    gradedAt: latestScore == null ? null : now,
    latestScore,
    now,
    submittedAt: writing.created_at || now,
    taskClassId: writing.task_class_id,
    taskStatus: latestScore == null ? "grading" : "returned",
    userId,
    writingId: writing.id,
  };
}

export async function updateAssignmentTaskForLinkedWriting(connection, payload) {
  const [updateResult] = await connection.query(
    `UPDATE assignment_tasks
     SET status = CASE
           WHEN ? IS NULL THEN CASE WHEN writing_id IS NULL THEN 'grading' ELSE status END
           ELSE 'returned'
         END,
         writing_id = COALESCE(writing_id, ?),
         latest_score = COALESCE(latest_score, ?),
         graded_at = CASE WHEN ? IS NULL THEN graded_at ELSE COALESCE(graded_at, ?) END,
         updated_at = ?
     WHERE assignment_id = ? AND student_id = ?
       AND (writing_id IS NULL OR writing_id = ?)`,
    [
      payload.latestScore,
      payload.writingId,
      payload.latestScore,
      payload.latestScore,
      payload.now,
      payload.now,
      payload.assignmentId,
      payload.userId,
      payload.writingId,
    ]
  );
  return Number(updateResult?.affectedRows || 0) > 0;
}

export async function canInsertAssignmentTaskForLinkedWriting(connection, payload) {
  const [existingTaskRows] = await connection.query(
    `SELECT id, writing_id
     FROM assignment_tasks
     WHERE assignment_id = ? AND student_id = ?
     LIMIT 1`,
    [payload.assignmentId, payload.userId]
  );
  const existingTask = existingTaskRows[0] || null;
  return !(existingTask?.writing_id && existingTask.writing_id !== payload.writingId);
}

export async function upsertAssignmentTaskForLinkedWriting(connection, payload) {
  await connection.query(
    `INSERT INTO assignment_tasks (
       id, assignment_id, student_id, class_id, status, writing_id, latest_score,
       submitted_at, graded_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = CASE
         WHEN assignment_tasks.writing_id IS NULL OR assignment_tasks.writing_id = VALUES(writing_id)
           THEN VALUES(status)
         ELSE assignment_tasks.status
       END,
       writing_id = COALESCE(assignment_tasks.writing_id, VALUES(writing_id)),
       latest_score = CASE
         WHEN assignment_tasks.writing_id IS NULL OR assignment_tasks.writing_id = VALUES(writing_id)
           THEN COALESCE(assignment_tasks.latest_score, VALUES(latest_score))
         ELSE assignment_tasks.latest_score
       END,
       submitted_at = CASE
         WHEN assignment_tasks.writing_id IS NULL OR assignment_tasks.writing_id = VALUES(writing_id)
           THEN COALESCE(assignment_tasks.submitted_at, VALUES(submitted_at))
         ELSE assignment_tasks.submitted_at
       END,
       graded_at = CASE
         WHEN assignment_tasks.writing_id IS NULL OR assignment_tasks.writing_id = VALUES(writing_id)
           THEN COALESCE(assignment_tasks.graded_at, VALUES(graded_at))
         ELSE assignment_tasks.graded_at
       END,
       updated_at = VALUES(updated_at)`,
    [
      nanoid(),
      payload.assignmentId,
      payload.userId,
      payload.taskClassId,
      payload.taskStatus,
      payload.writingId,
      payload.latestScore,
      payload.submittedAt,
      payload.gradedAt,
      payload.now,
      payload.now,
    ]
  );
}

export async function resetAssignmentTaskForDetachedWriting(connection, writing, userId, now) {
  await connection.query(
    `UPDATE assignment_tasks
     SET status = 'pending',
         writing_id = NULL,
         latest_score = NULL,
         submitted_at = NULL,
         graded_at = NULL,
         updated_at = ?
     WHERE assignment_id = ? AND student_id = ? AND writing_id = ?`,
    [now, writing.assignment_id, userId, writing.id]
  );
}
