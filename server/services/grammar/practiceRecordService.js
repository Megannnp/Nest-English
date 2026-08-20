import { GRAMMAR_POINTS } from '../../../shared/grammar/grammarPointCatalog.js';
import db from '../../db/database.js';
import { ValidationError } from '../../utils/appError.js';
import { logError } from '../../utils/logger.js';
import { nanoid } from '../../utils/nanoid.js';
import { recordLearningEvent } from '../learningEventService.js';

const COURSE_NODE_BY_CATALOG_ID = {
  sentence_main_structure: 'by-trunk',
  sentence_elements: 'by-trunk',
  there_be: 'simple-sentence',
  relative_clause: 'attributive-clause',
  subject_clause: 'subject-clause',
  object_clause: 'object-clause',
  predicative_clause: 'predicative-clause',
  appositive_clause: 'appositive-clause',
  adverbial_time_clause: 'adverbial-clause',
  adverbial_condition_clause: 'adverbial-clause',
  adverbial_reason_clause: 'adverbial-clause',
  adverbial_concession_clause: 'adverbial-clause',
  adverbial_result_clause: 'adverbial-clause',
  adverbial_purpose_clause: 'adverbial-clause',
  adverbial_comparison_clause: 'adverbial-clause',
  adverbial_manner_clause: 'adverbial-clause',
  adverbial_place_clause: 'adverbial-clause',
  tense_present: 'verb',
  tense_past: 'verb',
  tense_future: 'verb',
  passive_voice: 'verb',
  modal_verbs: 'verb',
  subjunctive_mood: 'subjunctive-sentence',
  subject_verb_agreement: 'verb',
  verb_phrases: 'verb',
  nouns: 'noun',
  articles: 'article',
  pronouns: 'pronoun',
  determiners: 'noun',
  quantifiers: 'noun',
  adjectives: 'adjective',
  adverbs: 'adverb',
  comparison: 'adjective',
  prepositions: 'preposition',
  conjunctions: 'conjunction',
  infinitive: 'phrase-by-nonfinite',
  gerund: 'phrase-by-nonfinite',
  present_participle: 'phrase-by-nonfinite',
  past_participle: 'phrase-by-nonfinite',
  absolute_construction: 'phrase-by-nonfinite',
  inversion: 'inversion',
  emphasis: 'emphatic-sentence',
};

const COURSE_NODE_BY_GRAMMAR_POINT = GRAMMAR_POINTS.reduce((mapping, point) => {
  const nodeId = COURSE_NODE_BY_CATALOG_ID[point.id];
  if (!nodeId) return mapping;
  [point.label, ...(point.aliases || [])].forEach((name) => {
    mapping[String(name).trim()] = nodeId;
  });
  return mapping;
}, {
  简单句: 'simple-sentence',
  并列句: 'compound-sentence',
  状语从句: 'adverbial-clause',
  名词性从句: 'subject-clause',
  虚拟句: 'subjunctive-sentence',
  强调句: 'emphatic-sentence',
  倒装句: 'inversion',
  数词: 'numeral',
  感叹词: 'interjection',
  动词: 'verb',
});

async function runSql(connection, sql, params = []) {
  if (connection) {
    const [result] = await connection.query(sql, params);
    return {
      changes: result.affectedRows ?? 0,
      lastInsertRowid: result.insertId ?? null,
    };
  }
  return db.prepare(sql).run(...params);
}

async function queryOne(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.query(sql, params);
    return rows[0] || null;
  }
  return db.prepare(sql).get(...params);
}

function validateScoreCounts(correctCount, totalCount) {
  const correct = Number(correctCount);
  const total = Number(totalCount);
  if (!Number.isInteger(correct) || correct < 0) {
    throw new ValidationError('答对题数不合法');
  }
  if (!Number.isInteger(total) || total < 1) {
    throw new ValidationError('总题数不合法');
  }
  if (correct > total) {
    throw new ValidationError('答对题数不能大于总题数');
  }
}

function resolveCourseNodeId(grammarPoint) {
  const normalized = String(grammarPoint || '').trim();
  return COURSE_NODE_BY_GRAMMAR_POINT[normalized] || null;
}

