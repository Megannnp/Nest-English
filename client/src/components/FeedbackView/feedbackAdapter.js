import { normalizeCategoriesToDimensions } from '../../writing/core/feedbackDimensions.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'number') return String(item);
      if (isPlainObject(item)) return String(item.detail || item.title || item.summary || '').trim();
      return '';
    })
    .filter(Boolean);
}

// Like toStringArray but also handles a plain string by wrapping it in an array
function toStringList(value) {
  if (Array.isArray(value)) return toStringArray(value);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normalizeReviewList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'number') return String(item);
      if (isPlainObject(item)) {
        const title = String(item.title || item.name || '').trim();
        const detail = String(item.detail || item.comment || item.summary || item.advice || '').trim();
        if (title && detail) return { ...item, title, detail };
        if (title || detail) return { ...item, title: title || '反馈要点', detail };
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeGrammarIssues(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeGrammarIssue).filter(Boolean);
}

function normalizeGrammarIssue(item) {
  if (typeof item === 'string') return normalizeGrammarIssueText(item);
  if (!isPlainObject(item)) return null;
  return normalizeGrammarIssueObject(item);
}

function normalizeGrammarIssueText(item) {
  const text = item.trim();
  return text ? { original: '语言问题', corrected: '建议结合上下文改写这一处表达', explanation: text } : null;
}

function normalizeGrammarIssueObject(item) {
  const original = String(firstTruthy(item.original, item.title, '')).trim();
  const corrected = String(firstTruthy(item.corrected, item.example, '')).trim();
  const explanation = String(firstTruthy(item.explanation, item.detail, item.comment, '')).trim();
  if (![original, corrected, explanation].some(Boolean)) return null;
  return {
    ...item,
    original: original || '语言问题',
    corrected: corrected || '建议结合上下文改写这一处表达',
    explanation,
  };
}

function buildFallbackOverallSummary(rawData, promptAnalysis, grade) {
  const normalized = normalizeCategoriesToDimensions(
    rawData.categories || promptAnalysis.categories,
    {
      overallGrade: grade || rawData.overall?.grade,
      existingDimensions: rawData.dimensions,
      writingType: normalizeType(rawData.type || rawData.writingType || rawData.selectedType || promptAnalysis.type || null),
    }
  );

  const categoryComments = normalized.categories
    .map((item) => item?.comment)
    .filter(Boolean)
    .slice(0, 2);
  const dimensionComments = Object.values(rawData.dimensions || {})
    .map((item) => (isPlainObject(item) ? String(item.comment || '').trim() : ''))
    .filter(Boolean)
    .slice(0, 2);

  const improvementHints = toStringArray(rawData.improvements || rawData.suggestions).slice(0, 1);

  return [
    rawData.summary,
    rawData.evaluation,
    rawData.overall?.summary,
    categoryComments.join('；'),
    dimensionComments.join('；'),
    improvementHints.join(''),
  ].filter(Boolean)[0] || '';
}

function normalizeContinuationLanguageIssues(languageIssues) {
  if (!Array.isArray(languageIssues)) return [];
  return languageIssues
    .map((item) => {
      if (!isPlainObject(item)) return null;
      const title = String(item.title || '').trim();
      const detail = String(item.detail || '').trim();
      const example = String(item.example || '').trim();
      if (!title && !detail && !example) return null;
      return {
        original: title || '语言问题',
        corrected: example || '建议结合上下文改写这一处表达',
        explanation: detail || '',
      };
    })
    .filter(Boolean);
}

