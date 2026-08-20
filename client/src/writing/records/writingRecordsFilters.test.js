import { describe, expect, it } from 'vitest';

import {
  applySectionFilter,
  hasRunningBackgroundWork,
  matchesPendingFilter,
} from './writingRecordsFilters.js';

describe('writingRecordsFilters', () => {
  it('treats supplemental pending as background work and pending filter match', () => {
    const statuses = {
      quickStatus: 'ready',
      supplementalStatus: 'pending',
      detailedStatus: 'not_requested',
      analysisStatus: 'ready',
    };

    expect(matchesPendingFilter(statuses)).toBe(true);
    expect(hasRunningBackgroundWork([
      {
        feedbackStatus: {
          quickFeedbackStatus: 'ready',
          supplementalFeedbackStatus: 'pending',
          detailedFeedbackStatus: 'not_requested',
        },
        analysisMeta: { status: 'ready' },
      },
    ])).toBe(true);
  });

  it('keeps in-progress supplemental feedback out of the ready section', () => {
    const readyWriting = {
      id: 'ready',
      feedbackStatus: {
        quickFeedbackStatus: 'ready',
        supplementalFeedbackStatus: 'ready',
        detailedFeedbackStatus: 'not_requested',
      },
      analysisMeta: { status: 'ready' },
    };
    const pendingWriting = {
      id: 'pending',
      feedbackStatus: {
        quickFeedbackStatus: 'ready',
        supplementalFeedbackStatus: 'pending',
        detailedFeedbackStatus: 'not_requested',
      },
      analysisMeta: { status: 'ready' },
    };

    expect(applySectionFilter([readyWriting, pendingWriting], 'ready').map((item) => item.id)).toEqual(['ready']);
    expect(applySectionFilter([readyWriting, pendingWriting], 'pending').map((item) => item.id)).toEqual(['pending']);
  });

  it('keeps failed supplemental feedback in the failed section only', () => {
    const failedSupplementalWriting = {
      id: 'supplemental-failed',
      feedbackStatus: {
        quickFeedbackStatus: 'ready',
        supplementalFeedbackStatus: 'failed',
        detailedFeedbackStatus: 'not_requested',
      },
      analysisMeta: { status: 'ready' },
    };

    expect(applySectionFilter([failedSupplementalWriting], 'ready')).toEqual([]);
    expect(applySectionFilter([failedSupplementalWriting], 'failed').map((item) => item.id)).toEqual(['supplemental-failed']);
  });
});
