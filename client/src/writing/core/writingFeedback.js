import { normalizeCategoriesToDimensions } from './feedbackDimensions.js';
import { aiAPI } from '../../api/index.js';

function stripMarkdownCodeFence(rawText) {
  return (rawText || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
}

function extractJsonCandidate(text) {
  const start = text.indexOf('{');
  if (start === -1) return '';
  const end = text.lastIndexOf('}');
  if (end !== -1 && end > start) return text.slice(start, end + 1);
  return text.slice(start);
}

function closeJsonLikeText(text) {
  let result = text;
  let inString = false;
  let escaped = false;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (const ch of text) {
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') braceDepth += 1;
    if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
    if (ch === '[') bracketDepth += 1;
    if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
  }

  if (inString) result += '"';
  if (bracketDepth > 0) result += ']'.repeat(bracketDepth);
  if (braceDepth > 0) result += '}'.repeat(braceDepth);
  return result;
}

function sanitizeJsonCandidate(candidate) {
  return Array.from(candidate, (character) => {
    const code = character.charCodeAt(0);
    if (code === 0) return '';
    if (code >= 1 && code <= 31) return ' ';
    return character;
  }).join('').trim();
}

function tryParseJsonVariants(candidate) {
  const variants = [];
  const base = sanitizeJsonCandidate(candidate);

  variants.push(base);
  variants.push(base.replace(/,\s*([}\]])/g, '$1'));
  variants.push(closeJsonLikeText(base));
  variants.push(closeJsonLikeText(base).replace(/,\s*([}\]])/g, '$1'));
  variants.push(closeJsonLikeText(base.replace(/,\s*([}\]])/g, '$1')));

  for (const variant of variants) {
    try {
      return JSON.parse(variant);
    } catch {
      // continue
    }
  }

  return null;
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function firstTruthy(values) {
  return values.filter(Boolean)[0] || '';
}

export function parseAIJsonResponse(rawText, _fallbackOriginalText = '') {
  const cleaned = stripMarkdownCodeFence(rawText);
  const candidate = extractJsonCandidate(cleaned);
  if (!candidate) throw new Error('AI 返回格式异常，请重试');

  let parsed = tryParseJsonVariants(candidate);
  if (parsed) return parsed;

  throw new Error('AI 返回内容解析失败，请重试');
}

async function withTimeout(promise, ms, label = '请求超时') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function buildRepairContext(type, options) {
  const continuationStarters = options.continuationStarters || {};
  return {
    isContinuation: type === 'continuation',
    promptText: String(options.promptText || '').trim(),
    para1Starter: String(continuationStarters.para1?.text || continuationStarters.para1 || '').trim(),
    para2Starter: String(continuationStarters.para2?.text || continuationStarters.para2 || '').trim(),
  };
}

function sampleEssaySchemaForRepair(isContinuation) {
  return isContinuation
    ? `"correctedSampleEssay": { "title": "", "text": "严格分成两段的修订后续写正文", "highlights": [] },
  "excellentSampleEssay": { "title": "", "text": "严格分成两段的优秀续写正文", "highlights": [] },
  "sampleEssay": { "title": "", "text": "与 excellentSampleEssay 一致的兼容字段", "highlights": [] },`
    : `"correctedSampleEssay": { "title": "批改后范文", "text": "修订后的完整范文正文", "highlights": [] },
  "excellentSampleEssay": { "title": "优秀范文", "text": "完整优秀范文正文", "highlights": [] },
  "sampleEssay": { "title": "参考范文", "text": "完整范文正文", "highlights": [] },`;
}

function continuationRepairRules(context) {
  if (!context.isContinuation) return '';
  return `
7. 当前题型是读后续写，correctedSampleEssay / excellentSampleEssay / sampleEssay 的 title 必须为空字符串。
8. 三个范文字段的正文必须严格分成两段，并且两段必须分别以题目给出的两句段首句原样开头。
9. 两句段首句原样开头：第一段：${context.para1Starter || '未提供'}；第二段：${context.para2Starter || '未提供'}。
10. sampleEssay 必须与 excellentSampleEssay 保持一致，作为兼容字段。
11. 当前读后续写题目原文：${context.promptText || '未提供'}。
`;
}

