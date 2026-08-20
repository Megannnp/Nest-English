const FEEDBACK_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  READY: 'ready',
  FAILED: 'failed',
};

const FEEDBACK_SCHEMA_VERSION = 1;

const FEEDBACK_SCHEMA_V1_CONTRACT = {
  topLevel: {
    schemaVersion: 'number',
    type: 'string',
    writingType: 'string',
    summary: 'string',
    overall: 'object|null',
    categories: 'array',
    grammarIssues: 'array',
    grammar: 'array',
    weaknesses: 'array',
    suggestions: 'array',
    improvements: 'array',
    sentencePatterns: 'array',
    sceneVocabulary: 'array',
    vocabulary: 'array',
    highlights: 'object',
    aiEvaluation: 'object',
    aiAnalysisBlock: 'object',
    analysisMeta: 'object|null',
    questionAnalysis: 'object|null',
  },
  analysisMeta: {
    status: 'string',
    updatedAt: 'number|null',
    degraded: 'boolean',
    errorCode: 'string|null',
    timings: 'object|null',
    schema: 'object|null',
    retryCount: 'number',
    lastAttemptAt: 'number|null',
    lastSuccessAt: 'number|null',
    lastFailureAt: 'number|null',
    lastError: 'string|null',
    queueState: 'string',
  },
  questionAnalysis: {
    type: 'string',
    status: 'string|null',
    overview: 'string',
    reason: 'string',
    themes: 'array',
    focusPoints: 'array',
    risks: 'array',
    suggestions: 'array',
    categories: 'array',
    keyPoints: 'array',
    summaryRules: 'array',
    missedPoints: 'array',
    personalOpinionAlerts: 'array',
    rhetoricalDevices: 'array',
    vocabulary: 'array',
    sceneVocabulary: 'array',
    sentencePatterns: 'array',
    phraseSuggestions: 'object',
    scenarioAnalysis: 'object|null',
    taskAnalysis: 'object|null',
    formatAnalysis: 'object|null',
    materialAnalysis: 'object|null',
    structureAnalysis: 'object|null',
    commentaryAnalysis: 'object|null',
    meta: 'object|null',
  },
};

const STRONG_CONTRACT_TYPES = new Set([
  'continuation',
  'argumentative',
  'summary',
  'speech',
  'letter',
  'notice',
  'diary',
  'report',
  'narrative',
  'picture_writing',
  'proposal',
  'review',
  'chart_writing',
  'expository',
]);

