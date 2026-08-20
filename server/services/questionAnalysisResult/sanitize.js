import { normalizeWritingType } from '../aiTagAnalysisService.js';

function toPlainObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function toText(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function toStringArray(value, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toText(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeAnalysisScore(value) {
  const normalized = toText(value);
  return ['优', '良', '中', '差'].includes(normalized) ? normalized : '中';
}

const EMPTY_STARTER = { text: '', translation: '', constraints: [], directions: [], forbidden: [] };

function _sanitizeStarterPara(para) {
  const p = toPlainObject(para, EMPTY_STARTER);
  return {
    text: toText(p.text),
    translation: toText(p.translation),
    constraints: toStringArray(p.constraints, 6),
    directions: toStringArray(p.directions, 6),
    forbidden: toStringArray(p.forbidden, 6),
  };
}

function _sanitizeContinuationFields(result) {
  const storyLine = toPlainObject(result.storyLine, {});
  const emotionLine = toPlainObject(result.emotionLine, {});
  const plotAnalysis = toPlainObject(result.plotAnalysis, {});
  const starters = toPlainObject(result.starters, {});
  const ca = toPlainObject(result.contentAnalysis, {});

  result.storyLine = {
    who: toText(storyLine.who), when: toText(storyLine.when),
    where: toText(storyLine.where), why: toText(storyLine.why),
    what: toText(storyLine.what), result: toText(storyLine.result),
  };
  result.emotionLine = {
    initial: toText(emotionLine.initial),
    changes: toStringArray(emotionLine.changes, 6),
    tone: toText(emotionLine.tone),
  };
  result.plotAnalysis = {
    originalText: toText(plotAnalysis.originalText),
    translation: toText(plotAnalysis.translation),
    keyLines: Array.isArray(plotAnalysis.keyLines) ? plotAnalysis.keyLines.slice(0, 8) : [],
  };
  result.starters = {
    para1: _sanitizeStarterPara(starters.para1),
    para2: _sanitizeStarterPara(starters.para2),
    relationship: toText(starters.relationship),
  };
  result.contentAnalysis = {
    plotLogic: {
      ...toPlainObject(ca.plotLogic, {}),
      accuracy: toText(ca.plotLogic?.accuracy),
      coherence: toText(ca.plotLogic?.coherence),
      closure: toText(ca.plotLogic?.closure),
      score: normalizeAnalysisScore(ca.plotLogic?.score),
    },
    characterConsistency: {
      ...toPlainObject(ca.characterConsistency, {}),
      motivation: toText(ca.characterConsistency?.motivation),
      emotion: toText(ca.characterConsistency?.emotion),
      score: normalizeAnalysisScore(ca.characterConsistency?.score),
    },
    themeAlignment: {
      ...toPlainObject(ca.themeAlignment, {}),
      comment: toText(ca.themeAlignment?.comment),
      score: normalizeAnalysisScore(ca.themeAlignment?.score),
    },
  };
}

function _nullableObj(src, key) {
  return src[key] == null ? null : toPlainObject(src[key], null);
}

function _buildNullableObjects(source) {
  return {
    thesisAnalysis: _nullableObj(source, 'thesisAnalysis'),
    evidenceEvaluation: _nullableObj(source, 'evidenceEvaluation'),
    logicStructure: _nullableObj(source, 'logicStructure'),
    structure: _nullableObj(source, 'structure'),
    toneAnalysis: _nullableObj(source, 'toneAnalysis'),
    storyLine: _nullableObj(source, 'storyLine'),
    emotionLine: _nullableObj(source, 'emotionLine'),
    plotAnalysis: _nullableObj(source, 'plotAnalysis'),
    starters: _nullableObj(source, 'starters'),
    contentAnalysis: _nullableObj(source, 'contentAnalysis'),
    scenarioAnalysis: _nullableObj(source, 'scenarioAnalysis'),
    taskAnalysis: _nullableObj(source, 'taskAnalysis'),
    formatAnalysis: _nullableObj(source, 'formatAnalysis'),
    materialAnalysis: _nullableObj(source, 'materialAnalysis'),
    structureAnalysis: _nullableObj(source, 'structureAnalysis'),
    commentaryAnalysis: _nullableObj(source, 'commentaryAnalysis'),
  };
}

function _buildContentFields(source, aiAnalysis) {
  const reason = toText(aiAnalysis?.reason);
  const themes = source.themes?.length ? source.themes : aiAnalysis?.themes;
  return {
    overview: toText(source.overview, reason),
    reason: toText(source.reason, reason),
    themes: toStringArray(themes, 6),
    focusPoints: toStringArray(source.focusPoints, 6),
    risks: toStringArray(source.risks, 6),
    suggestions: toStringArray(source.suggestions, 6),
    categories: Array.isArray(source.categories) ? source.categories.slice(0, 6) : [],
    keyPoints: toStringArray(source.keyPoints, 8),
    summaryRules: toStringArray(source.summaryRules, 8),
    missedPoints: toStringArray(source.missedPoints, 8),
    personalOpinionAlerts: toStringArray(source.personalOpinionAlerts, 6),
    rhetoricalDevices: toStringArray(source.rhetoricalDevices, 6),
    vocabulary: Array.isArray(source.vocabulary) ? source.vocabulary.slice(0, 6) : [],
    sceneVocabulary: Array.isArray(source.sceneVocabulary) ? source.sceneVocabulary.slice(0, 6) : [],
    sentencePatterns: Array.isArray(source.sentencePatterns) ? source.sentencePatterns.slice(0, 6) : [],
    phraseSuggestions: toPlainObject(source.phraseSuggestions, { categories: [] }),
  };
}

function _collectIssues(source) {
  const issues = [];
  if (!Array.isArray(source.themes)) issues.push('themes');
  if (source.focusPoints !== undefined && !Array.isArray(source.focusPoints)) issues.push('focusPoints');
  if (source.risks !== undefined && !Array.isArray(source.risks)) issues.push('risks');
  if (source.suggestions !== undefined && !Array.isArray(source.suggestions)) issues.push('suggestions');
  return issues;
}

export function sanitizeQuestionAnalysisResult(type, data, aiAnalysis) {
  const normalizedType = normalizeWritingType(type || data?.type || aiAnalysis?.type);
  const source = toPlainObject(data);

  const result = {
    ...source,
    type: normalizedType,
    ..._buildContentFields(source, aiAnalysis),
    ..._buildNullableObjects(source),
  };

  const issues = _collectIssues(source);

  if (normalizedType === 'continuation') {
    _sanitizeContinuationFields(result);
  }

  return {
    data: result,
    issues,
    sanitized: issues.length > 0,
  };
}
