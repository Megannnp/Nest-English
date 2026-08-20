import {
  READING_GENRES,
  READING_PASSAGE_BANK,
  READING_QUESTION_TYPES,
  getPassagesByCount,
  getQuestionsByType,
} from '../../../shared/reading/readingPassageBank.js';
import db from '../../db/database.js';
import { nanoid } from '../../utils/nanoid.js';
import { recordLearningEvent } from '../learningEventService.js';

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function cleanLimit(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export function listReadingPracticeCatalog() {
  return {
    genres: READING_GENRES,
    questionTypes: READING_QUESTION_TYPES,
    passages: READING_PASSAGE_BANK.map((passage) => ({
      id: passage.id,
      year: passage.year,
      paper: passage.paper,
      genre: passage.genre,
      source: passage.source,
      questionCount: passage.questions.length,
    })),
  };
}

export function getReadingPracticePassages({ genre = '随机', count = 100, systemId = '' } = {}) {
  void systemId;
  const limit = cleanLimit(count, 100, 200);
  return getPassagesByCount(genre, limit);
}

export function getReadingPracticeQuestions({ type = '随机', count = 100, systemId = '' } = {}) {
  void systemId;
  const limit = cleanLimit(count, 100, 800);
  return shuffle(getQuestionsByType(type)).slice(0, limit);
}

function normalizeAnswerItem(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    passageId: String(item.passageId || '').slice(0, 80),
    questionIndex: Number(item.questionIndex) || null,
    questionType: String(item.questionType || '').slice(0, 32),
    selected: String(item.selected || '').slice(0, 8),
    answer: String(item.answer || '').slice(0, 8),
    correct: Boolean(item.correct),
  };
}

function normalizeWrongItem(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    passageId: String(item.passageId || '').slice(0, 80),
    source: String(item.source || '').slice(0, 180),
    questionIndex: Number(item.questionIndex) || null,
    questionType: String(item.questionType || '').slice(0, 32),
    stem: String(item.stem || '').slice(0, 500),
    selected: String(item.selected || '').slice(0, 8),
    answer: String(item.answer || '').slice(0, 8),
  };
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeMode(mode) {
  const normalizedMode = String(mode || '').trim();
  if (!['passage', 'drill', 'review', 'paper', 'quiz'].includes(normalizedMode)) {
    throw validationError('不支持的阅读练习模式');
  }
  return normalizedMode;
}

function normalizeTotalCount(totalCount) {
  const total = Number(totalCount);
  if (!Number.isFinite(total) || total <= 0) {
    throw validationError('缺少有效题目数量');
  }
  return total;
}

function normalizeStringOrNull(value, maxLength) {
  return value ? String(value).slice(0, maxLength) : null;
}

function normalizeDurationMs(durationMs) {
  return durationMs != null ? Number(durationMs) || null : null;
}

function normalizePassageIds(passageIds) {
  if (!Array.isArray(passageIds)) return [];
  return passageIds.map((item) => String(item || '').slice(0, 80)).filter(Boolean);
}

