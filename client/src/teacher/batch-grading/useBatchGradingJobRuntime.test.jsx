import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBatchGradingJobRuntime } from './useBatchGradingJobRuntime.js';

const { batchGradingAPI } = vi.hoisted(() => ({
  batchGradingAPI: {
    createJob: vi.fn(),
    listJobs: vi.fn(),
    getJob: vi.fn(),
    pauseJob: vi.fn(),
    resumeJob: vi.fn(),
    cancelJob: vi.fn(),
    retryFailed: vi.fn(),
    continueIncomplete: vi.fn(),
  },
}));

vi.mock('../../api/index.js', () => ({
  batchGradingAPI,
}));

function createProps(overrides = {}) {
  const itemsRef = overrides.itemsRef || {
    current: [
      {
        file: { name: '作文-1.png' },
        preview: '',
        status: 'confirmed',
        studentName: '学生甲',
        studentTargetKey: '',
        detectedName: null,
        feedback: null,
        errorMsg: null,
        writingId: 'writing-1',
        writingOwnerId: '',
      },
    ],
  };

  return {
    currentJobId: '',
    itemsRef,
    max: 20,
    pauseRef: { current: false },
    phase: 'confirm',
    recentJobsFilter: 'active',
    runGradingFallback: { abortRef: { current: false } },
    selectedAssignment: { questionId: 'question-1' },
    selectedAssignmentId: 'assignment-1',
    selectedClassId: 'class-1',
    selectedQId: 'question-1',
    sessionController: {
      setJobIdentity: vi.fn(),
      syncFromRemoteJob: vi.fn(),
      markRunStarting: vi.fn(),
      markRunFailedBackToConfirm: vi.fn(),
      markRunFinished: vi.fn(),
      markLocalCancelWithoutJob: vi.fn(),
    },
    setItems: vi.fn((updater) => {
      const next = typeof updater === 'function' ? updater(itemsRef.current) : updater;
      itemsRef.current = next;
      return next;
    }),
    updateItem: vi.fn((index, patch) => {
      itemsRef.current[index] = {
        ...itemsRef.current[index],
        ...patch,
      };
    }),
    user: { role: 'teacher' },
    createBoundWritingForItem: vi.fn(async (index) => itemsRef.current[index]?.writingId || ''),
    mapRemoteStatusToLocalStatus: vi.fn((remote, currentStatus = '') => {
      if (remote.status === 'running') return 'grading';
      if (remote.status === 'pending') return 'confirmed';
      if (remote.status === 'succeeded') return 'done';
      if (remote.status === 'failed') return 'error';
      if (remote.status === 'canceled' || remote.status === 'cancelled') return 'canceled';
      return currentStatus || 'confirmed';
    }),
    loadRecentBatchJobsState: {
      recentJobsFilter: 'active',
      setRecentJobs: vi.fn(),
      setRecentJobsLoading: vi.fn(),
      setSelectedAssignmentId: vi.fn(),
      setSelectedClassId: vi.fn(),
    },
    ...overrides,
  };
}