function buildContinuationContentAnalysis(rawData) {
  const hasNewDetailedFields =
    isPlainObject(rawData.plotLogic) ||
    isPlainObject(rawData.characterConsistency) ||
    isPlainObject(rawData.themeAlignment);

  if (!hasNewDetailedFields) return rawData.contentAnalysis || null;

  const plotLogic = isPlainObject(rawData.plotLogic) ? rawData.plotLogic : {};
  const characterConsistency = isPlainObject(rawData.characterConsistency) ? rawData.characterConsistency : {};
  const themeAlignment = isPlainObject(rawData.themeAlignment) ? rawData.themeAlignment : {};

  return {
    plotLogic: {
      summary: plotLogic.summary || '',
      strengths: toStringArray(plotLogic.strengths),
      risks: toStringArray(plotLogic.risks),
      bridgingSuggestions: toStringArray(plotLogic.bridgingSuggestions),
    },
    characterConsistency: {
      summary: characterConsistency.summary || '',
      strengths: toStringArray(characterConsistency.strengths),
      risks: toStringArray(characterConsistency.risks),
      revisionFocus: toStringArray(characterConsistency.revisionFocus),
    },
    themeAlignment: {
      summary: themeAlignment.summary || '',
      strengths: toStringArray(themeAlignment.strengths),
      risks: toStringArray(themeAlignment.risks),
      revisionFocus: toStringArray(themeAlignment.revisionFocus),
    },
  };
}

function buildContinuationLogicStructure(rawData) {
  if (!isPlainObject(rawData.plotLogic)) return rawData.logicStructure || null;
  const plotLogic = rawData.plotLogic;
  return {
    coherence: plotLogic.summary || '',
    transitionQuality: toStringArray(plotLogic.bridgingSuggestions).join('；'),
    flowIssues: toStringArray(plotLogic.risks),
    strengths: toStringArray(plotLogic.strengths),
  };
}

function buildContinuationContentLogic(rawData) {
  if (Array.isArray(rawData.contentLogic) && rawData.contentLogic.length) return rawData.contentLogic;

  const parts = [];
  if (isPlainObject(rawData.plotLogic)) {
    parts.push(...toStringArray(rawData.plotLogic.risks));
    parts.push(...toStringArray(rawData.plotLogic.bridgingSuggestions));
  }
  if (isPlainObject(rawData.characterConsistency)) {
    parts.push(...toStringArray(rawData.characterConsistency.risks));
    parts.push(...toStringArray(rawData.characterConsistency.revisionFocus));
  }
  if (isPlainObject(rawData.themeAlignment)) {
    parts.push(...toStringArray(rawData.themeAlignment.risks));
    parts.push(...toStringArray(rawData.themeAlignment.revisionFocus));
  }
  return parts.filter(Boolean).slice(0, 8);
}

function buildContinuationStructure(rawData) {
  if (Array.isArray(rawData.structure) && rawData.structure.length) return rawData.structure;
  if (!isPlainObject(rawData.plotLogic)) return rawData.structure || [];

  const plotLogic = rawData.plotLogic;
  return [
    plotLogic.summary ? { name: '情节承接', comment: plotLogic.summary } : null,
    toStringArray(plotLogic.bridgingSuggestions)[0]
      ? { name: '段落衔接', comment: toStringArray(plotLogic.bridgingSuggestions).join('；') }
      : null,
    toStringArray(plotLogic.risks)[0]
      ? { name: '结构风险', comment: toStringArray(plotLogic.risks).join('；') }
      : null,
  ].filter(Boolean);
}

function normalizeEssayBlock(essay, fallbackTitle = '') {
  if (!isPlainObject(essay)) return null;
  const text = String(essay.text || essay.writingTemplate || '').trim();
  const title = String(essay.title || fallbackTitle || '').trim();
  const highlights = toStringArray(essay.highlights);
  if (!text && !title && !highlights.length) return null;
  return {
    ...essay,
    title,
    text,
    highlights,
  };
}

function firstTruthy(...values) {
  const found = values.find(Boolean);
  return found === undefined ? values[values.length - 1] : found;
}

function firstArray(...values) {
  return values.find(Array.isArray) || [];
}

