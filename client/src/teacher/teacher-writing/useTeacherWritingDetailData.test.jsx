import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeacherWritingDetailData } from './useTeacherWritingDetailData.jsx';

const {
  feedbackApiMock,
  writingsApiMock,
} = vi.hoisted(() => ({
  feedbackApiMock: {
    get: vi.fn(),
    requestQuick: vi.fn(),
    retrySupplemental: vi.fn(),
  },
  writingsApiMock: {
    get: vi.fn(),
  },
}));

vi.mock('../../api/index.js', () => ({
  feedbackAPI: feedbackApiMock,
  writingsAPI: writingsApiMock,
}));

describe('useTeacherWritingDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writingsApiMock.get.mockResolvedValue({
      id: 'writing-1',
      writingTitle: '一次续写',
      selectedType: 'continuation',
    });
    feedbackApiMock.get.mockResolvedValue({
      quickFeedback: { status: 'ready' },
      supplementalFeedback: { status: 'failed' },
      detailedFeedback: { status: 'not_requested' },
      teacherComment: { status: 'ready', result: { content: '讲评已保存' } },
    });
    feedbackApiMock.retrySupplemental.mockResolvedValue({
      taskStatus: {
        supplemental: 'running',
      },
    });
  });

  it('includes supplemental status in the teacher summary', async () => {
    const { result } = renderHook(() => useTeacherWritingDetailData('writing-1'));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    expect(result.current.state.feedbackStatusSummary).toContain('完整精批补齐失败');
    expect(result.current.state.feedbackStatusSummary).toContain('基础反馈已完成');
    expect(result.current.state.feedbackStatusSummary).toContain('教师评价已保存');
    expect(result.current.state.feedbackStatusSummary).not.toContain('学生侧精批未生成');
  });

  it('retries supplemental feedback and refreshes detail', async () => {
    const { result } = renderHook(() => useTeacherWritingDetailData('writing-1'));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.handleRetrySupplementalFeedback();
    });

    expect(feedbackApiMock.retrySupplemental).toHaveBeenCalledWith('writing-1');
    expect(feedbackApiMock.get).toHaveBeenCalledTimes(2);
    expect(result.current.state.message).toEqual(expect.objectContaining({
      tone: 'success',
      title: '已重新触发完整精批补齐',
    }));
  });
});
