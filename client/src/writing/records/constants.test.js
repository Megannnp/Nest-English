import { describe, expect, it } from 'vitest';

import { getPipelineStage } from './constants.js';
import { buildHistoryCardState } from './historyCardState.js';

describe('writing manage pipeline stage', () => {
  it('surfaces supplemental feedback running and failed states', () => {
    expect(getPipelineStage({
      feedback: { summary: '基础反馈已完成' },
      feedbackStatus: {
        quickFeedbackStatus: 'ready',
        supplementalFeedbackStatus: 'running',
        detailedFeedbackStatus: 'not_requested',
      },
      analysisMeta: { status: 'ready' },
    })).toBe('supplemental_running');

    expect(getPipelineStage({
      feedback: { summary: '基础反馈已完成' },
      feedbackStatus: {
        quickFeedbackStatus: 'ready',
        supplementalFeedbackStatus: 'failed',
        detailedFeedbackStatus: 'not_requested',
      },
      analysisMeta: { status: 'ready' },
    })).toBe('supplemental_failed');
  });

  it('does not offer legacy detailed generation when supplemental feedback is active', () => {
    const baseWriting = {
      feedback: { summary: '基础反馈已完成' },
      feedbackStatus: {
        quickFeedbackStatus: 'ready',
        supplementalFeedbackStatus: 'ready',
        detailedFeedbackStatus: 'not_requested',
      },
      analysisMeta: { status: 'ready' },
      maxScore: 15,
    };

    expect(buildHistoryCardState(baseWriting, false).canRequestDetailed).toBe(false);
    expect(buildHistoryCardState({
      ...baseWriting,
      feedbackStatus: {
        ...baseWriting.feedbackStatus,
        supplementalFeedbackStatus: 'not_started',
      },
    }, false).canRequestDetailed).toBe(true);
  });

  it('treats supplemental pending as active running state in real card state', () => {
    const state = buildHistoryCardState({
      feedback: { summary: '基础反馈已完成' },
      feedbackStatus: {
        quickFeedbackStatus: 'ready',
        supplementalFeedbackStatus: 'pending',
        detailedFeedbackStatus: 'not_requested',
      },
      analysisMeta: { status: 'ready' },
      maxScore: 15,
    }, false);

    expect(state.supplementalRunning).toBe(true);
    expect(state.supplementalActive).toBe(true);
    expect(state.canRequestDetailed).toBe(false);
  });

  it('does not expose full feedback action when quick feedback failed without payload', () => {
    const state = buildHistoryCardState({
      feedback: null,
      feedbackStatus: {
        quickFeedbackStatus: 'failed',
        supplementalFeedbackStatus: 'not_started',
        detailedFeedbackStatus: 'not_requested',
      },
      analysisMeta: { status: 'failed' },
      maxScore: 15,
    }, false);

    expect(state.canExpandFeedback).toBe(true);
    expect(state.canViewFeedback).toBe(false);
    expect(state.canRequestDetailed).toBe(false);
  });
});