function readStructuredSources(rawData) {
  const structuredOverview = isPlainObject(rawData.overview) ? rawData.overview : {};
  const structuredEvaluation = rawData.aiEvaluation || {};
  const structuredDeepReview = structuredEvaluation.deepReview || {};
  const structuredAnalysis = rawData.aiAnalysisBlock || rawData.aiAnalysisStructured || {};
  const structuredPromptAnalysis = structuredAnalysis.promptAnalysis || rawData.questionAnalysis || null;

  return {
    structuredOverview,
    structuredEvaluation,
    structuredDeepReview,
    structuredAnalysis,
    structuredPromptAnalysis,
    promptAnalysis: structuredPromptAnalysis || {},
    structuredResourceBank: structuredAnalysis.resourceBank || {},
    structuredNavigation: structuredEvaluation.navigation || {},
    structuredSampleEssay: structuredEvaluation.sampleEssay || {},
  };
}

function readScoreMeta(rawData) {
  const rawScore = rawData.total_score ?? rawData.totalScore ?? rawData.score;
  const rawMaxScore = rawData.max_score ?? rawData.maxScore ?? 15;
  const score = rawScore === undefined || rawScore === null || rawScore === '' ? null : Number(rawScore);
  const maxScore = rawMaxScore === undefined || rawMaxScore === null || rawMaxScore === '' ? null : Number(rawMaxScore);
  const percentage = score !== null && maxScore ? score / maxScore : null;

  return {
    score,
    maxScore,
    grade: deriveGrade(percentage),
  };
}

function deriveGrade(percentage) {
  if (percentage === null) return null;
  if (percentage >= 0.9) return '优';
  if (percentage >= 0.75) return '良';
  if (percentage >= 0.6) return '中';
  return '差';
}

function deriveAnalysisStatus(rawData, structuredPromptAnalysis) {
  const normalized = String(rawData.analysisMeta?.status || structuredPromptAnalysis?.status || '').trim().toLowerCase();
  if (['pending', 'partial', 'ready', 'failed'].includes(normalized)) return normalized;
  if (structuredPromptAnalysis?.pending) return 'pending';
  return null;
}

function readQuestionStarters(questionData) {
  const continuationStarters = questionData?.continuationStarters || {};

  return {
    para1: firstTruthy(
      continuationStarters.para1?.text,
      continuationStarters.para1,
      questionData?.para1,
      questionData?.para1_starter
    ) || '',
    para2: firstTruthy(
      continuationStarters.para2?.text,
      continuationStarters.para2,
      questionData?.para2,
      questionData?.para2_starter
    ) || '',
  };
}

function buildPlotAnalysis(rawData, promptAnalysis, questionStarters) {
  const rawPlotAnalysis = rawData.plotAnalysis || {};
  const promptPlotAnalysis = promptAnalysis.plotAnalysis || {};

  return {
    originalText: firstTruthy(rawPlotAnalysis.originalText, promptPlotAnalysis.originalText, rawData.original_text, rawData.extractedText),
    translation: firstTruthy(rawPlotAnalysis.translation, promptPlotAnalysis.translation, rawData.translation),
    characters: firstArray(rawPlotAnalysis.characters, promptPlotAnalysis.characters, rawData.characters),
    plotPoints: firstArray(rawPlotAnalysis.plotPoints, promptPlotAnalysis.plotPoints, rawData.plot_points),
    emotions: firstArray(rawPlotAnalysis.emotions, promptPlotAnalysis.emotions, rawData.emotions),
    keyLines: firstArray(rawPlotAnalysis.keyLines, promptPlotAnalysis.keyLines),
    para1Starter: firstTruthy(rawPlotAnalysis.para1Starter, promptPlotAnalysis.para1Starter, rawData.para1_starter, questionStarters.para1, '未提供'),
    para2Starter: firstTruthy(rawPlotAnalysis.para2Starter, promptPlotAnalysis.para2Starter, rawData.para2_starter, questionStarters.para2, '未提供'),
    coherenceHints: firstArray(rawPlotAnalysis.coherenceHints, promptPlotAnalysis.coherenceHints, rawData.coherence_hints),
  };
}

