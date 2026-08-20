import db from '../../db/database.js';
import { nanoid } from '../../utils/nanoid.js';
import { recordLearningEvent } from '../learningEventService.js';

export async function saveReadingAnalysisRecord({
  userId,
  passage,
  questions,
  result,
  entitlementLedgerId = null,
  sourceId = null,
}) {
  if (!userId) return null;

  const id = nanoid();
  const now = Date.now();
  await db.prepare(`
    INSERT INTO reading_analyses
      (id, user_id, passage_text, questions_text, result_json, status,
       entitlement_ledger_id, source_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    passage,
    questions || null,
    JSON.stringify(result || {}),
    'success',
    entitlementLedgerId,
    sourceId,
    now,
    now
  );

  void recordLearningEvent({
    userId,
    module: 'reading',
    eventType: 'analysis_complete',
    metadata: {
      analysisId: id,
      genre: result?.genre || null,
      questionCount: Array.isArray(result?.questions) ? result.questions.length : 0,
    },
  });

  return { id };
}

function parseResultSummary(raw) {
  try {
    const result = raw ? JSON.parse(raw) : {};
    return {
      genre: result.genre || null,
      mainIdea: result.mainIdea || '',
      questionCount: Array.isArray(result.questions) ? result.questions.length : 0,
    };
  } catch {
    return { genre: null, mainIdea: '', questionCount: 0 };
  }
}

function parseResult(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function getReadingAnalysisRecord({ userId, analysisId }) {
  const row = await db.prepare(`
    SELECT id, passage_text, questions_text, result_json, created_at
    FROM reading_analyses
    WHERE id = ? AND user_id = ? AND status = 'success'
  `).get(analysisId, userId);

  if (!row) return null;
  return {
    id: row.id,
    passage: row.passage_text || '',
    questions: row.questions_text || '',
    result: parseResult(row.result_json),
    createdAt: Number(row.created_at || 0),
  };
}

export async function getReadingAnalysisStats(userId) {
  const totals = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM reading_analyses
    WHERE user_id = ? AND status = 'success'
  `).get(userId);

  const recentRows = await db.prepare(`
    SELECT id, result_json, created_at
    FROM reading_analyses
    WHERE user_id = ? AND status = 'success'
    ORDER BY created_at DESC
    LIMIT 6
  `).all(userId);

  return {
    total: Number(totals?.total || 0),
    recent: (recentRows || []).map((row) => ({
      id: row.id,
      ...parseResultSummary(row.result_json),
      createdAt: Number(row.created_at || 0),
    })),
  };
}

export async function getReadingAnalysisStatsByUserIds(userIds = []) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};

  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT
      user_id,
      COUNT(*) AS total,
      MAX(created_at) AS last_analyzed_at
    FROM reading_analyses
    WHERE user_id IN (${placeholders}) AND status = 'success'
    GROUP BY user_id
  `).all(...ids);

  const stats = {};
  ids.forEach((id) => {
    stats[id] = { total: 0, lastAnalyzedAt: null };
  });

  (rows || []).forEach((row) => {
    stats[row.user_id] = {
      total: Number(row.total || 0),
      lastAnalyzedAt: row.last_analyzed_at != null ? Number(row.last_analyzed_at) : null,
    };
  });

  return stats;
}
