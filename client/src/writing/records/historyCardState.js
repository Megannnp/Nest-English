import {
  pct,
  getAnalysisStatus,
  getAnalysisBadge,
  getPipelineBadge,
  getPipelineStage,
} from './constants.js';

export function buildHistoryCardState(writing, retrying) {
  const feedbackStatus = writing.feedbackStatus || {};
  const hasFeedback = Boolean(writing.feedback);
  const analysisStatus = getAnalysisStatus(writing);
  const analysisBadge = getAnalysisBadge(analysisStatus);
  const pipelineStage = getPipelineStage(writing);
  const pipelineBadge = getPipelineBadge(pipelineStage);
  const queueState = writing.analysisMeta?.queueState || 'idle';
  const score = writing.feedback?.totalScore;
  const maxScore = writing.maxScore || 15;
  const hasScore = score != null && score !== '';
  const scorePercent = hasScore ? pct(Number(score), maxScore) : null;
  const quickFailed = feedbackStatus.quickFeedbackStatus === 'failed';
  const detailedReady = feedbackStatus.detailedFeedbackStatus === 'ready';
  const quickReady = feedbackStatus.quickFeedbackStatus === 'ready';
  const supplementalFailed = feedbackStatus.supplementalFeedbackStatus === 'failed';
  const supplementalRunning = feedbackStatus.supplementalFeedbackStatus === 'pending' || feedbackStatus.supplementalFeedbackStatus === 'running';
  const supplementalActive = ['pending', 'running', 'ready', 'failed'].includes(feedbackStatus.supplementalFeedbackStatus);

  return {
    isHomework: writing.source === 'homework',
    hasAI: hasFeedback,
    analysisStatus,
    analysisBadge,
    queueState,
    retryBlocked: retrying || queueState === 'queued' || queueState === 'running',
    score,
    maxScore,
    hasScore,
    scorePercent,
    feedbackStatus,
    quickFailed,
    pipelineStage,
    pipelineBadge,
    detailedReady,
    quickReady,
    supplementalFailed,
    supplementalRunning,
    supplementalActive,
    canRequestDetailed: hasFeedback && quickReady && !detailedReady && !supplementalActive,
    canViewFeedback: hasFeedback,
    canExpandFeedback: hasFeedback || quickFailed,
  };
}

export function getAnalysisStatusMessage(analysisStatus) {
  if (analysisStatus === 'pending') return '题目分析正在后台生成，当前可先查看主批改结果。';
  if (analysisStatus === 'partial') return '题目分析已生成部分内容，剩余模块正在补充或尚未完全写回。';
  if (analysisStatus === 'failed') return '题目分析未完整生成，当前先保留已有结果，建议稍后刷新查看。';
  return '';
}

export function getPipelineStageMessage(pipelineStage) {
  if (pipelineStage === 'quick_running') return '基础反馈仍在后台生成中，这条记录会自动刷新，无需反复手动刷新。';
  if (pipelineStage === 'quick_failed') return '基础反馈这次没有成功生成，你可以直接点击下方按钮重新触发。';
  if (pipelineStage === 'supplemental_running') return '基础诊断已生成，完整精批正在后台补齐中。';
  if (pipelineStage === 'supplemental_failed') return '完整精批这次没有补齐成功，但当前基础诊断仍可查看，你可以直接重试补齐。';
  if (pipelineStage === 'detail_running') return '基础反馈已可查看，详细反馈还在后台补充中。';
  if (pipelineStage === 'detail_failed') return '详细反馈补充失败，但当前基础反馈仍然可以正常查看。';
  if (pipelineStage === 'analysis_running') return '主反馈已可查看，题目分析还在后台补充中。';
  if (pipelineStage === 'analysis_failed') return '题目分析暂未补全，当前先保留已有结果。';
  return '';
}