function buildContinuationContext(rawData, normalizedType, questionData, promptAnalysis) {
  if (normalizedType !== 'continuation') {
    return {
      contentAnalysis: null,
      logicStructure: null,
      contentLogic: [],
      structure: [],
      languageIssues: [],
      questionStarters: { para1: '', para2: '' },
      plotAnalysis: buildPlotAnalysis(rawData, promptAnalysis, { para1: '', para2: '' }),
    };
  }

  const questionStarters = readQuestionStarters(questionData);

  return {
    contentAnalysis: buildContinuationContentAnalysis(rawData),
    logicStructure: buildContinuationLogicStructure(rawData),
    contentLogic: buildContinuationContentLogic(rawData),
    structure: buildContinuationStructure(rawData),
    languageIssues: normalizeContinuationLanguageIssues(rawData.languageIssues),
    questionStarters,
    plotAnalysis: buildPlotAnalysis(rawData, promptAnalysis, questionStarters),
  };
}

function buildQuestionAnalysis({ structuredPromptAnalysis, continuationContext }) {
  const hasStructuredPrompt = isPlainObject(structuredPromptAnalysis);
  const hasContinuationFallback = hasContinuationQuestionFallback(continuationContext);

  if (!hasStructuredPrompt && !hasContinuationFallback) return null;

  const questionAnalysis = hasStructuredPrompt ? { ...structuredPromptAnalysis } : {};
  addIfMissing(questionAnalysis, 'contentAnalysis', continuationContext.contentAnalysis, structuredPromptAnalysis);
  addIfMissing(questionAnalysis, 'logicStructure', continuationContext.logicStructure, structuredPromptAnalysis);
  addIfMissing(questionAnalysis, 'plotAnalysis', hasContinuationFallback ? continuationContext.plotAnalysis : null, structuredPromptAnalysis);
  return questionAnalysis;
}

function hasContinuationQuestionFallback(continuationContext) {
  return [
    continuationContext.contentAnalysis,
    continuationContext.logicStructure,
    continuationContext.questionStarters.para1,
    continuationContext.questionStarters.para2,
  ].some(Boolean);
}

function addIfMissing(target, key, value, source) {
  if (value && !source?.[key]) {
    target[key] = value;
  }
}

function buildSampleEssays(rawData, normalizedType, sources) {
  const fallbackTitle = normalizedType === 'continuation' ? '' : '优秀范文';
  const correctedTitle = normalizedType === 'continuation' ? '' : '批改后范文';
  const structuredSampleEssay = sources.structuredSampleEssay;
  const legacySampleInput = structuredSampleEssay.text || structuredSampleEssay.writingTemplate
    ? {
        ...(rawData.sampleEssay || {}),
        ...structuredSampleEssay,
        text: structuredSampleEssay.text || rawData.sampleEssay?.text || '',
      }
    : rawData.sampleEssay;
  const legacySampleEssay = normalizeEssayBlock(legacySampleInput, fallbackTitle);
  const correctedSampleEssay = normalizeEssayBlock(
    rawData.correctedSampleEssay || sources.structuredEvaluation.correctedSampleEssay,
    correctedTitle
  );
  const excellentSampleEssay = normalizeEssayBlock(
    rawData.excellentSampleEssay || sources.structuredEvaluation.excellentSampleEssay || legacySampleEssay,
    fallbackTitle
  );

  return {
    correctedSampleEssay,
    excellentSampleEssay,
    sampleEssay: excellentSampleEssay || correctedSampleEssay || legacySampleEssay,
  };
}