const TYPE_CONTRACTS = {
  continuation: [
    'questionAnalysis.storyLine.who',
    'questionAnalysis.storyLine.when',
    'questionAnalysis.storyLine.where',
    'questionAnalysis.storyLine.why',
    'questionAnalysis.storyLine.what',
    'questionAnalysis.storyLine.result',
    'questionAnalysis.emotionLine.initial',
    'questionAnalysis.plotAnalysis.translation',
    'questionAnalysis.starters.para1.text',
    'questionAnalysis.starters.para2.text',
    'questionAnalysis.contentAnalysis.plotLogic.accuracy',
  ],
  argumentative: [
    'questionAnalysis.thesisAnalysis.position',
    'questionAnalysis.evidenceEvaluation.sufficiency',
    'questionAnalysis.logicStructure.coherence',
  ],
  summary: [
    'questionAnalysis.keyPoints',
    'questionAnalysis.summaryRules',
  ],
  speech: [
    'questionAnalysis.structure.greeting',
    'questionAnalysis.structure.bodyPoints',
    'questionAnalysis.structure.callToAction',
    'questionAnalysis.toneAnalysis.appropriateness',
  ],
  letter: [
    'questionAnalysis.scenarioAnalysis.writerRole',
    'questionAnalysis.scenarioAnalysis.recipientRole',
    'questionAnalysis.scenarioAnalysis.purpose',
    'questionAnalysis.formatAnalysis.greeting',
    'questionAnalysis.formatAnalysis.bodyTasks',
    'questionAnalysis.taskAnalysis.hardRequirements',
    'questionAnalysis.contentAnalysis.communicationGoal',
  ],
  notice: [
    'questionAnalysis.scenarioAnalysis.writerRole',
    'questionAnalysis.scenarioAnalysis.recipientRole',
    'questionAnalysis.scenarioAnalysis.purpose',
    'questionAnalysis.formatAnalysis.openingTask',
    'questionAnalysis.taskAnalysis.hardRequirements',
    'questionAnalysis.contentAnalysis.communicationGoal',
  ],
  diary: [
    'questionAnalysis.formatAnalysis.openingTask',
    'questionAnalysis.taskAnalysis.hardRequirements',
    'questionAnalysis.emotionLine.initial',
    'questionAnalysis.emotionLine.changes',
    'questionAnalysis.contentAnalysis.communicationGoal',
  ],
  report: [
    'questionAnalysis.scenarioAnalysis.writerRole',
    'questionAnalysis.scenarioAnalysis.recipientRole',
    'questionAnalysis.scenarioAnalysis.purpose',
    'questionAnalysis.formatAnalysis.openingTask',
    'questionAnalysis.taskAnalysis.hardRequirements',
    'questionAnalysis.contentAnalysis.communicationGoal',
  ],
  narrative: [
    'questionAnalysis.storyLine.who',
    'questionAnalysis.storyLine.when',
    'questionAnalysis.storyLine.where',
    'questionAnalysis.storyLine.what',
    'questionAnalysis.emotionLine.initial',
    'questionAnalysis.contentAnalysis.communicationGoal',
  ],
  picture_writing: [
    'questionAnalysis.storyLine.who',
    'questionAnalysis.storyLine.where',
    'questionAnalysis.storyLine.what',
    'questionAnalysis.taskAnalysis.contentChecklist',
    'questionAnalysis.contentAnalysis.communicationGoal',
  ],
  proposal: [
    'questionAnalysis.scenarioAnalysis.purpose',
    'questionAnalysis.taskAnalysis.contentChecklist',
    'questionAnalysis.structure.bodyPoints',
    'questionAnalysis.structure.callToAction',
    'questionAnalysis.toneAnalysis.appropriateness',
  ],
  review: [
    'questionAnalysis.materialAnalysis.materialType',
    'questionAnalysis.materialAnalysis.topic',
    'questionAnalysis.commentaryAnalysis.stance',
    'questionAnalysis.commentaryAnalysis.reasoningPath',
    'questionAnalysis.contentAnalysis.communicationGoal',
  ],
  chart_writing: [
    'questionAnalysis.materialAnalysis.materialType',
    'questionAnalysis.taskAnalysis.contentChecklist',
    'questionAnalysis.structureAnalysis.summaryTask',
    'questionAnalysis.contentAnalysis.communicationGoal',
  ],
  expository: [
    'questionAnalysis.categories',
  ],
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toStringValue(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function toArrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function toObjectValue(value, fallback = {}) {
  return isPlainObject(value) ? value : fallback;
}

function toNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function normalizeFeedbackStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'complete' || normalized === 'success') {
    return FEEDBACK_STATUS.READY;
  }
  if (Object.values(FEEDBACK_STATUS).includes(normalized)) {
    return normalized;
  }
  return null;
}

function normalizeWritingType(type) {
  return String(type || '').trim().toLowerCase();
}

function pushTypeIssue(issues, path, expected, actualValue) {
  issues.push({
    path,
    expected,
    actual: Array.isArray(actualValue) ? 'array' : (actualValue === null ? 'null' : typeof actualValue),
  });
}

function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function hasContractValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== '';
}

function _nullableObjField(src, key) {
  return src[key] == null ? null : toObjectValue(src[key], {});
}

