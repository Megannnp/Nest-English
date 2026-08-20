import { getAnalysisStatus } from './constants.js';

export function splitWritingCollections(writings = []) {
  return {
    taskWritings: writings.filter((writing) => Boolean(writing.assignmentId) || writing.source === 'homework'),
    practiceWritings: writings.filter((writing) => !(Boolean(writing.assignmentId) || writing.source === 'homework')),
  };
}

export function getWritingPipelineStatuses(writing) {
  return {
    analysisStatus: getAnalysisStatus(writing),
    quickStatus: writing?.feedbackStatus?.quickFeedbackStatus || 'not_started',
    supplementalStatus: writing?.feedbackStatus?.supplementalFeedbackStatus || 'not_started',
    detailedStatus: writing?.feedbackStatus?.detailedFeedbackStatus || 'not_requested',
  };
}

export function matchesReadyFilter(statuses) {
  return (
    statuses.quickStatus === 'ready'
    && statuses.analysisStatus === 'ready'
    && !['pending', 'running', 'failed'].includes(statuses.supplementalStatus)
    && !['pending', 'running', 'failed'].includes(statuses.detailedStatus)
  );
}

export function matchesPendingFilter(statuses) {
  return (
    statuses.quickStatus === 'running'
    || statuses.supplementalStatus === 'pending'
    || statuses.supplementalStatus === 'running'
    || statuses.detailedStatus === 'pending'
    || statuses.detailedStatus === 'running'
    || statuses.analysisStatus === 'pending'
  );
}

export function matchesFailedFilter(statuses) {
  return (
    statuses.quickStatus === 'failed'
    || statuses.supplementalStatus === 'failed'
    || statuses.detailedStatus === 'failed'
    || statuses.analysisStatus === 'failed'
  );
}

export function applySectionFilter(items, filter) {
  return items.filter((writing) => {
    const statuses = getWritingPipelineStatuses(writing);

    if (filter === 'ready') {
      return matchesReadyFilter(statuses);
    }
    if (filter === 'pending') {
      return matchesPendingFilter(statuses);
    }
    if (filter === 'partial') {
      return statuses.analysisStatus === 'partial';
    }
    if (filter === 'failed') {
      return matchesFailedFilter(statuses);
    }
    return true;
  });
}

export function hasRunningBackgroundWork(writings = []) {
  return writings.some((writing) => {
    const { quickStatus, supplementalStatus, detailedStatus, analysisStatus } = getWritingPipelineStatuses(writing);
    return (
      quickStatus === 'running'
      || supplementalStatus === 'pending'
      || supplementalStatus === 'running'
      || detailedStatus === 'pending'
      || detailedStatus === 'running'
      || analysisStatus === 'pending'
      || analysisStatus === 'partial'
    );
  });
}