function buildDeepReviewFields(rawData, promptAnalysis, sources, continuationContext) {
  const structuredDeepReview = sources.structuredDeepReview;
  const grammarIssues = normalizeGrammarIssues(
    structuredDeepReview.language?.grammarIssues ||
    structuredDeepReview.grammar
  );
  const contentLogic = normalizeReviewList(
    structuredDeepReview.content?.contentLogic ||
    structuredDeepReview.contentLogic
  );
  const structure = normalizeReviewList(
    structuredDeepReview.structure?.structure ||
    structuredDeepReview.structure
  );
  const fallbackGrammar = firstTruthy(rawData.grammarIssues, rawData.grammar, rawData.grammar_errors, continuationContext.languageIssues);
  const fallbackStructure = firstTruthy(rawData.structure, promptAnalysis.structure, rawData.structure_errors, continuationContext.structure);

  return {
    grammar: grammarIssues.length ? grammarIssues : (Array.isArray(fallbackGrammar) ? fallbackGrammar : []),
    contentLogic: contentLogic.length ? contentLogic : toStringList(firstTruthy(rawData.contentLogic, rawData.content_errors, continuationContext.contentLogic)),
    structure: structure.length ? structure : (Array.isArray(fallbackStructure) ? fallbackStructure : []),
  };
}

function buildOverall(rawData, sources, promptAnalysis, scoreMeta) {
  const fallbackSummary = buildFallbackOverallSummary(rawData, promptAnalysis, scoreMeta.grade);
  const rawOverall = isPlainObject(rawData.overall)
    ? { ...rawData.overall, summary: rawData.overall?.summary || fallbackSummary }
    : null;
  const structuredOverall = isPlainObject(sources.structuredOverview)
    ? { ...sources.structuredOverview, summary: sources.structuredOverview.summary || fallbackSummary }
    : null;

  return rawOverall || structuredOverall || {
    score: scoreMeta.score,
    total: scoreMeta.maxScore,
    grade: scoreMeta.grade,
    summary: fallbackSummary,
  };
}

function buildNavigationLists(rawData, sources) {
  const mainProblems = toStringArray(firstTruthy(rawData.mainProblems, rawData.weaknesses, rawData.negatives));
  const nextActions = toStringArray(firstTruthy(rawData.nextActions, rawData.improvements, rawData.suggestions, rawData.advancedSuggestions));

  return {
    mainProblems,
    nextActions,
    weaknesses: firstTruthy(sources.structuredNavigation.weaknesses, rawData.weaknesses, mainProblems),
    suggestions: firstTruthy(sources.structuredNavigation.suggestions, rawData.suggestions, rawData.advancedSuggestions, []),
    improvements: firstTruthy(sources.structuredNavigation.improvements, sources.structuredNavigation.suggestions, rawData.improvements, rawData.advancedSuggestions, []),
    highlights: firstTruthy(sources.structuredNavigation.highlights, rawData.highlights, rawData.positives, {}),
  };
}

function buildAnalysisMeta(rawData, sources, derivedAnalysisStatus) {
  return {
    status: derivedAnalysisStatus,
    fallbackSource: firstTruthy(rawData.analysisMeta?.fallbackSource, sources.structuredPromptAnalysis?.fallbackSource, null),
    supplementalStatus: firstTruthy(rawData.analysisMeta?.supplementalStatus, sources.structuredPromptAnalysis?.supplementalStatus, 'not_started'),
    updatedAt: rawData.analysisMeta?.updatedAt || null,
    degraded: Boolean(rawData.analysisMeta?.degraded),
    errorCode: rawData.analysisMeta?.errorCode || null,
    timings: rawData.analysisMeta?.timings || null,
    schema: rawData.analysisMeta?.schema || null,
  };
}

function buildRootAnalysisFields(rawData, sources, continuationContext) {
  return {
    aiAnalysis: firstTruthy(rawData.aiAnalysis, rawData.analysisResult, null),
    overview: rawData.overviewText || (typeof rawData.overview === 'string' ? rawData.overview : undefined),
    themes: rawData.themes === undefined ? undefined : toStringList(rawData.themes),
    reason: rawData.reason,
    focusPoints: rawData.focusPoints === undefined ? undefined : toStringList(rawData.focusPoints),
    risks: rawData.risks === undefined ? undefined : toStringList(rawData.risks),
    thesisAnalysis: rawData.thesisAnalysis || null,
    evidenceEvaluation: rawData.evidenceEvaluation || null,
    logicStructure: firstTruthy(rawData.logicStructure, sources.promptAnalysis.logicStructure, continuationContext.logicStructure),
    keyPoints: toStringList(firstTruthy(rawData.keyPoints, sources.promptAnalysis.keyPoints)),
    summaryRules: toStringList(firstTruthy(rawData.summaryRules, sources.promptAnalysis.summaryRules)),
    missedPoints: toStringList(firstTruthy(rawData.missedPoints, sources.promptAnalysis.missedPoints)),
    personalOpinionAlerts: toStringList(firstTruthy(rawData.personalOpinionAlerts, sources.promptAnalysis.personalOpinionAlerts)),
  };
}

