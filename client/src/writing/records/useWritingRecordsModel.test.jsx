import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useWritingRecordsModel from './useWritingRecordsModel.js';

const {
  feedbackApiMock,
  writingsApiMock,
} = vi.hoisted(() => ({
  feedbackApiMock: {
    requestDetailed: vi.fn(),
    requestQuick: vi.fn(),
    retrySupplemental: vi.fn(),
  },
  writingsApiMock: {
    list: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    retryQuestionAnalysis: vi.fn(),
    replayQuestionAnalysisDeadLetter: vi.fn(),
  },
}));

vi.mock('../../api/index.js', () => ({
  feedbackAPI: feedbackApiMock,
  writingsAPI: writingsApiMock,
}));

describe('useWritingRecordsModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('scrollTo', vi.fn());
    writingsApiMock.list.mockResolvedValue([
      {
        id: 'writing-1',
        source: 'self',
        feedbackStatus: {},
      },
    ]);
    writingsApiMock.get.mockResolvedValue({
      id: 'writing-1',
      source: 'self',
      feedbackStatus: {},
    });
  });

  it('sets a success action state after retrying quick feedback', async () => {
    feedbackApiMock.requestQuick.mockResolvedValue({});
    const props = {
      myWritings: [],
      initialViewingWritingId: '',
      onViewedWritingChange: vi.fn(),
    };

    const { result } = renderHook(() => useWritingRecordsModel(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });
    const previousRefreshKey = result.current.state.taskRefreshKey;

    await act(async () => {
      await result.current.actions.handleRetryQuickFeedback('writing-1');
    });

    expect(feedbackApiMock.requestQuick).toHaveBeenCalledWith('writing-1');
    expect(result.current.state.actionState).toEqual(expect.objectContaining({
      tone: 'success',
      title: '已重新触发基础反馈',
      actionLabel: '回到记录顶部',
    }));
    expect(result.current.state.taskRefreshKey).toBe(previousRefreshKey + 1);

    act(() => {
      result.current.state.actionState.onAction();
    });

    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('sets a success action state after retrying supplemental feedback', async () => {
    feedbackApiMock.retrySupplemental.mockResolvedValue({});
    const props = {
      myWritings: [],
      initialViewingWritingId: '',
      onViewedWritingChange: vi.fn(),
    };

    const { result } = renderHook(() => useWritingRecordsModel(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.handleRetrySupplementalFeedback('writing-1');
    });

    expect(feedbackApiMock.retrySupplemental).toHaveBeenCalledWith('writing-1');
    expect(result.current.state.actionState).toEqual(expect.objectContaining({
      tone: 'success',
      title: '已重新触发完整精批补齐',
      actionLabel: '回到记录顶部',
    }));
  });

  it('records a list error when the initial writings fetch fails', async () => {
    writingsApiMock.list.mockRejectedValueOnce(new Error('批改记录加载失败，请稍后重试。'));
    const props = {
      myWritings: [],
      initialViewingWritingId: '',
      onViewedWritingChange: vi.fn(),
    };

    const { result } = renderHook(() => useWritingRecordsModel(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    expect(result.current.state.listError).toBe('批改记录加载失败，请稍后重试。');
  });

  it('loads full writing detail before opening a record', async () => {
    const onViewedWritingChange = vi.fn();
    writingsApiMock.get.mockResolvedValueOnce({
      id: 'writing-1',
      fullText: '完整作文正文',
      feedback: { totalScore: 21 },
    });
    const props = {
      myWritings: [],
      initialViewingWritingId: '',
      onViewedWritingChange,
    };

    const { result } = renderHook(() => useWritingRecordsModel(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.handleViewFullFeedback('writing-1');
    });

    expect(writingsApiMock.get).toHaveBeenCalledWith('writing-1');
    expect(result.current.state.detailWriting).toEqual(expect.objectContaining({
      id: 'writing-1',
      fullText: '完整作文正文',
    }));
    expect(onViewedWritingChange).toHaveBeenCalledWith('writing-1');
  });

  it('sets an error action state with refresh action when deleting fails', async () => {
    writingsApiMock.delete.mockRejectedValueOnce(new Error('网络连接失败，请检查网络'));
    const props = {
      myWritings: [],
      initialViewingWritingId: '',
      onViewedWritingChange: vi.fn(),
    };

    const { result } = renderHook(() => useWritingRecordsModel(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.handleDeleteWriting('writing-1');
    });

    expect(result.current.state.actionState).toEqual(expect.objectContaining({
      tone: 'error',
      title: '网络连接失败',
      actionLabel: '重新刷新',
    }));

    await act(async () => {
      await result.current.state.actionState.onAction();
    });

    expect(writingsApiMock.list).toHaveBeenCalledTimes(3);
  });

  // ── Version history ──────────────────────────────────────────────────────

  it('calls onWriteNextDraft callback when handleWriteNextDraft is invoked', async () => {
    const onWriteNextDraft = vi.fn();
    const props = {
      myWritings: [],
      initialViewingWritingId: '',
      onViewedWritingChange: vi.fn(),
      onWriteNextDraft,
    };

    const { result } = renderHook(() => useWritingRecordsModel(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    const writing = { id: 'writing-1', fullText: '原文内容', versionGroupId: 'writing-1', versionNo: 1 };

    act(() => {
      result.current.actions.handleWriteNextDraft(writing);
    });

    expect(onWriteNextDraft).toHaveBeenCalledWith(writing);
  });

  it('exposes handleWriteNextDraft in actions even when no callback provided', async () => {
    const props = {
      myWritings: [],
      initialViewingWritingId: '',
      onViewedWritingChange: vi.fn(),
    };

    const { result } = renderHook(() => useWritingRecordsModel(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    // Should not throw when no onWriteNextDraft callback is provided
    expect(() => {
      act(() => {
        result.current.actions.handleWriteNextDraft({ id: 'writing-1' });
      });
    }).not.toThrow();
  });

  it('list items from legacy data carry version fields with defaults', async () => {
    writingsApiMock.list.mockResolvedValueOnce([
      {
        id: 'legacy-1',
        source: 'self',
        feedbackStatus: {},
        versionGroupId: 'legacy-1',
        versionNo: 1,
        previousWritingId: null,
      },
    ]);

    const props = {
      myWritings: [],
      initialViewingWritingId: '',
      onViewedWritingChange: vi.fn(),
    };

    const { result } = renderHook(() => useWritingRecordsModel(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    const writing = result.current.state.writings[0];
    expect(writing.versionGroupId).toBe('legacy-1');
    expect(writing.versionNo).toBe(1);
    expect(writing.previousWritingId).toBeNull();
  });

  it('second draft in same group shares versionGroupId with first draft', async () => {
    writingsApiMock.list.mockResolvedValueOnce([
      {
        id: 'draft-1',
        source: 'self',
        feedbackStatus: {},
        versionGroupId: 'draft-1',
        versionNo: 1,
        previousWritingId: null,
      },
      {
        id: 'draft-2',
        source: 'self',
        feedbackStatus: {},
        versionGroupId: 'draft-1',
        versionNo: 2,
        previousWritingId: 'draft-1',
      },
    ]);

    const props = {
      myWritings: [],
      initialViewingWritingId: '',
      onViewedWritingChange: vi.fn(),
    };

    const { result } = renderHook(() => useWritingRecordsModel(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    const [first, second] = result.current.state.writings;
    expect(first.versionGroupId).toBe('draft-1');
    expect(second.versionGroupId).toBe('draft-1');
    expect(second.previousWritingId).toBe('draft-1');
    expect(second.versionNo).toBe(2);
  });
});
