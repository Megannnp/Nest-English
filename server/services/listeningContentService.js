import {
  LISTENING_MINIMAL_PAIRS as minimalPairs,
  LISTENING_WORD_ITEMS as wordItems,
  LISTENING_SENTENCE_ITEMS as sentenceItems,
  LISTENING_PASSAGES as passages,
  LISTENING_SCENARIOS_BY_STAGE as fallbackScenariosByStage,
} from '../../shared/listening/listeningContentCatalog.js';
import gaokaoListeningBank from '../data/question-import/gaokao-listening-bank.js';
import db from '../db/database.js';

// 高考听力真题 → 静态场景（transcript 为空时题目仍可作答，原文待补充）。
function buildGaokaoScenarios() {
  const scenarios = [];
  for (const paper of gaokaoListeningBank.papers || []) {
    const topicBase = paper.sourceLabel || `${paper.year} ${paper.region}${paper.paper} 听力`;
    for (const [index, q] of (paper.questions || []).entries()) {
      const scenario = mapGaokaoQuestionToScenario(paper, q, index, topicBase);
      if (scenario) scenarios.push(scenario);
    }
  }
  return scenarios;
}

function mapGaokaoQuestionToScenario(paper, q, index, topicBase) {
  const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
  if (!q.stem || options.length < 2) return null;
  const answerIndex = 'ABC'.indexOf(String(q.answer || '').trim().toUpperCase());
  if (answerIndex < 0 || answerIndex >= options.length) return null;
  const transcript = String(q.transcript || '').trim();
  const paperCode = paper.paper.replace(/[^0-9A-Za-z]/g, '');
  // 试卷级 audioUrl：整卷一段真题录音（高考听力为连续录音），无则退回 TTS 朗读 transcript
  const audioUrl = String(paper.audioUrl || q.audioUrl || '').trim();
  return {
    id: `gk-l-${paper.year}-${paperCode}-${index + 1}`,
    stage: '高考真题',
    topic: `${topicBase} · 第${q.number}题`,
    audioUrl,
    dictationAudioUrl: '',
    audio: transcript,
    questions: [{ stem: q.stem, opts: options, answer: answerIndex }],
    dictation: transcript.split(/[.!?。！？]/).find(Boolean)?.trim() || q.stem,
  };
}