function buildLanguageResourceFields(rawData, sources) {
  return {
    phraseSuggestions: firstTruthy(
      sources.structuredDeepReview.language?.phraseSuggestions,
      sources.structuredResourceBank.phraseSuggestions,
      rawData.phraseSuggestions,
      { vocabulary: [], phrases: [], categories: [] }
    ),
    sentencePatterns: firstArray(
      sources.structuredDeepReview.language?.sentencePatterns,
      sources.structuredResourceBank.sentencePatterns,
      rawData.sentencePatterns
    ),
    annotatedText: firstTruthy(
      sources.structuredDeepReview.language?.annotatedText,
      rawData.annotatedText,
      rawData.annotated_text
    ),
    sceneVocabulary: firstArray(
      sources.structuredResourceBank.vocabulary,
      rawData.sceneVocabulary,
      sources.promptAnalysis.sceneVocabulary,
      rawData.vocabulary
    ),
    writingExpressions: firstArray(rawData.writingExpressions, sources.promptAnalysis.writingExpressions),
  };
}

function buildStoryFields(rawData, sources, continuationContext) {
  return {
    storyLine: rawData.storyLine,
    emotionLine: rawData.emotionLine,
    starters: rawData.starters,
    contentAnalysis: firstTruthy(rawData.contentAnalysis, sources.promptAnalysis.contentAnalysis, continuationContext.contentAnalysis),
    scenarioAnalysis: firstTruthy(rawData.scenarioAnalysis, sources.promptAnalysis.scenarioAnalysis, null),
    taskAnalysis: rawData.taskAnalysis,
    formatAnalysis: rawData.formatAnalysis,
    materialAnalysis: rawData.materialAnalysis,
    structureAnalysis: rawData.structureAnalysis,
    commentaryAnalysis: rawData.commentaryAnalysis,
  };
}

function buildDetailedFields(rawData) {
  return {
    plotLogic: isPlainObject(rawData.plotLogic) ? rawData.plotLogic : null,
    characterConsistency: isPlainObject(rawData.characterConsistency) ? rawData.characterConsistency : null,
    themeAlignment: isPlainObject(rawData.themeAlignment) ? rawData.themeAlignment : null,
    languageIssues: Array.isArray(rawData.languageIssues) ? rawData.languageIssues : [],
    advancedSuggestions: toStringArray(rawData.advancedSuggestions),
    taskPoints: Array.isArray(rawData.taskPoints) ? rawData.taskPoints : [],
    errorCatalog: Array.isArray(rawData.errorCatalog) ? rawData.errorCatalog : [],
    rubricComparison: isPlainObject(rawData.rubricComparison) ? rawData.rubricComparison : null,
    improvementPlan: isPlainObject(rawData.improvementPlan) ? rawData.improvementPlan : null,
    cohesionAnalysis: isPlainObject(rawData.cohesionAnalysis) ? rawData.cohesionAnalysis : null,
  };
}

