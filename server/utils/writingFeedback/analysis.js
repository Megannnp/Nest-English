import {
  FEEDBACK_STATUS,
  FEEDBACK_SCHEMA_VERSION,
  isPlainObject,
  normalizeFeedbackStatus,
  normalizeWritingType,
  validateAndNormalizeFeedbackSchema,
} from '../feedbackSchema.js';

function _hasContentList(obj, ...keys) {
  return keys.some((k) => Array.isArray(obj?.[k]) && obj[k].length > 0);
}

function hasGeneralAnalysisContent(feedback) {
  return Boolean(
    feedback?.overview ||
    feedback?.reason ||
    _hasContentList(feedback, 'themes', 'focusPoints', 'risks', 'suggestions')
  );
}

function _checkContinuationStarters(starters) {
  return Boolean(starters.para1?.text && starters.para2?.text);
}

function _hasReadyContinuation(fb) {
  const starters = fb?.starters || {};
  const ca = fb?.contentAnalysis || {};
  const storyLine = fb?.storyLine || {};
  const plotAnalysis = fb?.plotAnalysis || {};
  return Boolean(
    storyLine.who &&
    plotAnalysis.translation &&
    _checkContinuationStarters(starters) &&
    (ca.plotLogic || {}).accuracy
  );
}

function _hasReadyArgumentative(fb) {
  return Boolean(
    fb?.thesisAnalysis?.position &&
    fb?.evidenceEvaluation?.sufficiency !== undefined &&
    fb?.logicStructure?.coherence !== undefined
  );
}

function _hasReadySummary(fb) {
  return Boolean(
    Array.isArray(fb?.keyPoints) && fb.keyPoints.length > 0 &&
    Array.isArray(fb?.summaryRules) && fb.summaryRules.length > 0
  );
}

function _hasReadySpeech(fb) {
  return Boolean(
    fb?.structure?.greeting &&
    Array.isArray(fb?.structure?.bodyPoints) &&
    fb.structure.bodyPoints.length > 0 &&
    fb?.structure?.callToAction &&
    fb?.toneAnalysis?.appropriateness !== undefined
  );
}

function _hasReadyExpository(fb) {
  return Boolean(
    fb?.overview &&
    Array.isArray(fb?.categories) && fb.categories.length > 0
  );
}

const READY_CHECKERS = {
  continuation: _hasReadyContinuation,
  argumentative: _hasReadyArgumentative,
  summary: _hasReadySummary,
  speech: _hasReadySpeech,
  expository: _hasReadyExpository,
};

function hasReadyAnalysisContent(feedback, writingType) {
  const type = normalizeWritingType(writingType || feedback?.writingType || feedback?.type);
  const checker = READY_CHECKERS[type];
  return checker ? checker(feedback) : hasGeneralAnalysisContent(feedback);
}

function deriveAnalysisStatus(feedback, writingType) {
  const explicitStatus = normalizeFeedbackStatus(feedback?.status);
  const hasContent = hasGeneralAnalysisContent(feedback);
  const isReady = hasReadyAnalysisContent(feedback, writingType);

  if (explicitStatus === FEEDBACK_STATUS.READY) return FEEDBACK_STATUS.READY;
  if (explicitStatus === FEEDBACK_STATUS.PARTIAL) return isReady ? FEEDBACK_STATUS.READY : FEEDBACK_STATUS.PARTIAL;
  if (explicitStatus === FEEDBACK_STATUS.PENDING) return hasContent ? FEEDBACK_STATUS.PARTIAL : FEEDBACK_STATUS.PENDING;
  if (explicitStatus === FEEDBACK_STATUS.FAILED) return hasContent ? FEEDBACK_STATUS.PARTIAL : FEEDBACK_STATUS.FAILED;

  if (isReady) return FEEDBACK_STATUS.READY;
  if (hasContent) return FEEDBACK_STATUS.PARTIAL;
  return FEEDBACK_STATUS.PENDING;
}

function _buildTimingsMeta(source) {
  if (!source) return null;
  return {
    startedAt: Number(source.startedAt || 0) || null,
    finishedAt: Number(source.finishedAt || 0) || null,
    totalDurationMs: Number(source.totalDurationMs || 0) || null,
    stages: Array.isArray(source.stages) ? source.stages : [],
  };
}

function _buildSchemaMeta(source) {
  if (!source) return null;
  return {
    valid: Boolean(source.valid),
    missing: Array.isArray(source.missing) ? source.missing : [],
    sanitized: Boolean(source.sanitized),
    issues: Array.isArray(source.issues) ? source.issues : [],
  };
}

