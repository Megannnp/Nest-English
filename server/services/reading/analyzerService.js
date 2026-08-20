import { logError } from '../../utils/logger.js';
import {
  callVolcengineAIStream,
  classifyAIError,
  collectVolcengineStreamText,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../aiProviderService.js';

const SYSTEM_PROMPT = `你是专业英语阅读理解分析老师（高考/四六级/考研方向）。
任务：根据用户提供的阅读文章和题目，返回一个完整的 JSON 分析结果。

必须严格遵守：
1. 只返回 JSON，不加任何 markdown 代码块或说明文字
2. 直接以 { 开头，以 } 结尾
3. 段落 id 格式为 "P1"、"P2"…
4. 每道题必须含 answer 字段（单个大写字母）
5. location.quote 必须是原文中真实存在的句子或短语，不要改写

返回格式：
{
  "genre": "说明文|议论文|记叙文|新闻报道",
  "mainIdea": "文章一句话主旨",
  "wordCount": 数字,
  "mindMap": {
    "center": "核心主题词（5字以内）",
    "branches": [
      { "id": "P1", "label": "第1段", "topic": "段落核心主题（10字以内）", "keywords": ["关键词1","关键词2"], "details": ["具体细节或论据1（15字以内）","具体细节或论据2（15字以内）"] }
    ]
  },
  "questions": [
    {
      "index": 1,
      "stem": "题干原文",
      "type": "细节题|推断题|主旨题|词义题|态度题|句子功能题",
      "options": [
        { "letter": "A", "text": "选项原文", "correct": false, "trap": "无中生有|过度推断|反向干扰|张冠李戴|偷换概念", "note": "错误原因简析" },
        { "letter": "B", "text": "选项原文", "correct": true, "trap": null, "note": "正确原因简析" }
      ],
      "answer": "B",
      "location": {
        "paragraph": "P2",
        "quote": "原文定位句（必须是原文真实存在的文字）",
        "strategy": "同义替换|直接对应|逻辑推断|全文综合"
      },
      "logic": "2-3句话说明解题思路"
    }
  ]
}`;

function _parseAnalysis(raw) {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const clean = jsonMatch
    ? jsonMatch[0]
    : raw.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim();
  return JSON.parse(clean);
}

function toText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isSyntaxError(error) {
  return error instanceof SyntaxError || error?.name === 'SyntaxError';
}

function normalizeGenre(value) {
  const genre = toText(value, '说明文');
  return ['说明文', '议论文', '记叙文', '新闻报道'].includes(genre) ? genre : '说明文';
}

function normalizeBranch(branch, index) {
  const id = toText(branch?.id, `P${index + 1}`);
  return {
    id: /^P\d+$/i.test(id) ? id.toUpperCase() : `P${index + 1}`,
    label: toText(branch?.label, `第${index + 1}段`),
    topic: toText(branch?.topic, '段落要点'),
    keywords: normalizeArray(branch?.keywords).map((item) => toText(item)).filter(Boolean).slice(0, 6),
    details: normalizeArray(branch?.details).map((item) => toText(item)).filter(Boolean).slice(0, 6),
  };
}

function normalizeOption(option, answer) {
  const letter = toText(option?.letter).toUpperCase().slice(0, 1);
  return {
    letter,
    text: toText(option?.text),
    correct: letter ? letter === answer : Boolean(option?.correct),
    trap: option?.trap ? toText(option.trap) : null,
    note: toText(option?.note),
  };
}

function resolveQuestionAnswer(question, rawOptions) {
  const explicitAnswer = toText(question?.answer).toUpperCase().match(/[A-D]/)?.[0] || '';
  if (explicitAnswer) return explicitAnswer;
  return toText(rawOptions.find((option) => option?.correct)?.letter).toUpperCase().match(/[A-D]/)?.[0] || '';
}

function markCorrectOption(options, answer) {
  if (!answer || options.some((option) => option.correct)) return options;
  return options.map((option) => (
    option.letter === answer ? { ...option, correct: true } : option
  ));
}

function normalizeQuote(quote, passage) {
  const clean = toText(quote);
  if (!clean) return '';
  if (passage.includes(clean)) return clean;
  const compactPassage = passage.replace(/\s+/g, ' ');
  const compactQuote = clean.replace(/\s+/g, ' ');
  return compactPassage.includes(compactQuote) ? clean : '';
}

function normalizeQuestion(question, index, passage) {
  const rawOptions = normalizeArray(question?.options);
  const answer = resolveQuestionAnswer(question, rawOptions);
  const options = markCorrectOption(rawOptions
    .map((option) => normalizeOption(option, answer))
    .filter((option) => option.letter && option.text), answer);

  return {
    index: Number.isFinite(Number(question?.index)) ? Number(question.index) : index + 1,
    stem: toText(question?.stem, `第${index + 1}题`),
    type: toText(question?.type, '细节题'),
    options,
    answer,
    location: question?.location ? {
      paragraph: toText(question.location.paragraph),
      quote: normalizeQuote(question.location.quote, passage),
      strategy: toText(question.location.strategy, '直接对应'),
    } : null,
    logic: toText(question?.logic),
  };
}

function normalizeAnalysisResult(result, passage) {
  const mindMap = result?.mindMap && typeof result.mindMap === 'object' ? result.mindMap : {};
  const branches = normalizeArray(mindMap.branches).map(normalizeBranch);
  const questions = normalizeArray(result?.questions)
    .map((question, index) => normalizeQuestion(question, index, passage))
    .filter((question) => question.stem && (question.options.length || question.answer || question.logic));

  return {
    genre: normalizeGenre(result?.genre),
    mainIdea: toText(result?.mainIdea),
    wordCount: Number.isFinite(Number(result?.wordCount))
      ? Number(result.wordCount)
      : passage.trim().split(/\s+/).filter(Boolean).length,
    mindMap: {
      center: toText(mindMap.center, '核心主题'),
      branches,
    },
    questions,
  };
}

function requireAnalysisQuality(result, { hasQuestionInput = false } = {}) {
  if (!result.mainIdea) {
    throw new SyntaxError('AI阅读分析缺少文章主旨，请重试');
  }
  if (!result.mindMap.branches.length) {
    throw new SyntaxError('AI阅读分析缺少段落导图，请重试');
  }
  if (!hasQuestionInput) return;

  if (!result.questions.length) {
    throw new SyntaxError('AI阅读分析缺少题目解析，请重试');
  }
  for (const question of result.questions) {
    if (!question.answer) {
      throw new SyntaxError('AI阅读分析缺少题目答案，请重试');
    }
    if (question.options.length && !question.options.some((option) => option.letter === question.answer)) {
      throw new SyntaxError('AI阅读分析答案与选项不匹配，请重试');
    }
  }
  // 定位句是防幻觉信号：个别题定位对不上原文时只丢弃该题的定位（前端已可容错），
  // 只有整份分析都没有一处可靠定位时才判定为幻觉并拒绝。
  if (!result.questions.some((question) => question.location?.quote)) {
    throw new SyntaxError('AI阅读分析缺少可靠原文定位，请重试');
  }
}

export async function analyzeReading({ passage, questions, requestId, userId }) {
  await ensureAICircuitAvailable('reading_analyze');

  const userContent = `【阅读文章】\n${passage.trim()}\n\n【题目与选项】\n${questions.trim()}`;

  const aiRes = await callVolcengineAIStream(undefined, [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ], 4000, 0.2);

  const content = await collectVolcengineStreamText(aiRes);

  try {
    const result = normalizeAnalysisResult(_parseAnalysis(content), passage);
    requireAnalysisQuality(result, { hasQuestionInput: Boolean(questions?.trim()) });
    await recordAISuccess('reading_analyze');
    return result;
  } catch (err) {
    void recordAIFailure(err, 'reading_analyze');
    logError('reading_analyze_parse_failed', { message: err.message, requestId, userId });
    if (isSyntaxError(err) && /^AI阅读分析/.test(err.message)) throw err;
    throw new SyntaxError('AI返回格式异常，请重试');
  }
}

export function handleAnalyzeError(err, { requestId, userId } = {}) {
  if (isSyntaxError(err)) return { status: 502, msg: err.message };
  void recordAIFailure(err, 'reading_analyze');
  const fallback = classifyAIError(err);
  logError('reading_analyze_failed', { message: err.message, requestId, userId });
  return { status: err.status || fallback.status, msg: err.message };
}
