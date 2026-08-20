import { recordLearningEvent } from './learningEventService.js';
import db from '../db/database.js';
import { nanoid } from '../utils/nanoid.js';

const ACTIVITY_TYPES = new Set([
  'flashcard',
  'quiz',
]);

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeActivityType(value) {
  const activityType = String(value || '').trim();
  if (!ACTIVITY_TYPES.has(activityType)) {
    throw validationError('不支持的词汇活动类型');
  }
  return activityType;
}

function normalizeScore(value) {
  if (value == null || value === '') return null;
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, score));
}

function normalizeAccuracy(value) {
  if (value == null || value === '') return null;
  const accuracy = Number(value);
  if (!Number.isFinite(accuracy)) return null;
  return Math.max(0, Math.min(100, Math.round(accuracy)));
}

function normalizeDuration(value) {
  if (value == null || value === '') return null;
  const durationMs = Number(value);
  if (!Number.isFinite(durationMs) || durationMs < 0) return null;
  return Math.min(Math.round(durationMs), 24 * 60 * 60 * 1000);
}

function normalizeMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const json = JSON.stringify(value);
  return json.length > 4000 ? null : json;
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildDefaultStats() {
  return {
    sessions: 0,
    averageScore: 0,
    averageAccuracy: 0,
    durationMs: 0,
    lastPracticedAt: null,
    byActivity: [],
    recent: [],
  };
}

export async function saveVocabularyProgressRecord({
  userId,
  activityType,
  score = null,
  accuracy = null,
  durationMs = null,
  metadata = null,
}) {
  if (!userId) throw validationError('缺少用户');

  const normalizedActivityType = normalizeActivityType(activityType);
  const normalizedScore = normalizeScore(score);
  const normalizedAccuracy = normalizeAccuracy(accuracy ?? normalizedScore);
  const normalizedDurationMs = normalizeDuration(durationMs);
  const id = nanoid();
  const createdAt = Date.now();

  await db.prepare(`
    INSERT INTO vocabulary_progress_records
      (id, user_id, activity_type, score, accuracy, duration_ms, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    normalizedActivityType,
    normalizedScore,
    normalizedAccuracy,
    normalizedDurationMs,
    normalizeMetadata(metadata),
    createdAt,
  );

  void recordLearningEvent({
    userId,
    module: 'vocabulary',
    eventType: 'practice_complete',
    score: normalizedScore,
    durationMs: normalizedDurationMs,
    metadata: {
      activityType: normalizedActivityType,
      accuracy: normalizedAccuracy,
    },
  });

  return {
    id,
    activityType: normalizedActivityType,
    score: normalizedScore,
    accuracy: normalizedAccuracy,
    durationMs: normalizedDurationMs,
    createdAt,
  };
}

export async function getVocabularyClassStats(userIds) {
  if (!userIds || !userIds.length) return {};
  const placeholders = userIds.map(() => '?').join(', ');
  const rows = await db.prepare(`
    SELECT
      user_id,
      COUNT(*) AS sessions,
      AVG(score) AS average_score,
      AVG(accuracy) AS average_accuracy,
      MAX(created_at) AS last_practiced_at
    FROM vocabulary_progress_records
    WHERE user_id IN (${placeholders})
    GROUP BY user_id
  `).all(...userIds);

  const result = {};
  for (const row of rows) {
    result[row.user_id] = {
      sessions: Number(row.sessions || 0),
      averageScore: row.average_score != null ? Math.round(Number(row.average_score)) : 0,
      averageAccuracy: row.average_accuracy != null ? Math.round(Number(row.average_accuracy)) : 0,
      lastPracticedAt: row.last_practiced_at != null ? Number(row.last_practiced_at) : null,
    };
  }
  return result;
}

export async function getVocabularyProgressStats(userId) {
  if (!userId) return buildDefaultStats();

  const totals = await db.prepare(`
    SELECT
      COUNT(*) AS sessions,
      AVG(score) AS average_score,
      AVG(accuracy) AS average_accuracy,
      SUM(duration_ms) AS duration_ms,
      MAX(created_at) AS last_practiced_at
    FROM vocabulary_progress_records
    WHERE user_id = ?
  `).get(userId);

  const byActivity = await db.prepare(`
    SELECT
      activity_type,
      COUNT(*) AS sessions,
      AVG(score) AS average_score,
      AVG(accuracy) AS average_accuracy,
      MAX(created_at) AS last_practiced_at
    FROM vocabulary_progress_records
    WHERE user_id = ?
    GROUP BY activity_type
    ORDER BY last_practiced_at DESC
    LIMIT 20
  `).all(userId);

  const recentRows = await db.prepare(`
    SELECT id, activity_type, score, accuracy, duration_ms, metadata_json, created_at
    FROM vocabulary_progress_records
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).all(userId);

  return {
    sessions: Number(totals?.sessions || 0),
    averageScore: totals?.average_score != null ? Math.round(Number(totals.average_score)) : 0,
    averageAccuracy: totals?.average_accuracy != null ? Math.round(Number(totals.average_accuracy)) : 0,
    durationMs: Number(totals?.duration_ms || 0),
    lastPracticedAt: totals?.last_practiced_at != null ? Number(totals.last_practiced_at) : null,
    byActivity: (byActivity || []).map((row) => ({
      activityType: row.activity_type,
      sessions: Number(row.sessions || 0),
      averageScore: row.average_score != null ? Math.round(Number(row.average_score)) : 0,
      averageAccuracy: row.average_accuracy != null ? Math.round(Number(row.average_accuracy)) : 0,
      lastPracticedAt: row.last_practiced_at != null ? Number(row.last_practiced_at) : null,
    })),
    recent: (recentRows || []).map((row) => ({
      id: row.id,
      activityType: row.activity_type,
      score: row.score != null ? Number(row.score) : null,
      accuracy: row.accuracy != null ? Number(row.accuracy) : null,
      durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
      metadata: parseJsonField(row.metadata_json, null),
      createdAt: Number(row.created_at),
    })),
  };
}