export function adaptFeedbackData(rawData, questionData) {
  if (!rawData) return null;

  const sources = readStructuredSources(rawData);
  const scoreMeta = readScoreMeta(rawData);
  const derivedAnalysisStatus = deriveAnalysisStatus(rawData, sources.structuredPromptAnalysis);

  const rawType = rawData.type || rawData.writingType || rawData.selectedType || sources.promptAnalysis.type || null;
  const normalizedType = normalizeType(rawType);
  const normalizedDimensions = normalizeCategoriesToDimensions(
    rawData.categories || sources.promptAnalysis.categories,
    {
      overallGrade: scoreMeta.grade || rawData.overall?.grade,
      existingDimensions: rawData.dimensions,
      writingType: normalizedType,
    }
  );
  const continuationContext = buildContinuationContext(rawData, normalizedType, questionData, sources.promptAnalysis);
  const questionAnalysis = buildQuestionAnalysis({
    structuredPromptAnalysis: sources.structuredPromptAnalysis,
    continuationContext,
  });
  const sampleEssays = buildSampleEssays(rawData, normalizedType, sources);
  const deepReviewFields = buildDeepReviewFields(rawData, sources.promptAnalysis, sources, continuationContext);
  const navigationLists = buildNavigationLists(rawData, sources);
  const languageResources = buildLanguageResourceFields(rawData, sources);

  return {
    analysisMeta: buildAnalysisMeta(rawData, sources, derivedAnalysisStatus),
    questionAnalysis,
    type: rawType,
    ...buildRootAnalysisFields(rawData, sources, continuationContext),
    vocabulary: firstArray(rawData.vocabulary, sources.promptAnalysis.vocabulary, rawData.sceneVocabulary),
    overall: buildOverall(rawData, sources, sources.promptAnalysis, scoreMeta),
    categories: normalizedDimensions.categories,
    dimensions: normalizedDimensions.dimensions,
    grammar: deepReviewFields.grammar,
    grammarIssues: deepReviewFields.grammar,
    phraseSuggestions: languageResources.phraseSuggestions,
    sentencePatterns: languageResources.sentencePatterns,
    writingTemplate: rawData.writingTemplate || null,
    correctedSampleEssay: sampleEssays.correctedSampleEssay,
    excellentSampleEssay: sampleEssays.excellentSampleEssay,
    contentLogic: deepReviewFields.contentLogic,
    structure: deepReviewFields.structure,
    toneAnalysis: rawData.toneAnalysis || null,
    rhetoricalDevices: Array.isArray(rawData.rhetoricalDevices) ? rawData.rhetoricalDevices : [],
    highlights: navigationLists.highlights,
    mainProblems: navigationLists.mainProblems,
    nextActions: navigationLists.nextActions,
    weaknesses: navigationLists.weaknesses,
    // Do NOT fall back to nextActions — that would cause overview and evaluation tab to both
    // render the same list. When explicit improvements/suggestions are absent (quick feedback
    // phase), these are kept empty and the evaluation tab reads nextActions directly.
    suggestions: navigationLists.suggestions,
    improvements: navigationLists.improvements,
    sampleEssayPending: Boolean(rawData.sampleEssayPending),
    annotatedText: languageResources.annotatedText,
    sampleEssay: sampleEssays.sampleEssay,
    ...buildStoryFields(rawData, sources, continuationContext),
    ...buildDetailedFields(rawData),
    plotAnalysis: continuationContext.plotAnalysis,
    sceneVocabulary: languageResources.sceneVocabulary,
    writingExpressions: languageResources.writingExpressions,
    aiEvaluation: sources.structuredEvaluation,
    aiAnalysisStructured: sources.structuredAnalysis,
    teacherReview: rawData.teacherReview || null,
    generation: rawData.generation || null,
  };
}

export const THEME = {
  primary: '#c8852a',
  primaryLight: '#fdf0d8',
  primaryDark: '#8b5e1a',
  background: '#f5f0e8',
  card: '#ffffff',
  cardAlt: '#f5f0e8',
  border: '#e8e0d5',
  text: '#2a1f14',
  textSecondary: '#8a7d6e',
  textMuted: '#a09080',
  success: '#2d9e6b',
  successLight: '#edfaf3',
  warning: '#d97706',
  warningLight: '#fff7ed',
  error: '#b02020',
  errorLight: '#fdf0ef',
  info: '#2563eb',
  infoLight: '#eff6ff',
};

