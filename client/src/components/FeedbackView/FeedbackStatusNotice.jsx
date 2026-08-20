import ProductState from '../shared/ProductState.jsx';

function getAnalysisStatus(feedback) {
  const analysisMeta = feedback?.analysisMeta || {};
  const questionAnalysis = feedback?.questionAnalysis || feedback || {};

  return {
    analysisMeta,
    questionAnalysis,
    status: String(analysisMeta.status || questionAnalysis.status || '').trim().toLowerCase(),
    fallbackSource: String(
      questionAnalysis.fallbackSource || analysisMeta.fallbackSource || 'none'
    ).trim().toLowerCase(),
    fallbackMessage: questionAnalysis?.error?.message || '',
  };
}

function createAnalysisStatusState(tone, title, description) {
  return { tone, title, description };
}

function getPreviousResultState(fallbackMessage) {
  return createAnalysisStatusState(
    'warning',
    '当前显示的是上一次可用的题目分析',
    fallbackMessage || '这次题目分析没有完整生成成功，系统先保留了上一次可用结果，方便你继续修改作文。'
  );
}

function getPartialAnalysisState(status, fallbackMessage, writingTypeLabel) {
  return createAnalysisStatusState(
    status === 'failed' ? 'error' : 'warning',
    status === 'failed' ? '题目分析暂未生成成功' : '题目分析仅返回部分内容',
    fallbackMessage || `当前只拿到了${writingTypeLabel ? `「${writingTypeLabel}」` : ''}题目分析的部分结果，建议先结合写作评价继续修改，稍后再回来刷新查看。`
  );
}

function getPendingAnalysisState(questionAnalysis, writingTypeLabel) {
  return createAnalysisStatusState(
    'loading',
    '题目分析仍在补充中',
    questionAnalysis?.overview || `系统正在继续补充${writingTypeLabel ? `「${writingTypeLabel}」` : ''}的题目理解、任务要求和写作建议。`
  );
}

export function buildAnalysisStatusState(feedback, writingTypeLabel = '') {
  const {
    fallbackMessage,
    fallbackSource,
    questionAnalysis,
    status,
  } = getAnalysisStatus(feedback);

  if (status === 'failed' && fallbackSource === 'previous_result') {
    return getPreviousResultState(fallbackMessage);
  }

  if ((status === 'partial' || status === 'failed') && fallbackSource === 'none') {
    return getPartialAnalysisState(status, fallbackMessage, writingTypeLabel);
  }

  if (status === 'pending') {
    return getPendingAnalysisState(questionAnalysis, writingTypeLabel);
  }

  return null;
}

function getSupplementalStatus(feedback) {
  const analysisMeta = feedback?.analysisMeta || {};

  return {
    analysisMeta,
    supplementalStatus: String(analysisMeta?.supplementalStatus || '').trim().toLowerCase(),
  };
}

function getSupplementalFailedState(analysisMeta) {
  return createAnalysisStatusState(
    'warning',
    '完整精批暂未补齐',
    analysisMeta?.supplementalLastError || '当前先展示基础反馈和已有建议，范文与更细的语言分析稍后可再回来查看。'
  );
}

function getSupplementalLoadingState() {
  return createAnalysisStatusState(
    'loading',
    '完整精批补充中',
    '基础反馈已经可以查看，范文、语言细节和高阶建议仍在继续生成。'
  );
}

function getDegradedEvaluationState(analysisMeta) {
  const fallbackSource = String(analysisMeta?.fallbackSource || '').trim().toLowerCase();

  return createAnalysisStatusState(
    'warning',
    fallbackSource === 'previous_result' ? '当前结果包含历史可用内容' : '当前结果包含降级内容',
    '这次 AI 结果没有完整返回，系统保留了可用部分，建议结合原文与教师要求继续判断。'
  );
}

export function buildEvaluationStatusState(feedback) {
  const { analysisMeta, supplementalStatus } = getSupplementalStatus(feedback);

  if (supplementalStatus === 'failed') {
    return getSupplementalFailedState(analysisMeta);
  }

  if (supplementalStatus === 'running' || supplementalStatus === 'pending') {
    return getSupplementalLoadingState();
  }

  if (analysisMeta?.degraded) {
    return getDegradedEvaluationState(analysisMeta);
  }

  return null;
}

export function buildExportStatusItems(feedback, writingTypeLabel = '') {
  const items = [];
  const analysisState = buildAnalysisStatusState(feedback, writingTypeLabel);
  const evaluationState = buildEvaluationStatusState(feedback);

  if (analysisState) {
    items.push({
      section: '题目分析',
      ...analysisState,
    });
  }

  if (evaluationState) {
    items.push({
      section: '写作评价',
      ...evaluationState,
    });
  }

  return items;
}

export default function FeedbackStatusNotice({ state, style }) {
  if (!state) return null;

  return (
    <ProductState
      compact
      tone={state.tone}
      title={state.title}
      description={state.description}
      style={style}
    />
  );
}
