/* eslint-disable complexity */
import { recordLearningEvent } from './learningEventService.js';
import { completeOpenModuleAssignmentsForStudent } from './moduleAssignmentService.js';
import db from '../db/database.js';
import { nanoid } from '../utils/nanoid.js';

const ACTIVITY_TYPES = new Set(['conversation', 'opinion', 'story', 'description', 'discussion', 'reading_aloud']);
const ACTIVITY_MODULE_TYPES = {
  conversation: ['speaking'],
  opinion: ['speaking'],
  story: ['speaking'],
  description: ['speaking'],
  discussion: ['speaking'],
  reading_aloud: ['speaking'],
};
const MIN_TRANSCRIPT_WORDS = 5;

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeActivityType(value) {
  const activityType = String(value || '').trim();
  if (!ACTIVITY_TYPES.has(activityType)) throw validationError('不支持的口语活动类型');
  return activityType;
}

function normalizeScore(value) {
  if (value == null || value === '') return null;
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, score));
}

function normalizeDuration(value) {
  if (value == null || value === '') return null;
  const durationMs = Number(value);
  if (!Number.isFinite(durationMs) || durationMs < 0) return null;
  return Math.min(Math.round(durationMs), 24 * 60 * 60 * 1000);
}

function normalizeText(value, maxLength = 8000) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : '';
}

function countEnglishWords(text) {
  return String(text || '').toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)?.length || 0;
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
    durationMs: 0,
    lastPracticedAt: null,
    byActivity: [],
    recent: [],
  };
}

export async function getSpeakingProgressStatsByUserIds(userIds = []) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};

  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT
      user_id,
      COUNT(*) AS sessions,
      SUM(duration_ms) AS duration_ms,
      AVG(score) AS average_score,
      MAX(created_at) AS last_practiced_at
    FROM speaking_progress_records
    WHERE user_id IN (${placeholders})
    GROUP BY user_id
  `).all(...ids);

  const stats = {};
  ids.forEach((id) => {
    stats[id] = { sessions: 0, durationMs: 0, averageScore: 0, lastPracticedAt: null };
  });
  (rows || []).forEach((row) => {
    stats[row.user_id] = {
      sessions: Number(row.sessions || 0),
      durationMs: Number(row.duration_ms || 0),
      averageScore: row.average_score != null ? Math.round(Number(row.average_score)) : 0,
      lastPracticedAt: row.last_practiced_at != null ? Number(row.last_practiced_at) : null,
    };
  });
  return stats;
}

export async function getSpeakingPracticeQuestions({ limit = 20, systemId = '' } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const where = ["COALESCE(q.status, 'active') = 'active'"];
  const params = [];
  const normalizedSystemId = String(systemId || '').trim();
  if (normalizedSystemId) {
    where.push("(q.system_id = ? OR q.system_id IS NULL OR q.system_id = '')");
    params.push(normalizedSystemId);
  }
  const rows = await db.prepare(`
    SELECT
      q.id,
      q.system_id,
      q.question_type,
      q.content,
      q.estimated_time,
      q.score,
      sq.prompt,
      sq.sample_answer,
      sq.scoring_rubric,
      sq.prep_time,
      sq.response_time
    FROM speaking_questions sq
    JOIN questions q ON q.id = sq.question_id
    WHERE ${where.join(' AND ')}
    ORDER BY q.created_at DESC
    LIMIT ?
  `).all(...params, safeLimit);

  return (rows || []).map((row) => ({
    id: row.id,
    type: row.question_type || 'opinion',
    prompt: row.prompt || row.content || '',
    sampleAnswer: row.sample_answer || '',
    scoringRubric: parseJsonField(row.scoring_rubric, null),
    prepTime: row.prep_time != null ? Number(row.prep_time) : null,
    responseTime: row.response_time != null ? Number(row.response_time) : row.estimated_time,
    score: row.score != null ? Number(row.score) : null,
    systemId: row.system_id || '',
  })).filter((item) => item.prompt);
}

export async function saveSpeakingProgressRecord({
  userId,
  activityType,
  questionId = null,
  transcript = '',
  score = null,
  durationMs = null,
  feedback = '',
  metadata = null,
}) {
  if (!userId) throw validationError('缺少用户');

  const normalizedActivityType = normalizeActivityType(activityType);
  const normalizedScore = normalizeScore(score);
  const normalizedDurationMs = normalizeDuration(durationMs);
  const normalizedTranscript = normalizeText(transcript);
  if (!normalizedTranscript) throw validationError('请先完成口语回答');
  if (countEnglishWords(normalizedTranscript) < MIN_TRANSCRIPT_WORDS) throw validationError('口语回答太短');
  const normalizedFeedback = normalizeText(feedback, 2000);
  const id = nanoid();
  const createdAt = Date.now();

  await db.prepare(`
    INSERT INTO speaking_progress_records
      (id, user_id, question_id, activity_type, transcript, score, duration_ms, feedback, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    questionId || null,
    normalizedActivityType,
    normalizedTranscript,
    normalizedScore,
    normalizedDurationMs,
    normalizedFeedback,
    normalizeMetadata(metadata),
    createdAt,
  );

  void recordLearningEvent({
    userId,
    module: 'speaking',
    eventType: 'practice_complete',
    score: normalizedScore,
    durationMs: normalizedDurationMs,
    metadata: {
      activityType: normalizedActivityType,
      questionId: questionId || null,
    },
  });

  try {
    await completeOpenModuleAssignmentsForStudent({
      studentId: userId,
      moduleTypes: ACTIVITY_MODULE_TYPES[normalizedActivityType] || ['speaking'],
      source: {
        module: 'speaking',
        activityType: normalizedActivityType,
        progressRecordId: id,
        questionId: questionId || null,
        score: normalizedScore,
      },
    });
  } catch {
    // Keep progress capture independent from task backfill.
  }

  return {
    id,
    questionId: questionId || null,
    activityType: normalizedActivityType,
    score: normalizedScore,
    durationMs: normalizedDurationMs,
    createdAt,
  };
}