export async function saveReadingPracticeRecord({
  userId,
  mode,
  genre = null,
  questionType = null,
  passageIds = [],
  correctCount,
  totalCount,
  answers = [],
  wrongItems = [],
  durationMs = null,
  prepExamId = '',
  systemId = '',
}) {
  const normalizedMode = normalizeMode(mode);
  const total = normalizeTotalCount(totalCount);
  const correct = Math.max(0, Math.min(Number(correctCount) || 0, total));
  const score = Math.round((correct / total) * 100);
  const id = nanoid();
  const normalizedAnswers = answers.map(normalizeAnswerItem).filter(Boolean);
  const normalizedWrongItems = wrongItems.map(normalizeWrongItem).filter(Boolean);
  const normalizedPassageIds = normalizePassageIds(passageIds);
  const normalizedDurationMs = normalizeDurationMs(durationMs);

  await db.prepare(`
    INSERT INTO reading_practice_records
      (id, user_id, mode, genre, question_type, passage_ids, correct_count, total_count, score, answers_json, wrong_items_json, duration_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    normalizedMode,
    normalizeStringOrNull(genre, 32),
    normalizeStringOrNull(questionType, 32),
    normalizedPassageIds.length ? JSON.stringify(normalizedPassageIds) : null,
    correct,
    total,
    score,
    normalizedAnswers.length ? JSON.stringify(normalizedAnswers) : null,
    normalizedWrongItems.length ? JSON.stringify(normalizedWrongItems) : null,
    normalizedDurationMs,
    Date.now(),
  );

  void recordLearningEvent({
    userId,
    module: 'reading',
    eventType: 'practice_complete',
    score,
    durationMs: normalizedDurationMs,
    metadata: {
      mode: normalizedMode,
      genre,
      questionType,
      correctCount: correct,
      totalCount: total,
      wrongCount: normalizedWrongItems.length,
      prepExamId,
      systemId,
    },
  });

  return { id, score };
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function getReadingPracticeStats(userId) {
  const totals = await db.prepare(`
    SELECT
      COUNT(*) AS sessions,
      SUM(total_count) AS total_questions,
      SUM(correct_count) AS correct_questions,
      SUM(JSON_LENGTH(passage_ids)) AS passages,
      SUM(JSON_LENGTH(wrong_items_json)) AS wrong_count
    FROM reading_practice_records
    WHERE user_id = ?
  `).get(userId);

  const byType = await db.prepare(`
    SELECT
      COALESCE(question_type, '整篇练习') AS question_type,
      SUM(total_count) AS total,
      SUM(correct_count) AS correct,
      COUNT(*) AS sessions,
      MAX(created_at) AS last_practiced_at
    FROM reading_practice_records
    WHERE user_id = ?
    GROUP BY COALESCE(question_type, '整篇练习')
    ORDER BY last_practiced_at DESC
    LIMIT 20
  `).all(userId);

  const byGenre = await db.prepare(`
    SELECT
      COALESCE(genre, '专项练习') AS genre,
      SUM(total_count) AS total,
      SUM(correct_count) AS correct,
      COUNT(*) AS sessions,
      MAX(created_at) AS last_practiced_at
    FROM reading_practice_records
    WHERE user_id = ?
    GROUP BY COALESCE(genre, '专项练习')
    ORDER BY last_practiced_at DESC
    LIMIT 20
  `).all(userId);

  const recentRows = await db.prepare(`
    SELECT id, mode, genre, question_type, correct_count, total_count, score, wrong_items_json, created_at
    FROM reading_practice_records
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).all(userId);

  const totalQuestions = Number(totals?.total_questions || 0);
  const correctQuestions = Number(totals?.correct_questions || 0);

  return {
    sessions: Number(totals?.sessions || 0),
    passages: Number(totals?.passages || 0),
    totalQuestions,
    correctQuestions,
    accuracy: totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0,
    wrongQuestions: Number(totals?.wrong_count || 0),
    byType: (byType || []).map((row) => {
      const total = Number(row.total || 0);
      const correct = Number(row.correct || 0);
      return {
        questionType: row.question_type,
        total,
        correct,
        sessions: Number(row.sessions || 0),
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    }),
    byGenre: (byGenre || []).map((row) => {
      const total = Number(row.total || 0);
      const correct = Number(row.correct || 0);
      return {
        genre: row.genre,
        total,
        correct,
        sessions: Number(row.sessions || 0),
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    }),
    recent: (recentRows || []).map((row) => ({
      id: row.id,
      mode: row.mode,
      genre: row.genre,
      questionType: row.question_type,
      correctCount: Number(row.correct_count || 0),
      totalCount: Number(row.total_count || 0),
      score: row.score != null ? Number(row.score) : null,
      wrongItems: parseJsonField(row.wrong_items_json, []),
      createdAt: Number(row.created_at),
    })),
  };
}

export async function getReadingPracticeStatsByUserIds(userIds = []) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};

  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT
      user_id,
      COUNT(*) AS sessions,
      SUM(total_count) AS total_questions,
      SUM(correct_count) AS correct_questions,
      SUM(JSON_LENGTH(passage_ids)) AS passages,
      SUM(JSON_LENGTH(wrong_items_json)) AS wrong_count,
      MAX(created_at) AS last_practiced_at
    FROM reading_practice_records
    WHERE user_id IN (${placeholders})
    GROUP BY user_id
  `).all(...ids);

  const stats = {};
  ids.forEach((id) => {
    stats[id] = {
      sessions: 0,
      passages: 0,
      totalQuestions: 0,
      correctQuestions: 0,
      accuracy: 0,
      wrongQuestions: 0,
      lastPracticedAt: null,
    };
  });

  (rows || []).forEach((row) => {
    const totalQuestions = Number(row.total_questions || 0);
    const correctQuestions = Number(row.correct_questions || 0);
    stats[row.user_id] = {
      sessions: Number(row.sessions || 0),
      passages: Number(row.passages || 0),
      totalQuestions,
      correctQuestions,
      accuracy: totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0,
      wrongQuestions: Number(row.wrong_count || 0),
      lastPracticedAt: row.last_practiced_at != null ? Number(row.last_practiced_at) : null,
    };
  });

  return stats;
}
