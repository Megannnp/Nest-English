import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { reconcileBatchItemTargets } from './shared.js';
import { useBatchGradingModel } from './useBatchGradingModel.js';

vi.mock('./useBatchGradingDerivedState.js', () => ({
  useBatchGradingDerivedState: () => ({
    doneCount: 0,
    errorCount: 0,
    canceledCount: 0,
    confirmedCount: 0,
    incompleteCount: 0,
    canConfirmAll: false,
    canFillByRosterOrder: false,
    canStartGrading: false,
    progress: 0,
  }),
}));

vi.mock('./useBatchGradingUploadActions.js', () => ({
  useBatchGradingUploadActions: () => ({
    addFiles: vi.fn(),
    updateItem: vi.fn(),
    createBoundWritingForItem: vi.fn(),
    handleStudentSelect: vi.fn(),
    removeItem: vi.fn(),
    clearAllItems: vi.fn(),
    handleConfirmItem: vi.fn(),
    confirmAll: vi.fn(),
    fillUnmatchedByRosterOrder: vi.fn(),
    retryOCR: vi.fn(),
    runOCR: vi.fn(),
  }),
}));

vi.mock('./useBatchGradingJobRuntime.js', () => ({
  useBatchGradingJobRuntime: () => ({
    loadRecentBatchJobs: vi.fn(),
    attachBatchJob: vi.fn(),
    runGrading: vi.fn(),
    pauseBatchJob: vi.fn(),
    resumeBatchJob: vi.fn(),
    cancelBatchJob: vi.fn(),
    retryFailedBatchJob: vi.fn(),
    continueIncompleteBatchJob: vi.fn(),
  }),
}));

describe('useBatchGradingModel', () => {
  it('initializes without accessing addFiles before upload actions are created', () => {
    const { result } = renderHook(() => useBatchGradingModel({
      user: { id: 'teacher-1', role: 'teacher', className: 'Class A' },
      questions: [],
      studentsInClass: [],
    }));

    expect(typeof result.current.addFiles).toBe('function');
    expect(typeof result.current.handleDropFiles).toBe('function');
  });

  it('clears stale student targets when the current student options no longer contain them', () => {
    const items = [
      {
        localId: 'item-1',
        status: 'error',
        studentName: '陈梦彤',
        studentTargetKey: 'user:stale',
        writingOwnerId: 'user:stale',
        writingId: '',
        errorMsg: null,
      },
    ];

    const result = reconcileBatchItemTargets(items, [
      { key: 'user:1', name: '张三' },
    ]);

    expect(result[0]).toMatchObject({
      status: 'confirm',
      studentTargetKey: '',
      writingOwnerId: '',
      errorMsg: '当前学生目标已失效，请重新选择学生',
    });
  });
});