function _normalizeQaArrayChecks(qa, issues, pathPrefix) {
  if (qa.themes !== undefined && !Array.isArray(qa.themes)) pushTypeIssue(issues, `${pathPrefix}.themes`, 'array', qa.themes);
  if (qa.focusPoints !== undefined && !Array.isArray(qa.focusPoints)) pushTypeIssue(issues, `${pathPrefix}.focusPoints`, 'array', qa.focusPoints);
  if (qa.risks !== undefined && !Array.isArray(qa.risks)) pushTypeIssue(issues, `${pathPrefix}.risks`, 'array', qa.risks);
  if (qa.suggestions !== undefined && !Array.isArray(qa.suggestions)) pushTypeIssue(issues, `${pathPrefix}.suggestions`, 'array', qa.suggestions);
}

function _normalizeQaScalars(normalized, qa) {
  normalized.type = toStringValue(qa.type);
  normalized.status = normalizeFeedbackStatus(qa.status) || qa.status || null;
  normalized.overview = toStringValue(qa.overview);
  normalized.reason = toStringValue(qa.reason);
  normalized.themes = toArrayValue(qa.themes);
  normalized.focusPoints = toArrayValue(qa.focusPoints);
  normalized.risks = toArrayValue(qa.risks);
  normalized.suggestions = toArrayValue(qa.suggestions);
  normalized.categories = toArrayValue(qa.categories);
  normalized.keyPoints = toArrayValue(qa.keyPoints);
  normalized.summaryRules = toArrayValue(qa.summaryRules);
  normalized.missedPoints = toArrayValue(qa.missedPoints);
  normalized.personalOpinionAlerts = toArrayValue(qa.personalOpinionAlerts);
  normalized.rhetoricalDevices = toArrayValue(qa.rhetoricalDevices);
  normalized.vocabulary = toArrayValue(qa.vocabulary);
  normalized.sceneVocabulary = toArrayValue(qa.sceneVocabulary);
  normalized.sentencePatterns = toArrayValue(qa.sentencePatterns);
  normalized.phraseSuggestions = toObjectValue(qa.phraseSuggestions, { categories: [] });
  normalized.meta = isPlainObject(qa.meta) ? qa.meta : null;
}

function _normalizeQaObjFields(normalized, qa) {
  normalized.storyLine = _nullableObjField(qa, 'storyLine');
  normalized.emotionLine = _nullableObjField(qa, 'emotionLine');
  normalized.plotAnalysis = _nullableObjField(qa, 'plotAnalysis');
  normalized.starters = _nullableObjField(qa, 'starters');
  normalized.contentAnalysis = _nullableObjField(qa, 'contentAnalysis');
  normalized.thesisAnalysis = _nullableObjField(qa, 'thesisAnalysis');
  normalized.evidenceEvaluation = _nullableObjField(qa, 'evidenceEvaluation');
  normalized.logicStructure = _nullableObjField(qa, 'logicStructure');
  normalized.structure = _nullableObjField(qa, 'structure');
  normalized.toneAnalysis = _nullableObjField(qa, 'toneAnalysis');
  normalized.scenarioAnalysis = _nullableObjField(qa, 'scenarioAnalysis');
  normalized.taskAnalysis = _nullableObjField(qa, 'taskAnalysis');
  normalized.formatAnalysis = _nullableObjField(qa, 'formatAnalysis');
  normalized.materialAnalysis = _nullableObjField(qa, 'materialAnalysis');
  normalized.structureAnalysis = _nullableObjField(qa, 'structureAnalysis');
  normalized.commentaryAnalysis = _nullableObjField(qa, 'commentaryAnalysis');
}

function normalizeQuestionAnalysisPayload(questionAnalysis, issues, pathPrefix = 'questionAnalysis') {
  if (questionAnalysis == null) return null;
  if (!isPlainObject(questionAnalysis)) {
    pushTypeIssue(issues, pathPrefix, 'object|null', questionAnalysis);
    return null;
  }
  const normalized = { ...questionAnalysis };
  _normalizeQaArrayChecks(questionAnalysis, issues, pathPrefix);
  _normalizeQaScalars(normalized, questionAnalysis);
  _normalizeQaObjFields(normalized, questionAnalysis);
  return normalized;
}