describe('useBatchGradingJobRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    batchGradingAPI.listJobs.mockResolvedValue([]);
    batchGradingAPI.getJob.mockResolvedValue({ id: 'job-poll', status: 'running', items: [] });
  });

  it('blocks grading when teacher items are still unconfirmed', async () => {
    const itemsRef = {
      current: [
        {
          file: { name: '作文-1.png' },
          status: 'confirm',
          studentName: '学生甲',
          writingId: '',
        },
      ],
    };
    const props = createProps({ itemsRef });
    const { result } = renderHook(() => useBatchGradingJobRuntime(props));

    await waitFor(() => {
      expect(batchGradingAPI.listJobs).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.runGrading();
    });

    expect(props.sessionController.markRunStarting).toHaveBeenCalled();
    expect(props.sessionController.markRunFailedBackToConfirm).toHaveBeenCalled();
    expect(batchGradingAPI.createJob).not.toHaveBeenCalled();
  });

  it('applies remote job snapshot into local batch items and synced selectors', async () => {
    const props = createProps({
      itemsRef: {
        current: [
          {
            file: { name: '原图.png' },
            preview: '',
            status: 'confirmed',
            studentName: '学生甲',
            studentTargetKey: '',
            detectedName: null,
            feedback: null,
            errorMsg: null,
            writingId: 'writing-1',
            writingOwnerId: '',
          },
          {
            file: { name: '原图-2.png' },
            preview: '',
            status: 'grading',
            studentName: '学生乙',
            studentTargetKey: '',
            detectedName: null,
            feedback: null,
            errorMsg: null,
            writingId: 'writing-2',
            writingOwnerId: '',
          },
        ],
      },
      setItems: vi.fn((updater) => {
        const next = typeof updater === 'function' ? updater(props.itemsRef.current) : updater;
        props.itemsRef.current = next;
        return next;
      }),
    });
    const { result } = renderHook(() => useBatchGradingJobRuntime(props));

    await act(async () => {
      result.current.applyBatchJobSnapshot({
        id: 'job-123',
        status: 'paused',
        classId: 'class-9',
        assignmentId: 'assignment-9',
        items: [
          {
            writingId: 'writing-1',
            status: 'succeeded',
            totalScore: 18,
            tier: '第五档（14 - 17分）',
            summary: '结构完整',
            categories: [{ name: '内容', comment: '情节承接自然', grade: '良' }],
            highlights: { content: ['情节推进自然'] },
            weaknesses: ['语言错误较多'],
            mainProblems: ['个别句子不通顺'],
            improvements: ['先修正常见语法错误'],
            nextActions: ['补强结尾'],
            writingType: 'continuation',
          },
          {
            writingId: 'writing-2',
            status: 'failed',
            errorMessage: 'AI 超时',
          },
        ],
      });
    });

    expect(props.sessionController.setJobIdentity).toHaveBeenCalledWith('job-123', 'paused');
    expect(props.loadRecentBatchJobsState.setSelectedClassId).toHaveBeenCalledWith('class-9');
    expect(props.loadRecentBatchJobsState.setSelectedAssignmentId).toHaveBeenCalledWith('assignment-9');
    expect(props.sessionController.syncFromRemoteJob).toHaveBeenCalledWith('paused');
    expect(props.pauseRef.current).toBe(true);
    expect(props.itemsRef.current[0]).toMatchObject({
      status: 'done',
      feedback: {
        totalScore: 18,
        maxScore: 20,
        tier: '第五档（14 - 17分）',
        summary: '结构完整',
        categories: [{ name: '内容', comment: '情节承接自然', grade: '良' }],
        highlights: { content: ['情节推进自然'] },
        weaknesses: ['语言错误较多'],
        mainProblems: ['个别句子不通顺'],
        improvements: ['先修正常见语法错误'],
        nextActions: ['补强结尾'],
        writingType: 'continuation',
      },
    });
    expect(props.itemsRef.current[1]).toMatchObject({
      status: 'error',
      errorMsg: 'AI 超时',
    });
  });

  it('falls back to local cancel when no remote job exists yet', async () => {
    const props = createProps({ currentJobId: '' });
    const { result } = renderHook(() => useBatchGradingJobRuntime(props));

    await act(async () => {
      await result.current.cancelBatchJob();
    });

    expect(props.runGradingFallback.abortRef.current).toBe(true);
    expect(props.sessionController.markLocalCancelWithoutJob).toHaveBeenCalled();
    expect(batchGradingAPI.cancelJob).not.toHaveBeenCalled();
  });

  it('writes a stable error message back to failed items when retry fails', async () => {
    batchGradingAPI.retryFailed.mockRejectedValue(new Error('重试接口失败'));
    const props = createProps({
      currentJobId: 'job-77',
      itemsRef: {
        current: [
          {
            file: { name: '作文-1.png' },
            preview: '',
            status: 'error',
            studentName: '学生甲',
            studentTargetKey: '',
            detectedName: null,
            feedback: null,
            errorMsg: null,
            writingId: 'writing-1',
            writingOwnerId: '',
          },
          {
            file: { name: '作文-2.png' },
            preview: '',
            status: 'done',
            studentName: '学生乙',
            studentTargetKey: '',
            detectedName: null,
            feedback: null,
            errorMsg: null,
            writingId: 'writing-2',
            writingOwnerId: '',
          },
        ],
      },
    });
    props.setItems = vi.fn((updater) => {
      const next = typeof updater === 'function' ? updater(props.itemsRef.current) : updater;
      props.itemsRef.current = next;
      return next;
    });

    const { result } = renderHook(() => useBatchGradingJobRuntime(props));

    await act(async () => {
      await result.current.retryFailedBatchJob();
    });

    expect(props.sessionController.markRunStarting).toHaveBeenCalled();
    expect(props.sessionController.markRunFinished).toHaveBeenCalled();
    expect(props.itemsRef.current[0].errorMsg).toBe('重试接口失败');
    expect(props.itemsRef.current[1].errorMsg).toBeNull();
  });
});
