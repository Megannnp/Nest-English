import { recordLearningEvent } from './learningEventService.js';
import { resolveListeningScenarioById } from './listeningContentService.js';
import { completeOpenModuleAssignmentsForStudent } from './moduleAssignmentService.js';
import {
  LISTENING_MINIMAL_PAIRS,
  LISTENING_PASSAGES,
  LISTENING_SENTENCE_ITEMS,
  LISTENING_WORD_ITEMS,
} from '../../shared/listening/listeningContentCatalog.js';
import db from '../db/database.js';
import { nanoid } from '../utils/nanoid.js';

const ACTIVITY_TYPES = new Set([
  'basics-pair',
  'basics-word',
  'basics-sentence',
  'advanced-sentence',
  'practice',
  'practice-dictation',
]);

const ACTIVITY_MODULE_TYPES = {
  'basics-pair': ['listening-basics'],
  'basics-word': ['listening-basics'],
  'basics-sentence': ['listening-basics'],
  'advanced-sentence': ['listening-advanced'],
  practice: ['listening'],
  'practice-dictation': ['listening'],
};

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function rateLimitError(message) {
  const error = new Error(message);
  error.status = 429;
  return error;
}

function normalizeActivityType(value) {
  const activityType = String(value || '').trim();
  if (!ACTIVITY_TYPES.has(activityType)) {
    throw validationError('不支持的听读活动类型');
  }
  return activityType;
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

function mapDuplicateProgressRecord(row) {
  return {
    id: row.id,
    activityType: row.activity_type,
    score: row.score != null ? Number(row.score) : null,
    accuracy: row.accuracy != null ? Number(row.accuracy) : null,
    durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
    createdAt: Number(row.created_at),
    deduped: true,
  };
}

function normalizeAnswerText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[.,!?'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchScore(isCorrect) {
  return { score: isCorrect ? 100 : 0, accuracy: isCorrect ? 100 : 0 };
}

// Catalog lookups let the server answer from its own copy of the content
// instead of the answer text the request happened to carry.
function resolveCatalogPair(pair) {
  if (!Array.isArray(pair) || pair.length !== 2) return null;
  const [first, second] = pair.map(normalizeAnswerText);
  return LISTENING_MINIMAL_PAIRS.find((item) => {
    const [a, b] = item.pair.map(normalizeAnswerText);
    return (a === first && b === second) || (a === second && b === first);
  }) || null;
}

// Which of the two words was played is decided in the browser, so the server
// cannot confirm it. It can still reject invented items: the pair must exist in
// the catalog and both words must belong to it.
function scorePair(metadata) {
  if (metadata.selected == null || metadata.answer == null) return matchScore(false);
  const known = resolveCatalogPair(metadata.pair);
  if (!known) return matchScore(false);
  const words = known.pair.map(normalizeAnswerText);
  const answer = normalizeAnswerText(metadata.answer);
  const selected = normalizeAnswerText(metadata.selected);
  if (!words.includes(answer) || !words.includes(selected)) return matchScore(false);
  return matchScore(selected === answer);
}

function resolveCatalogWord(word) {
  const target = normalizeAnswerText(word);
  const found = LISTENING_WORD_ITEMS.find((item) => normalizeAnswerText(item.word) === target);
  return found ? found.word : null;
}

function resolveCatalogSentence(text) {
  const target = normalizeAnswerText(text);
  const found = LISTENING_SENTENCE_ITEMS.find((item) => normalizeAnswerText(item.text) === target);
  return found ? found.text : null;
}

function resolvePassageSentence(passageId, sentenceIndex) {
  const passage = LISTENING_PASSAGES.find((item) => item.id === passageId);
  if (!passage) return null;
  const index = Number(sentenceIndex);
  if (!Number.isInteger(index) || index < 0 || index >= passage.sentences.length) return null;
  return passage.sentences[index];
}

// Items the server cannot verify — missing evidence, or an item that is not in
// the catalog — earn no credit instead of falling back to the reported score.
function scoreWord(metadata) {
  if (typeof metadata.input !== 'string' || typeof metadata.word !== 'string') return matchScore(false);
  const answer = resolveCatalogWord(metadata.word);
  if (!answer) return matchScore(false);
  return matchScore(normalizeAnswerText(metadata.input) === normalizeAnswerText(answer));
}

function scoreSentence(metadata) {
  if (typeof metadata.input !== 'string' || typeof metadata.text !== 'string') return matchScore(false);
  const answer = resolveCatalogSentence(metadata.text);
  if (!answer) return matchScore(false);
  return matchScore(normalizeAnswerText(metadata.input) === normalizeAnswerText(answer));
}

// Passage sentences are addressed by id + index, so the server answers entirely
// from its own catalog and ignores any text supplied by the client.
function scoreAdvancedSentence(metadata) {
  if (typeof metadata.input !== 'string') return matchScore(false);
  const answer = resolvePassageSentence(metadata.passageId, metadata.sentenceIndex);
  if (!answer) return matchScore(false);
  return matchScore(normalizeAnswerText(metadata.input) === normalizeAnswerText(answer));
}

function scoreTextDictation(metadata) {
  const answer = metadata.text ?? metadata.correctText ?? metadata.dictation;
  if (typeof metadata.input !== 'string' || typeof answer !== 'string') return null;
  return matchScore(normalizeAnswerText(metadata.input) === normalizeAnswerText(answer));
}

function scorePractice(metadata) {
  const { answers, answerKey } = metadata;
  if (!Array.isArray(answers) || !Array.isArray(answerKey) || answerKey.length === 0) return null;
  const correct = answerKey.reduce(
    (count, key, index) => count + (Number(answers[index]) === Number(key) ? 1 : 0),
    0,
  );
  const pct = Math.round((correct / answerKey.length) * 100);
  return { score: pct, accuracy: pct };
}

const AUTHORITATIVE_SCORERS = {
  'basics-pair': scorePair,
  'basics-word': scoreWord,
  'basics-sentence': scoreSentence,
  'advanced-sentence': scoreAdvancedSentence,
  'practice-dictation': scoreTextDictation,
  practice: scorePractice,
};

// Recompute the score on the server from the submitted answer so a client
// cannot simply post score:100. Returns null when the metadata does not carry
// enough information to judge, in which case the caller keeps the (clamped)
// client-reported value for backward compatibility.
function deriveAuthoritativeScore(activityType, metadata) {
  const scorer = AUTHORITATIVE_SCORERS[activityType];
  if (!scorer) return null;
  // Missing metadata is still handed to the scorer so that activities the
  // server knows how to verify cannot earn credit by simply omitting evidence.
  const payload = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
  return scorer(payload);
}

function scorePracticeAgainstScenario(scenario, answers) {
  const key = (scenario.questions || []).map((question) => question.answer);
  if (!key.length || !Array.isArray(answers)) return null;
  const correct = key.reduce(
    (count, answer, index) => count + (Number(answers[index]) === Number(answer) ? 1 : 0),
    0,
  );
  const pct = Math.round((correct / key.length) * 100);
  return { score: pct, accuracy: pct };
}

// Strongest check for practice activities: resolve the correct answer from the
// scenario id (question bank or static catalog) rather than trusting the key
// supplied in the request. Returns null when the scenario cannot be resolved,
// so the caller can fall back to the metadata-based scorer.
async function deriveScenarioScore(activityType, metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  if (activityType !== 'practice' && activityType !== 'practice-dictation') return null;

  let scenario = null;
  try {
    scenario = await resolveListeningScenarioById(metadata.scenarioId);
  } catch {
    return null;
  }
  if (!scenario) return null;

  if (activityType === 'practice') {
    return scorePracticeAgainstScenario(scenario, metadata.answers);
  }
  if (typeof metadata.input !== 'string' || typeof scenario.dictation !== 'string') return null;
  return matchScore(normalizeAnswerText(metadata.input) === normalizeAnswerText(scenario.dictation));
}

// The score is always the server's own: first from the scenario source, then
// from the evidence in the request. A submission that proves nothing scores 0,
// so a client-reported score is never accepted.
async function resolveRecordScore({ activityType, metadata }) {
  const derived =
    (await deriveScenarioScore(activityType, metadata)) ||
    deriveAuthoritativeScore(activityType, metadata);
  return derived || matchScore(false);
}

// `score`/`accuracy` may still arrive in the request body, but they are
// deliberately ignored: the server scores every record itself.
export async function saveListeningProgressRecord({
  userId,
  activityType,
  durationMs = null,
  metadata = null,
}) {
  if (!userId) throw validationError('缺少用户');

  const normalizedActivityType = normalizeActivityType(activityType);
  const { score: normalizedScore, accuracy: normalizedAccuracy } = await resolveRecordScore({
    activityType: normalizedActivityType,
    metadata,
  });
  const normalizedDurationMs = normalizeDuration(durationMs);
  const normalizedMetadata = normalizeMetadata(metadata);
  const duplicateWindowStart = Date.now() - 3000;
  const duplicate = await db.prepare(`
    SELECT id, activity_type, score, accuracy, duration_ms, created_at
    FROM listening_progress_records
    WHERE user_id = ?
      AND activity_type = ?
      AND created_at >= ?
      AND ((score IS NULL AND ? IS NULL) OR score = ?)
      AND ((accuracy IS NULL AND ? IS NULL) OR accuracy = ?)
      AND ((metadata_json IS NULL AND ? IS NULL) OR metadata_json = ?)
    ORDER BY created_at DESC
    LIMIT 1
  `).get(
    userId,
    normalizedActivityType,
    duplicateWindowStart,
    normalizedScore,
    normalizedScore,
    normalizedAccuracy,
    normalizedAccuracy,
    normalizedMetadata,
    normalizedMetadata,
  );
  if (duplicate) {
    return mapDuplicateProgressRecord(duplicate);
  }

  const recentCount = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM listening_progress_records
    WHERE user_id = ? AND created_at >= ?
  `).get(userId, Date.now() - 60 * 1000);
  if (Number(recentCount?.count || 0) >= 30) {
    throw rateLimitError('听读记录提交过于频繁，请稍后再试');
  }

  const id = nanoid();
  const createdAt = Date.now();

  await db.prepare(`
    INSERT INTO listening_progress_records
      (id, user_id, activity_type, score, accuracy, duration_ms, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    normalizedActivityType,
    normalizedScore,
    normalizedAccuracy,
    normalizedDurationMs,
    normalizedMetadata,
    createdAt,
  );

  void recordLearningEvent({
    userId,
    module: 'listening',
    eventType: 'practice_complete',
    score: normalizedScore,
    durationMs: normalizedDurationMs,
    metadata: {
      activityType: normalizedActivityType,
      accuracy: normalizedAccuracy,
    },
  });

  try {
    await completeOpenModuleAssignmentsForStudent({
      studentId: userId,
      moduleTypes: ACTIVITY_MODULE_TYPES[normalizedActivityType] || [],
      source: {
        module: 'listening',
        activityType: normalizedActivityType,
        progressRecordId: id,
        score: normalizedScore,
        accuracy: normalizedAccuracy,
      },
    });
  } catch {
    // Keep progress capture independent from task backfill.
  }

  return {
    id,
    activityType: normalizedActivityType,
    score: normalizedScore,
    accuracy: normalizedAccuracy,
    durationMs: normalizedDurationMs,
    createdAt,
  };
}

export async function getListeningClassProgress({ teacherId, classId }) {
  if (!teacherId || !classId) return [];

  const classRow = await db.prepare(`
    SELECT id
    FROM classes
    WHERE id = ? AND teacher_id = ?
    LIMIT 1
  `).get(classId, teacherId);
  if (!classRow) {
    const error = new Error('班级不存在或无权限查看');
    error.status = 404;
    throw error;
  }

  const rows = await db.prepare(`
    SELECT
      u.id,
      u.real_name,
      u.nick_name,
      u.student_no,
      COUNT(lpr.id) AS sessions,
      SUM(lpr.duration_ms) AS duration_ms,
      AVG(lpr.score) AS average_score,
      AVG(lpr.accuracy) AS average_accuracy,
      MAX(lpr.created_at) AS last_practiced_at
    FROM class_students cs
    JOIN users u ON u.id = cs.student_id
    LEFT JOIN listening_progress_records lpr ON lpr.user_id = cs.student_id
    WHERE cs.class_id = ?
    GROUP BY u.id, u.real_name, u.nick_name, u.student_no
    ORDER BY last_practiced_at DESC, u.student_no ASC, u.real_name ASC
  `).all(classId);

  return (rows || []).map((row) => ({
    id: row.id,
    realName: row.real_name || row.nick_name || '未命名',
    studentNo: row.student_no || '',
    listeningStats: {
      sessions: Number(row.sessions || 0),
      durationMs: Number(row.duration_ms || 0),
      averageScore: row.average_score != null ? Math.round(Number(row.average_score)) : 0,
      averageAccuracy: row.average_accuracy != null ? Math.round(Number(row.average_accuracy)) : 0,
      lastPracticedAt: row.last_practiced_at != null ? Number(row.last_practiced_at) : null,
    },
  }));
}

export async function getListeningProgressStats(userId) {
  if (!userId) return buildDefaultStats();

  const totals = await db.prepare(`
    SELECT
      COUNT(*) AS sessions,
      AVG(score) AS average_score,
      AVG(accuracy) AS average_accuracy,
      SUM(duration_ms) AS duration_ms,
      MAX(created_at) AS last_practiced_at
    FROM listening_progress_records
    WHERE user_id = ?
  `).get(userId);

  const byActivity = await db.prepare(`
    SELECT
      activity_type,
      COUNT(*) AS sessions,
      AVG(score) AS average_score,
      AVG(accuracy) AS average_accuracy,
      MAX(created_at) AS last_practiced_at
    FROM listening_progress_records
    WHERE user_id = ?
    GROUP BY activity_type
    ORDER BY last_practiced_at DESC
    LIMIT 20
  `).all(userId);

  const recentRows = await db.prepare(`
    SELECT id, activity_type, score, accuracy, duration_ms, metadata_json, created_at
    FROM listening_progress_records
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