export async function repairMalformedFeedbackJson(rawText, type, maxScore, options = {}) {
  const repairContext = buildRepairContext(type, options);
  const sampleEssaySchema = sampleEssaySchemaForRepair(repairContext.isContinuation);
  const repairPrompt = `你是 JSON 修复助手。请把下面这段“英语作文批改结果”修复为一个合法 JSON。

要求：
1. 只能返回 JSON，不要解释。
2. 保留原内容的含义，不要凭空扩写。
3. 如果某些字段缺失，可以返回空数组、空对象或空字符串。
4. 所有字符串中的英文引号请安全转义，或改写为单引号/中文引号。
5. 输出字段至少包含：
{
  "totalScore": 0,
  "maxScore": ${maxScore},
  "type": "${type || 'general'}",
  "writingType": "${type || 'general'}",
  "tier": "",
  "summary": "",
  "categories": [],
  "highlights": { "vocabulary": [], "sentences": [], "content": [] },
  "grammarIssues": [],
  ${sampleEssaySchema}
  "improvements": [],
  "weaknesses": []
}
6. 题型专属字段只保留原文里已经出现、且与当前题型相关的部分，不要为了补齐 schema 硬造其他题型字段。
${continuationRepairRules(repairContext)}

题型：${type}

待修复内容：
${rawText}`;

  const result = await withTimeout(
    aiAPI.complete({
      model: undefined,
      max_tokens: 6200,
      temperature: 0,
      messages: [
        { role: 'system', content: '你只负责修复 JSON 结构，不负责重新批改作文。' },
        { role: 'user', content: repairPrompt },
      ],
    }),
    20000,
    '批改结果修复超时'
  );

  return parseAIJsonResponse(result?.content || '');
}

function normalizeScore(raw) {
  const value = firstPresent(raw?.totalScore, raw?.total_score, raw?.score);
  return value != null ? Number(value) : null;
}

function normalizeTotal(raw, maxScore) {
  const value = firstPresent(raw?.maxScore, raw?.max_score);
  return value != null ? Number(value) : maxScore ?? 0;
}

function gradeFromScore(score, total) {
  if (typeof score !== 'number') return '';
  const percentage = total > 0 ? score / total : 0;
  if (percentage >= 0.9) return '优';
  if (percentage >= 0.75) return '良';
  if (percentage >= 0.6) return '中';
  return '差';
}

function summarizeCategories(categories) {
  return categories.map((item) => item?.comment).filter(Boolean).slice(0, 2).join('；');
}

function summarizeImprovements(improvements) {
  return asList(improvements).map((item) => item?.detail || item?.title || item).filter(Boolean).slice(0, 1).join('');
}

function normalizeOverview(raw, fallbackType, maxScore) {
  const score = normalizeScore(raw);
  const total = normalizeTotal(raw, maxScore);
  const categories = asList(raw?.categories);
  const fallbackSummary = firstTruthy([
    raw?.summary,
    raw?.evaluation,
    raw?.overall?.summary,
    summarizeCategories(categories),
    summarizeImprovements(raw?.improvements),
  ]);

  return {
    score,
    total,
    grade: gradeFromScore(score, total),
    summary: fallbackSummary,
    writingType: fallbackType || raw?.writingType || raw?.type || 'general',
  };
}

function normalizeCoreDimensions(raw, fallbackType, maxScore) {
  const overview = normalizeOverview(raw, fallbackType, maxScore);
  return {
    overview,
    ...normalizeCategoriesToDimensions(raw?.categories, {
      overallGrade: overview.grade,
      existingDimensions: raw?.dimensions,
    }),
  };
}

function normalizeResourceBank(raw) {
  return {
    vocabulary: raw?.sceneVocabulary || raw?.vocabulary || [],
    phraseSuggestions: raw?.phraseSuggestions || { categories: [] },
    sentencePatterns: raw?.sentencePatterns || [],
  };
}

function normalizeNavigation(raw) {
  return {
    highlights: raw?.highlights || { vocabulary: [], sentences: [], content: [] },
    suggestions: raw?.improvements?.length ? raw.improvements : (raw?.suggestions || []),
    weaknesses: raw?.weaknesses || [],
  };
}

