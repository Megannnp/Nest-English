import db from '../../db/database.js';
import { nanoid } from '../../utils/nanoid.js';
import { recordLearningEvent } from '../learningEventService.js';
import { completeOpenModuleAssignmentsForStudent } from '../moduleAssignmentService.js';

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeCount(value) {
  const number = Number(value || 0);
  if (!Number.isInteger(number) || number < 0) {
    throw validationError('小测题数不合法');
  }
  return number;
}

function isCompletedProgress(progress) {
  return progress?.status === 'completed' || progress?.completed_at != null;
}

function normalizeCourseProgressInput({ userId, nodeId, status, quizCorrect, quizTotal }) {
  if (!userId) throw validationError('缺少用户');
  const normalizedNodeId = String(nodeId || '').trim();
  if (!normalizedNodeId) throw validationError('缺少课程节点');
  const correct = normalizeCount(quizCorrect);
  const total = normalizeCount(quizTotal);
  if (total > 0 && correct > total) throw validationError('答对题数不能大于总题数');
  return {
    normalizedNodeId,
    normalizedStatus: status === 'completed' ? 'completed' : 'started',
    correct,
    total,
  };
}

export async function getReadingCourseProgress(userId) {
  if (!userId) return { nodes: [] };
  const rows = await db.prepare(`
    SELECT node_id, status, quiz_correct, quiz_total, completed_at, updated_at
    FROM reading_course_progress
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(userId);
  return {
    nodes: (rows || []).map((row) => ({
      nodeId: row.node_id,
      status: row.status || 'completed',
      quizCorrect: Number(row.quiz_correct || 0),
      quizTotal: Number(row.quiz_total || 0),
      completedAt: row.completed_at ? Number(row.completed_at) : null,
      updatedAt: Number(row.updated_at || 0),
    })),
  };
}

export async function upsertReadingCourseProgress({ userId, nodeId, status = 'completed', quizCorrect = 0, quizTotal = 0 }) {
  const { normalizedNodeId, normalizedStatus, correct, total } = normalizeCourseProgressInput({
    userId,
    nodeId,
    status,
    quizCorrect,
    quizTotal,
  });

  const now = Date.now();
  const existing = await db.prepare(
    'SELECT id, status, completed_at FROM reading_course_progress WHERE user_id = ? AND node_id = ?'
  ).get(userId, normalizedNodeId);
  const shouldRecordCompletion = normalizedStatus === 'completed' && !isCompletedProgress(existing);
  const id = nanoid();
  // 依赖 uq_rcp_user_node 唯一索引做原子 upsert，避免并发下的读写竞态
  await db.prepare(`
    INSERT INTO reading_course_progress
      (id, user_id, node_id, status, quiz_correct, quiz_total, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      quiz_correct = VALUES(quiz_correct),
      quiz_total = VALUES(quiz_total),
      completed_at = COALESCE(completed_at, VALUES(completed_at)),
      updated_at = VALUES(updated_at)
  `).run(id, userId, normalizedNodeId, normalizedStatus, correct, total, normalizedStatus === 'completed' ? now : null, now);

  if (shouldRecordCompletion) {
    void recordLearningEvent({
      userId,
      module: 'reading',
      eventType: 'course_complete',
      score: total > 0 ? Math.round((correct / total) * 100) : null,
      metadata: { nodeId: normalizedNodeId },
    });
    await completeOpenModuleAssignmentsForStudent({
      studentId: userId,
      moduleTypes: ['reading-courses'],
      source: { module: 'reading', nodeId: normalizedNodeId, status: normalizedStatus },
    });
  }
  return { id: existing?.id || id, nodeId: normalizedNodeId, status: normalizedStatus, quizCorrect: correct, quizTotal: total, updatedAt: now };
}