function _resolveMetaSources(feedback) {
  const embeddedMeta = isPlainObject(feedback?.analysisMeta) ? feedback.analysisMeta : {};
  const qaMeta = isPlainObject(feedback?.questionAnalysis?.meta) ? feedback.questionAnalysis.meta : {};
  const timingsSource = isPlainObject(embeddedMeta.timings) ? embeddedMeta.timings
    : (isPlainObject(qaMeta) ? qaMeta : null);
  const schemaSource = isPlainObject(embeddedMeta.schema) ? embeddedMeta.schema
    : (isPlainObject(qaMeta.schema) ? qaMeta.schema : null);
  return { embeddedMeta, qaMeta, timingsSource, schemaSource };
}

function _pickTs(em, sn, key) {
  return Number(em[key] || sn[key] || 0) || null;
}

function _buildMetaRetryState(em, sn) {
  return {
    retryCount: Number(em.retryCount || sn.retryCount || 0) || 0,
    lastAttemptAt: _pickTs(em, sn, 'lastAttemptAt'),
    lastSuccessAt: _pickTs(em, sn, 'lastSuccessAt'),
    lastFailureAt: _pickTs(em, sn, 'lastFailureAt'),
    lastError: em.lastError || sn.lastError || null,
    queueState: em.queueState || sn.queueState || 'idle',
  };
}

export function buildAnalysisMeta(feedback, writingType, snapshot = {}) {
  const { embeddedMeta, qaMeta, timingsSource, schemaSource } = _resolveMetaSources(feedback);
  return {
    status: deriveAnalysisStatus(feedback, writingType),
    updatedAt: Number(embeddedMeta.updatedAt || qaMeta.finishedAt || feedback?.updatedAt || snapshot.updatedAt || 0) || null,
    degraded: Boolean(feedback?.degraded ?? embeddedMeta.degraded ?? snapshot.degraded),
    errorCode: feedback?.errorCode || embeddedMeta.errorCode || snapshot.errorCode || null,
    timings: _buildTimingsMeta(timingsSource),
    schema: _buildSchemaMeta(schemaSource),
    ..._buildMetaRetryState(embeddedMeta, snapshot),
  };
}

function resolveFeedbackStatus(existingStatus, incomingStatus) {
  const current = normalizeFeedbackStatus(existingStatus);
  const next = normalizeFeedbackStatus(incomingStatus);

  if (!next) return current;
  if (!current) return next;

  if (current === FEEDBACK_STATUS.READY || next === FEEDBACK_STATUS.READY) {
    return FEEDBACK_STATUS.READY;
  }
  if (current === FEEDBACK_STATUS.PARTIAL || next === FEEDBACK_STATUS.PARTIAL) {
    return FEEDBACK_STATUS.PARTIAL;
  }
  if (current === FEEDBACK_STATUS.FAILED && next === FEEDBACK_STATUS.PENDING) {
    return FEEDBACK_STATUS.FAILED;
  }
  if (current === FEEDBACK_STATUS.PENDING && next === FEEDBACK_STATUS.FAILED) {
    return FEEDBACK_STATUS.FAILED;
  }

  return next;
}

export function mergeFeedback(existing, incoming) {
  if (Array.isArray(incoming)) return incoming;
  if (!isPlainObject(incoming)) return incoming;

  const base = isPlainObject(existing) ? existing : {};
  const merged = { ...base };

  Object.entries(incoming).forEach(([key, value]) => {
    if (value === undefined) return;
    merged[key] = isPlainObject(value) ? mergeFeedback(base[key], value) : value;
  });

  return merged;
}

export function finalizeFeedback(existing, merged, incoming, writingType) {
  const resolvedStatus = resolveFeedbackStatus(existing?.status, incoming?.status);
  const { normalized, validation } = validateAndNormalizeFeedbackSchema({ ...merged });
  const finalized = normalized;

  finalized.status = resolvedStatus || deriveAnalysisStatus(finalized, writingType);
  finalized.updatedAt = Date.now();
  finalized.analysisMeta = buildAnalysisMeta(finalized, writingType, existing?.analysisMeta || {});
  finalized.analysisMeta.schema = {
    ...(finalized.analysisMeta.schema || {}),
    contractVersion: FEEDBACK_SCHEMA_VERSION,
    valid: validation.valid,
    issues: validation.issues,
    feedbackType: validation.contract.type,
    contractStrength: validation.contract.strength,
    contractValid: validation.contract.valid,
    contractMissingFields: validation.contract.missingFields,
  };
  return finalized;
}

export function createDraftFeedback(writingType) {
  return finalizeFeedback(
    {},
    {
      type: writingType || '',
      writingType: writingType || '',
      status: FEEDBACK_STATUS.PENDING,
      analysisMeta: {
        queueState: 'idle',
      },
      questionAnalysis: null,
    },
    {
      status: FEEDBACK_STATUS.PENDING,
    },
    writingType
  );
}