function normalizeDeepReviewLanguage(raw) {
  return {
    grammarIssues: raw?.grammarIssues || raw?.grammar || raw?.grammar_errors || [],
    annotatedText: raw?.annotatedText || raw?.annotated_text || '',
  };
}

function normalizeDeepReviewContent(raw) {
  return {
    contentLogic: raw?.contentLogic || raw?.content_errors || [],
    keyPoints: raw?.keyPoints || [],
    missedPoints: raw?.missedPoints || [],
    personalOpinionAlerts: raw?.personalOpinionAlerts || [],
    thesisAnalysis: raw?.thesisAnalysis || null,
    evidenceEvaluation: raw?.evidenceEvaluation || null,
  };
}

function normalizeDeepReviewStructure(raw) {
  return {
    categories: raw?.categories || [],
    dimensions: raw?.dimensions || {},
    logicStructure: raw?.logicStructure || null,
    structure: raw?.structure || raw?.structure_errors || [],
  };
}

function normalizeDeepReview(raw) {
  return {
    language: normalizeDeepReviewLanguage(raw),
    content: normalizeDeepReviewContent(raw),
    structure: normalizeDeepReviewStructure(raw),
  };
}

function normalizeTypeAnalysis(type, aiAnalysis) {
  const normalizedType = type || aiAnalysis?.type || 'general';
  return {
    writingType: normalizedType,
    confidence: aiAnalysis?.confidence ?? null,
    themes: aiAnalysis?.themes || [],
    reason: aiAnalysis?.reason || '',
    overview: aiAnalysis?.reason
      ? `系统识别当前作文题型为“${normalizedType}”，识别依据：${aiAnalysis.reason}`
      : `系统识别当前作文题型为“${normalizedType}”。`,
  };
}

function normalizeAnalysisStatus(status, fallbackPending = false) {
  const normalized = String(status || '').trim().toLowerCase();
  if (['pending', 'partial', 'ready', 'failed'].includes(normalized)) return normalized;
  if (fallbackPending) return 'pending';
  return null;
}

function normalizeTimingsMeta(stageMeta) {
  return stageMeta ? {
      startedAt: stageMeta.startedAt || null,
      finishedAt: stageMeta.finishedAt || null,
      totalDurationMs: stageMeta.totalDurationMs || null,
      stages: asList(stageMeta.stages),
    } : null;
}

function normalizeSchemaMeta(schemaMeta) {
  return schemaMeta ? {
      valid: Boolean(schemaMeta.valid),
      missing: asList(schemaMeta.missing),
      sanitized: Boolean(schemaMeta.sanitized),
      issues: asList(schemaMeta.issues),
    } : null;
}

function questionMetaOf(questionAnalysis) {
  return questionAnalysis?.meta || null;
}

function analysisUpdatedAt(questionMeta, previousMeta) {
  return questionMeta?.finishedAt || previousMeta?.updatedAt || Date.now();
}

function analysisStageMeta(questionMeta, previousMeta) {
  return questionMeta || previousMeta?.timings || null;
}

function analysisSchemaMeta(questionMeta, previousMeta) {
  return questionMeta?.schema || previousMeta?.schema || null;
}

function questionAnalysisMetaInputs(questionAnalysis, previousMeta = null) {
  const questionMeta = questionMetaOf(questionAnalysis);
  return {
    status: questionAnalysis?.status || previousMeta?.status,
    fallbackPending: Boolean(questionAnalysis?.pending),
    updatedAt: analysisUpdatedAt(questionMeta, previousMeta),
    stageMeta: analysisStageMeta(questionMeta, previousMeta),
    schemaMeta: analysisSchemaMeta(questionMeta, previousMeta),
    degraded: Boolean(previousMeta?.degraded),
    errorCode: previousMeta?.errorCode || null,
  };
}

function buildQuestionAnalysisMeta(questionAnalysis, previousMeta = null) {
  const inputs = questionAnalysisMetaInputs(questionAnalysis, previousMeta);
  const normalizedStatus = normalizeAnalysisStatus(inputs.status, inputs.fallbackPending);
  return {
    status: normalizedStatus || 'pending',
    updatedAt: inputs.updatedAt,
    degraded: inputs.degraded,
    errorCode: inputs.errorCode,
    timings: normalizeTimingsMeta(inputs.stageMeta),
    schema: normalizeSchemaMeta(inputs.schemaMeta),
  };
}