function normalizeAnalysisMetaPayload(analysisMeta, issues, pathPrefix = 'analysisMeta') {
  if (analysisMeta == null) return null;
  if (!isPlainObject(analysisMeta)) {
    pushTypeIssue(issues, pathPrefix, 'object|null', analysisMeta);
    return null;
  }

  return {
    ...analysisMeta,
    status: normalizeFeedbackStatus(analysisMeta.status) || analysisMeta.status || null,
    updatedAt: toNumberOrNull(analysisMeta.updatedAt),
    degraded: Boolean(analysisMeta.degraded),
    errorCode: analysisMeta.errorCode ? toStringValue(analysisMeta.errorCode) : null,
    timings: isPlainObject(analysisMeta.timings) ? analysisMeta.timings : null,
    schema: isPlainObject(analysisMeta.schema) ? analysisMeta.schema : null,
    retryCount: Number(analysisMeta.retryCount || 0) || 0,
    lastAttemptAt: toNumberOrNull(analysisMeta.lastAttemptAt),
    lastSuccessAt: toNumberOrNull(analysisMeta.lastSuccessAt),
    lastFailureAt: toNumberOrNull(analysisMeta.lastFailureAt),
    lastError: analysisMeta.lastError ? toStringValue(analysisMeta.lastError) : null,
    queueState: toStringValue(analysisMeta.queueState || 'idle') || 'idle',
  };
}

export function getFeedbackSchemaContract() {
  return {
    version: FEEDBACK_SCHEMA_VERSION,
    contract: FEEDBACK_SCHEMA_V1_CONTRACT,
    strongTypes: Array.from(STRONG_CONTRACT_TYPES),
    typeContracts: TYPE_CONTRACTS,
  };
}

export function validateAndNormalizeFeedbackSchema(feedback) {
  const issues = [];
  const base = isPlainObject(feedback) ? { ...feedback } : {};
  if (!isPlainObject(feedback)) {
    pushTypeIssue(issues, 'feedback', 'object', feedback);
  }

  const normalized = {
    ...base,
    schemaVersion: FEEDBACK_SCHEMA_VERSION,
    type: toStringValue(base.type),
    writingType: toStringValue(base.writingType || base.type),
    summary: toStringValue(base.summary),
    overall: base.overall == null ? null : base.overall,
    categories: toArrayValue(base.categories),
    grammarIssues: toArrayValue(base.grammarIssues),
    grammar: toArrayValue(base.grammar),
    weaknesses: toArrayValue(base.weaknesses),
    suggestions: toArrayValue(base.suggestions),
    improvements: toArrayValue(base.improvements),
    sentencePatterns: toArrayValue(base.sentencePatterns),
    sceneVocabulary: toArrayValue(base.sceneVocabulary),
    vocabulary: toArrayValue(base.vocabulary),
    highlights: toObjectValue(base.highlights, {}),
    aiEvaluation: toObjectValue(base.aiEvaluation, {}),
    aiAnalysisBlock: toObjectValue(base.aiAnalysisBlock, {}),
    analysisMeta: normalizeAnalysisMetaPayload(base.analysisMeta, issues),
    questionAnalysis: normalizeQuestionAnalysisPayload(base.questionAnalysis, issues),
  };

  const normalizedType = normalizeWritingType(normalized.writingType || normalized.type);
  const contract = TYPE_CONTRACTS[normalizedType] || [];
  const missingFields = contract.filter((path) => !hasContractValue(getValueByPath(normalized, path)));
  const contractStrength = STRONG_CONTRACT_TYPES.has(normalizedType) ? 'strong' : 'weak';
  const contractValid = contractStrength === 'weak' ? true : missingFields.length === 0;

  return {
    normalized,
    validation: {
      schemaVersion: FEEDBACK_SCHEMA_VERSION,
      valid: issues.length === 0,
      issues,
      contract: {
        type: normalizedType || 'general',
        strength: contractStrength,
        valid: contractValid,
        missingFields,
      },
    },
  };
}

export {
  FEEDBACK_SCHEMA_VERSION,
  FEEDBACK_STATUS,
  isPlainObject,
  normalizeFeedbackStatus,
  normalizeWritingType,
};