const gaokaoScenarios = buildGaokaoScenarios();

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeOptions(value) {
  const options = parseJsonField(value, []);
  if (!Array.isArray(options)) return [];
  return options
    .map((item) => (typeof item === 'string' ? item : item?.text || item?.label || item?.value || ''))
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function normalizeAnswerIndex(answer, options) {
  const raw = String(answer || '').trim();
  if (!raw) return null;
  const letterIndex = 'ABCD'.indexOf(raw.toUpperCase());
  if (letterIndex >= 0) return letterIndex < options.length ? letterIndex : null;
  const numericIndex = Number(raw);
  if (Number.isInteger(numericIndex)) {
    const index = numericIndex >= 1 ? numericIndex - 1 : numericIndex;
    return index >= 0 && index < options.length ? index : null;
  }
  const optionIndex = options.findIndex((item) => item.toLowerCase() === raw.toLowerCase());
  return optionIndex >= 0 ? optionIndex : null;
}

function mapQuestionBankScenario(row) {
  const options = normalizeOptions(row.options);
  const transcript = String(row.transcript || '').trim();
  const stem = String(row.stem || row.content || '').trim();
  // 允许 transcript 为空：题目（题干/选项/答案）仍可展示与作答，原文待补充。
  if (!stem || options.length < 2) return null;
  const answer = normalizeAnswerIndex(row.correct_answer || row.answer, options);
  if (answer == null) return null;
  return {
    id: `qb-${row.id}`,
    stage: '题库',
    topic: row.topic || stem.slice(0, 24),
    audio: transcript,
    audioUrl: row.audio_url || '',
    questions: [{
      stem,
      opts: options,
      answer,
    }],
    dictation: transcript.split(/[.!?。！？]/).find(Boolean)?.trim() || stem,
    dictationAudioUrl: '',
  };
}

async function getQuestionBankScenarios(systemId = '') {
  const where = ["COALESCE(q.status, 'active') = 'active'"];
  const params = [];
  const normalizedSystemId = String(systemId || '').trim();
  if (normalizedSystemId) {
    where.push("(q.system_id = ? OR q.system_id IS NULL OR q.system_id = '')");
    params.push(normalizedSystemId);
  }
  const rows = await db.prepare(`
    WITH linked_audio AS (
      SELECT qm.question_id, MIN(m.audio_url) AS audio_url
      FROM question_materials qm
      JOIN materials m ON m.id = qm.material_id
        AND COALESCE(m.status, 'active') = 'active'
        AND COALESCE(m.audio_url, '') <> ''
      WHERE qm.role = 'primary'
      GROUP BY qm.question_id
    )
    SELECT
      q.id,
      q.system_id,
      q.content,
      lq.stem,
      lq.options,
      lq.transcript,
      lq.correct_answer,
      COALESCE(primary_material.audio_url, linked_audio.audio_url, '') AS audio_url
    FROM listening_questions lq
    JOIN questions q ON q.id = lq.question_id
    LEFT JOIN materials primary_material ON primary_material.id = q.material_id
      AND COALESCE(primary_material.status, 'active') = 'active'
      AND COALESCE(primary_material.audio_url, '') <> ''
    LEFT JOIN linked_audio ON linked_audio.question_id = q.id
    WHERE ${where.join(' AND ')}
    ORDER BY q.created_at DESC
    LIMIT 20
  `).all(...params);
  return (rows || []).map(mapQuestionBankScenario).filter(Boolean);
}

function findStaticScenarioById(scenarioId) {
  const gaokaoFound = (gaokaoScenarios || []).find((scenario) => scenario.id === scenarioId);
  if (gaokaoFound) return gaokaoFound;
  for (const scenarios of Object.values(fallbackScenariosByStage)) {
    const found = (scenarios || []).find((scenario) => scenario.id === scenarioId);
    if (found) return found;
  }
  return null;
}

async function findQuestionBankScenarioById(scenarioId) {
  const questionId = scenarioId.slice(3);
  if (!questionId) return null;
  const row = await db.prepare(`
    SELECT q.id, q.content, lq.stem, lq.options, lq.transcript, lq.correct_answer
    FROM listening_questions lq
    JOIN questions q ON q.id = lq.question_id
    WHERE q.id = ? AND COALESCE(q.status, 'active') = 'active'
    LIMIT 1
  `).get(questionId);
  return row ? mapQuestionBankScenario(row) : null;
}

// Resolve the authoritative answer source for a practice scenario by id so the
// server can score practice/dictation without trusting a client-supplied key.
export async function resolveListeningScenarioById(scenarioId) {
  const id = String(scenarioId || '').trim();
  if (!id) return null;
  if (id.startsWith('qb-')) {
    try {
      return await findQuestionBankScenarioById(id);
    } catch {
      return null;
    }
  }
  return findStaticScenarioById(id);
}

export async function getListeningContent({ systemId = '' } = {}) {
  let questionBankScenarios = [];
  try {
    questionBankScenarios = await getQuestionBankScenarios(systemId);
  } catch {
    questionBankScenarios = [];
  }
  const scenariosByStage = questionBankScenarios.length
    ? { 题库: questionBankScenarios, 高考真题: gaokaoScenarios, ...fallbackScenariosByStage }
    : { 高考真题: gaokaoScenarios, ...fallbackScenariosByStage };

  return {
    version: 1,
    source: questionBankScenarios.length ? 'question-bank+server-catalog' : 'server-catalog',
    minimalPairs,
    wordItems,
    sentenceItems,
    passages,
    scenariosByStage,
  };
}