function resolveFeedbackType(raw, type, aiAnalysis) {
  return type || aiAnalysis?.type || raw?.writingType || raw?.type || 'general';
}

function buildAiEvaluation(raw) {
  return {
    navigation: normalizeNavigation(raw),
    deepReview: normalizeDeepReview(raw),
    sampleEssay: {
      ...(raw?.sampleEssay || {}),
      writingTemplate: raw?.writingTemplate || null,
    },
    correctedSampleEssay: {
      ...(raw?.correctedSampleEssay || {}),
    },
    excellentSampleEssay: {
      ...(raw?.excellentSampleEssay || raw?.sampleEssay || {}),
      writingTemplate: raw?.writingTemplate || null,
    },
  };
}

function buildAiAnalysisBlock(raw, normalizedType, aiAnalysis, nextQuestionAnalysis) {
  return {
    typeAnalysis: normalizeTypeAnalysis(normalizedType, aiAnalysis),
    promptAnalysis: nextQuestionAnalysis,
    resourceBank: normalizeResourceBank(raw),
  };
}

export function buildUnifiedFeedback(raw, { type, aiAnalysis, questionAnalysis, maxScore }) {
  const normalizedType = resolveFeedbackType(raw, type, aiAnalysis);
  const nextQuestionAnalysis = questionAnalysis || raw?.questionAnalysis || null;
  const analysisMeta = buildQuestionAnalysisMeta(nextQuestionAnalysis, raw?.analysisMeta);
  const { overview, categories, dimensions } = normalizeCoreDimensions(raw, normalizedType, maxScore);

  return {
    ...raw,
    type: normalizedType,
    writingType: normalizedType,
    aiAnalysis,
    analysisMeta,
    questionAnalysis: nextQuestionAnalysis,
    categories,
    dimensions,
    overview,
    aiEvaluation: buildAiEvaluation(raw),
    aiAnalysisBlock: buildAiAnalysisBlock(raw, normalizedType, aiAnalysis, nextQuestionAnalysis),
    teacherReview: raw?.teacherReview || null,
    generation: raw?.generation || null,
  };
}

export function createGenerationState(progress = 5, stage = '正在建立批改内容流') {
  return {
    active: true,
    progress,
    stage,
  };
}

export function withFeedbackGeneration(feedback, progress, stage) {
  if (!feedback) return feedback;
  const previousProgress = Number(feedback?.generation?.progress || 0);
  return {
    ...feedback,
    generation: createGenerationState(Math.max(previousProgress, Number(progress || 0)), stage || feedback?.generation?.stage),
  };
}

export function clearFeedbackGeneration(feedback) {
  if (!feedback) return feedback;
  return {
    ...feedback,
    generation: null,
  };
}

export function extractDisplayFeedbackFromWriting(updatedWriting) {
  if (!updatedWriting?.feedback) return null;
  return clearFeedbackGeneration(updatedWriting.feedback);
}

export function finalizeFeedbackForDisplay(feedback, progress = 96, stage = '正在整理正式反馈') {
  return withFeedbackGeneration(feedback, progress, stage);
}

export function createLoadingFeedback({ type, aiAnalysis, maxScore, progress = 6, stage = '正在生成写作评价' }) {
  return buildUnifiedFeedback(
    { generation: createGenerationState(progress, stage) },
    { type, aiAnalysis, maxScore }
  );
}

export async function buildFeedbackFromAIResponse({
  rawText,
  originalText = '',
  type,
  aiAnalysis,
  maxScore,
}) {
  let parsed;
  try {
    parsed = parseAIJsonResponse(rawText, originalText);
  } catch (parseError) {
    console.warn('主批改结果初次解析失败，尝试自动修复：', parseError.message);
    parsed = await repairMalformedFeedbackJson(rawText, type, maxScore);
  }

  return buildUnifiedFeedback(parsed, {
    type,
    aiAnalysis,
    maxScore,
  });
}