export const TYPE_LABELS = {
  ielts_task1: { title: 'IELTS Task 1 批改报告', subtitle: 'Academic Writing Task 1' },
  ielts_task2: { title: 'IELTS Task 2 批改报告', subtitle: 'Academic Writing Task 2' },
  continuation: { title: '读后续写反馈报告', subtitle: 'Continuation Writing' },
  argumentative: { title: '议论文反馈报告', subtitle: 'Argumentative Essay' },
  summary: { title: '概要写作反馈报告', subtitle: 'Summary Writing' },
  speech: { title: '演讲稿反馈报告', subtitle: 'Speech Writing' },
  letter: { title: '书信反馈报告', subtitle: 'Letter Writing' },
  notice: { title: '通知反馈报告', subtitle: 'Notice Writing' },
  general: { title: '综合写作反馈报告', subtitle: 'General Writing' },
  narrative: { title: '记叙文反馈报告', subtitle: 'Narrative Writing' },
  expository: { title: '说明文反馈报告', subtitle: 'Expository Writing' },
  diary: { title: '日记反馈报告', subtitle: 'Diary Writing' },
  chart_writing: { title: '图表作文反馈报告', subtitle: 'Chart Writing' },
  report: { title: '报告反馈报告', subtitle: 'Report Writing' },
  proposal: { title: '倡议书反馈报告', subtitle: 'Proposal Writing' },
  review: { title: '读后感反馈报告', subtitle: 'Review Writing' },
  picture_writing: { title: '看图写话反馈报告', subtitle: 'Picture Writing' },
};

export const TYPE_DISPLAY = {
  ielts_task1: 'IELTS Task 1',
  ielts_task2: 'IELTS Task 2',
  continuation: '读后续写',
  argumentative: '议论文',
  summary: '概要写作',
  speech: '演讲稿',
  letter: '书信',
  notice: '通知',
  general: '综合写作',
  narrative: '记叙文',
  expository: '说明文',
  diary: '日记',
  chart_writing: '图表作文',
  report: '报告',
  proposal: '倡议书',
  review: '读后感',
  picture_writing: '看图写话',
};

export function normalizeType(type) {
  if (!type) return 'general';
  const lower = String(type).toLowerCase();
  const aliases = {
    ielts_task1: ['ielts_task1', 'ielts task 1', 'ielts writing task 1', 'academic task 1', '雅思小作文', '雅思 task 1'],
    ielts_task2: ['ielts_task2', 'ielts task 2', 'ielts writing task 2', 'academic task 2', '雅思大作文', '雅思 task 2'],
    continuation: ['continuation', '读后续写', '续写'],
    argumentative: ['argumentative', '议论文', 'argument'],
    summary: ['summary', '概要写作', '概括'],
    speech: ['speech', '演讲稿', 'presentation'],
    letter: ['letter', '书信', '邮件', 'email'],
    notice: ['notice', '通知'],
    narrative: ['narrative', '记叙文'],
    expository: ['expository', '说明文'],
    diary: ['diary', '日记'],
    chart_writing: ['chart_writing', '图表作文', 'chart'],
    report: ['report', '报告'],
    proposal: ['proposal', '倡议书'],
    review: ['review', '观后感', '读后感'],
    picture_writing: ['picture_writing', '看图写话'],
    general: ['general', '综合', 'default'],
  };
  for (const [standard, variants] of Object.entries(aliases)) {
    if (variants.some((variant) => lower.includes(variant))) return standard;
  }
  return 'general';
}

export function getGradeColor(grade) {
  const colors = { '优': '#3a6a45', '良': '#8A6F5B', '中': '#9a7040', '差': '#9a3a2a' };
  return colors[grade] || '#8a7d6e';
}

export function getSurname(n) {
  return (n || '').charAt(0) || '教';
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isMeaningfulText(value) {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  if (!text) return false;
  if (['优', '良', '中', '差', 'A', 'B', 'C', 'D', 'E', '--', '暂无'].includes(text)) return false;
  if (/^\d+(\.\d+)?$/.test(text)) return false;
  return true;
}