export async function getSpeakingProgressStats(userId) {
  if (!userId) return buildDefaultStats();

  const totals = await db.prepare(`
    SELECT
      COUNT(*) AS sessions,
      AVG(score) AS average_score,
      SUM(duration_ms) AS duration_ms,
      MAX(created_at) AS last_practiced_at
    FROM speaking_progress_records
    WHERE user_id = ?
  `).get(userId);

  const byActivity = await db.prepare(`
    SELECT
      activity_type,
      COUNT(*) AS sessions,
      AVG(score) AS average_score,
      MAX(created_at) AS last_practiced_at
    FROM speaking_progress_records
    WHERE user_id = ?
    GROUP BY activity_type
    ORDER BY last_practiced_at DESC
    LIMIT 20
  `).all(userId);

  const recentRows = await db.prepare(`
    SELECT id, question_id, activity_type, transcript, score, duration_ms, feedback, metadata_json, created_at
    FROM speaking_progress_records
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).all(userId);

  return {
    sessions: Number(totals?.sessions || 0),
    averageScore: totals?.average_score != null ? Math.round(Number(totals.average_score)) : 0,
    durationMs: Number(totals?.duration_ms || 0),
    lastPracticedAt: totals?.last_practiced_at != null ? Number(totals.last_practiced_at) : null,
    byActivity: (byActivity || []).map((row) => ({
      activityType: row.activity_type,
      sessions: Number(row.sessions || 0),
      averageScore: row.average_score != null ? Math.round(Number(row.average_score)) : 0,
      lastPracticedAt: row.last_practiced_at != null ? Number(row.last_practiced_at) : null,
    })),
    recent: (recentRows || []).map((row) => ({
      id: row.id,
      questionId: row.question_id || null,
      activityType: row.activity_type,
      transcript: row.transcript || '',
      score: row.score != null ? Number(row.score) : null,
      durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
      feedback: row.feedback || '',
      metadata: parseJsonField(row.metadata_json, null),
      createdAt: Number(row.created_at),
    })),
  };
}
