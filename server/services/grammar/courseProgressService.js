import db from '../../db/database.js';
import { ValidationError } from '../../utils/appError.js';
import { logError } from '../../utils/logger.js';
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

function isCompletedProgress(progress) {
  return progress?.status === 'completed' || progress?.completed_at != null;
}

function getProgressUpdate({ existing, status, quizCorrect, quizTotal, now }) {
  const viewingCompletedNode = isCompletedProgress(existing) && status === 'viewed';
  return {
    status: viewingCompletedNode ? 'completed' : status,
    quizCorrect: viewingCompletedNode ? existing.quiz_correct : quizCorrect,
    quizTotal: viewingCompletedNode ? existing.quiz_total : quizTotal,
    completedAt: existing.completed_at != null
      ? existing.completed_at
      : (status === 'completed' || isCompletedProgress(existing) ? now : null),
  };
}

export async function getCourseProgress(userId) {
  const rows = await db.prepare(`
    SELECT node_id, status, quiz_correct, quiz_total, completed_at
    FROM grammar_course_progress
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
  validateQuizCounts(quizCorrect, quizTotal);

  const now = Date.now();
  const existing = await db.prepare(`
    SELECT id, status, completed_at, quiz_correct, quiz_total FROM grammar_course_progress WHERE user_id = ? AND node_id = ?
  `).get(userId, nodeId);
  const shouldRecordCompletion = status === 'completed' && !isCompletedProgress(existing);

  if (existing) {
    const update = getProgressUpdate({ existing, status, quizCorrect, quizTotal, now });
    await db.prepare(`
      UPDATE grammar_course_progress
      SET status = ?, quiz_correct = ?, quiz_total = ?, last_viewed_at = ?, completed_at = ?
      WHERE user_id = ? AND node_id = ?
    `).run(update.status, update.quizCorrect, update.quizTotal, now, update.completedAt, userId, nodeId);
  } else {
    await db.prepare(`
      INSERT INTO grammar_course_progress
        (id, user_id, node_id, status, quiz_correct, quiz_total, last_viewed_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nanoid(), userId, nodeId, status, quizCorrect, quizTotal,
      now, status === 'completed' ? now : null,
    );
  }
  if (shouldRecordCompletion) {
    void recordLearningEvent({
      userId,
      module: 'grammar',
      eventType: 'course_complete',
      score: quizTotal > 0 ? Math.round((Number(quizCorrect) / Number(quizTotal)) * 100) : null,
      metadata: { nodeId },
    });
    try {
      await completeOpenModuleAssignmentsForStudent({
        studentId: userId,
        moduleTypes: ['grammar-courses'],
        source: { module: 'grammar', nodeId, status },
      });
    } catch (error) {
      // Core progress is already persisted; a downstream assignment-completion
      // failure must not surface as a save failure to the student.
      logError('grammar_course_assignment_complete_failed', {
        message: error.message,
        userId,
        nodeId,
      });
    }
  }
}