async function markCourseNodeCompleted({ userId, grammarPoint, correctCount, totalCount, connection }) {
  const nodeId = resolveCourseNodeId(grammarPoint);
  if (!nodeId) return null;

  const now = Date.now();
  const existing = await queryOne(
    connection,
    'SELECT id, completed_at FROM grammar_course_progress WHERE user_id = ? AND node_id = ?',
    [userId, nodeId]
  );

  if (existing) {
    await runSql(connection, `
      UPDATE grammar_course_progress
      SET status = 'completed', quiz_correct = ?, quiz_total = ?, last_viewed_at = ?, completed_at = COALESCE(completed_at, ?)
      WHERE user_id = ? AND node_id = ?
    `, [correctCount, totalCount, now, now, userId, nodeId]);
  } else {
    await runSql(connection, `
      INSERT INTO grammar_course_progress
        (id, user_id, node_id, status, quiz_correct, quiz_total, last_viewed_at, completed_at)
      VALUES (?, ?, ?, 'completed', ?, ?, ?, ?)
    `, [nanoid(), userId, nodeId, correctCount, totalCount, now, now]);
  }

  return nodeId;
}

export async function savePracticeRecord({
  userId,
  grammarPoint,
  quizType,
  stage,
  difficulty,
  correctCount,
  totalCount,
  prepExamId = '',
  systemId = '',
  connection = null,
}) {
  validateScoreCounts(correctCount, totalCount);

  const id = nanoid();
  await runSql(connection, `
    INSERT INTO grammar_practice_records
      (id, user_id, grammar_point, quiz_type, stage, difficulty, correct_count, total_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, userId, grammarPoint, quizType, stage, difficulty, correctCount, totalCount, Date.now()]);
  let courseNodeId = null;
  try {
    courseNodeId = await markCourseNodeCompleted({
      userId,
      grammarPoint,
      correctCount,
      totalCount,
      connection,
    });
  } catch (error) {
    logError('grammar_course_progress_link_failed', {
      message: error.message,
      userId,
      grammarPoint,
    });
  }

  // Fire-and-forget cross-module event — never awaited, failures are swallowed.
  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : null;
  void recordLearningEvent({
    userId,
    module: 'grammar',
    eventType: 'quiz_complete',
    score: scorePercent,
    metadata: { grammarPoint, quizType, stage, difficulty, correctCount, totalCount, courseNodeId, prepExamId, systemId },
  });

  return { id, courseNodeId };
}

export async function getClassPracticeStats(userIds) {
  if (!userIds || !userIds.length) return {};
  const placeholders = userIds.map(() => '?').join(', ');
  const rows = await db.prepare(`
    SELECT
      user_id,
      COUNT(*)            AS sessions,
      SUM(total_count)    AS total_questions,
      SUM(correct_count)  AS correct_questions,
      COUNT(DISTINCT grammar_point) AS distinct_points
    FROM grammar_practice_records
    WHERE user_id IN (${placeholders})
    GROUP BY user_id
  `).all(...userIds);

  const result = {};
  for (const r of rows) {
    result[r.user_id] = {
      sessions: Number(r.sessions || 0),
      totalQuestions: Number(r.total_questions || 0),
      correctQuestions: Number(r.correct_questions || 0),
      distinctPoints: Number(r.distinct_points || 0),
    };
  }
  return result;
}

export async function getPracticeStats(userId) {
  const totals = await db.prepare(`
    SELECT
      COUNT(*)            AS sessions,
      SUM(total_count)    AS total_questions,
      SUM(correct_count)  AS correct_questions
    FROM grammar_practice_records
    WHERE user_id = ?
  `).get(userId);

  const byPoint = await db.prepare(`
    SELECT
      grammar_point,
      SUM(total_count)   AS total,
      SUM(correct_count) AS correct,
      COUNT(*)           AS sessions,
      MAX(created_at)    AS last_practiced_at
    FROM grammar_practice_records
    WHERE user_id = ?
    GROUP BY grammar_point
    ORDER BY last_practiced_at DESC
    LIMIT 20
  `).all(userId);

  return {
    sessions:          Number(totals?.sessions || 0),
    totalQuestions:    Number(totals?.total_questions || 0),
    correctQuestions:  Number(totals?.correct_questions || 0),
    byPoint: (byPoint || []).map((r) => ({
      grammarPoint: r.grammar_point,
      total:        Number(r.total),
      correct:      Number(r.correct),
      sessions:     Number(r.sessions),
    })),
  };
}
