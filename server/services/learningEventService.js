/**
 * learningEventService — cross-module learning activity log
 *
 * Writes a single row to `learning_events` whenever a meaningful learning
 * action completes in any module.  Always call with `void` — callers must
 * never await this; failures are silently swallowed so they never affect
 * the primary request flow.
 *
 * Usage:
 *   void recordLearningEvent({ userId, module: 'grammar', eventType: 'quiz_complete',
 *                              score: 80, metadata: { grammarPoint: '定语从句' } });
 */
import { awardPointsForLearningEvent } from './pointsService.js';
import db from '../db/database.js';
import { normalizeLearningModule } from '../utils/learningModules.js';
import { logError } from '../utils/logger.js';
import { nanoid } from '../utils/nanoid.js';

/**
 * @param {{ userId: string, module: string, eventType: string,
 *           score?: number|null, durationMs?: number|null, metadata?: object|null }} params
 */
export async function recordLearningEvent({ userId, module: mod, eventType, score = null, durationMs = null, metadata = null }) {
  try {
    const id = nanoid();
    const normalizedModule = normalizeLearningModule(mod);
    await db.prepare(`
      INSERT INTO learning_events
        (id, user_id, module, event_type, score, duration_ms, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      normalizedModule,
      eventType,
      score !== null && score !== undefined ? Number(score) : null,
      durationMs !== null && durationMs !== undefined ? Number(durationMs) : null,
      metadata ? JSON.stringify(metadata) : null,
      Date.now()
    );
    await awardPointsForLearningEvent({
      eventId: id,
      userId,
      module: normalizedModule,
      eventType,
      metadata,
    });
  } catch (err) {
    // Learning event failures must never surface to the caller.
    logError('learning_event_write_failed', { message: err.message, userId, mod, eventType });
  }
}

/**
 * Returns a flat list of recent events for a user, optionally filtered by module.
 * Useful for cross-module dashboards or admin queries.
 *
 * @param {{ userId: string, module?: string, limit?: number }} params
 */
export async function getRecentLearningEvents({ userId, module: mod, limit = 50 }) {
  const rows = mod
    ? await db.prepare(
        'SELECT * FROM learning_events WHERE user_id = ? AND module = ? ORDER BY created_at DESC LIMIT ?'
      ).all(userId, mod, limit)
    : await db.prepare(
        'SELECT * FROM learning_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
      ).all(userId, limit);

  return (rows || []).map((r) => {
    let metadata = null;
    try {
      metadata = r.metadata ? JSON.parse(r.metadata) : null;
    } catch {
      metadata = null;
    }
    return {
      id:         r.id,
      module:     normalizeLearningModule(r.module),
      eventType:  r.event_type,
      score:      r.score !== null ? Number(r.score) : null,
      durationMs: r.duration_ms !== null ? Number(r.duration_ms) : null,
      metadata,
      createdAt:  Number(r.created_at),
    };
  });
}

/**
 * Whether the user has ever completed a learning action in *any* module.
 *
 * Deliberately unfiltered by module: onboarding prompts are worded around one
 * module (e.g. writing), but a learner who has already practised reading is
 * not a new user, so the prompt should stay hidden for them too.
 *
 * @param {{ userId: string }} params
 * @returns {Promise<boolean>}
 */
export async function hasAnyLearningEvent({ userId }) {
  if (!userId) return false;

  const row = await db.prepare(
    'SELECT 1 AS found FROM learning_events WHERE user_id = ? LIMIT 1'
  ).get(userId);

  return !!row;
}
