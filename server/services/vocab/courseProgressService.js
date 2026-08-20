import { getVocabContent } from './contentService.js';
import db from '../../db/database.js';
import { ValidationError } from '../../utils/appError.js';
import { nanoid } from '../../utils/nanoid.js';
import { recordLearningEvent } from '../learningEventService.js';
import { completeOpenModuleAssignmentsForStudent } from '../moduleAssignmentService.js';

function validateQuizCounts(quizCorrect, quizTotal) {
  const correct = Number(quizCorrect);
  const total = Number(quizTotal);
  if (!Number.isInteger(correct) || correct < 0) {
    throw new ValidationError('答对题数不合法');
  }
  if (!Number.isInteger(total) || total < 0) {
    throw new ValidationError('总题数不合法');
  }
  if (correct > total) {
    throw new ValidationError('答对题数不能大于总题数');
  }
}

function collectCourseNodeIds(nodes, result = new Set()) {
  for (const node of nodes || []) {
    if (node?.id && node.content) result.add(String(node.id));
    if (node?.children) collectCourseNodeIds(node.children, result);
  }
  return result;
}

async function validateCourseNodeId(nodeId) {
  const normalizedNodeId = String(nodeId || '').trim();
  if (!normalizedNodeId) throw new ValidationError('缺少课程节点');
  const { courseTree } = await getVocabContent();
  if (!collectCourseNodeIds(courseTree).has(normalizedNodeId)) {
    throw new ValidationError('课程节点不存在');
  }
  return normalizedNodeId;
}

export async function getCourseProgress(userId) {
  const rows = await db.prepare(`
    SELECT node_id, status, quiz_correct, quiz_total, completed_at
    FROM vocabulary_course_progress
    WHERE user_id = ?
    ORDER BY completed_at DESC
  `).all(userId);

  const nodes = (rows || []).map(r => ({
    nodeId:      r.node_id,
    status:      r.status,
    quizCorrect: Number(r.quiz_correct),
    quizTotal:   Number(r.quiz_total),
    completedAt: r.completed_at != null ? Number(r.completed_at) : null,
  }));

  return {
    completedIds: nodes.filter(n => n.status === 'completed').map(n => n.nodeId),
    nodes,
  };
}

export async function upsertCourseProgress({ userId, nodeId, status, quizCorrect, quizTotal }) {
  if (!userId) throw new ValidationError('缺少用户');
  validateQuizCounts(quizCorrect, quizTotal);
  const normalizedNodeId = await validateCourseNodeId(nodeId);

  const now = Date.now();
  const existing = await db.prepare(`
    SELECT id, status, completed_at FROM vocabulary_course_progress WHERE user_id = ? AND node_id = ?
  `).get(userId, normalizedNodeId);
  const shouldRecordCompletion = status === 'completed' && !(existing?.status === 'completed' || existing?.completed_at != null);
  await db.prepare(`
    INSERT INTO vocabulary_course_progress
      (id, user_id, node_id, status, quiz_correct, quiz_total, last_viewed_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = IF(completed_at IS NOT NULL AND VALUES(status) = 'viewed', status, VALUES(status)),
      quiz_correct = IF(completed_at IS NOT NULL AND VALUES(status) = 'viewed', quiz_correct, VALUES(quiz_correct)),
      quiz_total = IF(completed_at IS NOT NULL AND VALUES(status) = 'viewed', quiz_total, VALUES(quiz_total)),
      last_viewed_at = VALUES(last_viewed_at),
      completed_at = COALESCE(completed_at, VALUES(completed_at))
  `).run(
    nanoid(), userId, normalizedNodeId, status, quizCorrect, quizTotal,
    now, status === 'completed' ? now : null,
  );
  if (shouldRecordCompletion) {
    void recordLearningEvent({
      userId,
      module: 'vocabulary',
      eventType: 'course_complete',
      score: quizTotal > 0 ? Math.round((Number(quizCorrect) / Number(quizTotal)) * 100) : null,
      metadata: { nodeId: normalizedNodeId },
    });
    await completeOpenModuleAssignmentsForStudent({
      studentId: userId,
      moduleTypes: ['vocab-courses'],
      source: { module: 'vocabulary', nodeId: normalizedNodeId, status },
    });
  }
}
