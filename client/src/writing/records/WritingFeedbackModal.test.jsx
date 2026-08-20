import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import WritingFeedbackModal, { buildModalFeedbackPayload } from './WritingFeedbackModal.jsx';

const { writingsApiMock } = vi.hoisted(() => ({
  writingsApiMock: {
    get: vi.fn(),
  },
}));

vi.mock('../../api/index.js', () => ({
  writingsAPI: writingsApiMock,
}));

vi.mock('../../components/FeedbackView/index.jsx', () => ({
  default: ({ question }) => <div data-testid="feedback-title">{question.title}</div>,
}));

describe('WritingFeedbackModal', () => {
  it('merges top-level analysisMeta into feedback payload for fresh status notices', () => {
    const payload = buildModalFeedbackPayload({
      selectedType: 'letter',
      analysisMeta: {
        status: 'pending',
        queueState: 'queued',
      },
      feedback: {
        summary: '基础反馈已完成',
        selectedType: '',
        analysisMeta: {
          status: 'ready',
          supplementalStatus: 'running',
        },
      },
    });

    expect(payload).toMatchObject({
      summary: '基础反馈已完成',
      selectedType: 'letter',
      analysisMeta: {
        status: 'pending',
        queueState: 'queued',
        supplementalStatus: 'running',
      },
    });
  });

  // ── Version history ────────────────────────────────────────────────────────

  it('returns null when detailWriting has no feedback (legacy record still safe)', () => {
    const payload = buildModalFeedbackPayload({
      id: 'w1',
      selectedType: 'general',
      versionGroupId: 'w1',
      versionNo: 1,
      previousWritingId: null,
      feedback: null,
    });

    expect(payload).toBeNull();
  });

  it('builds feedback payload correctly for a revision draft', () => {
    const payload = buildModalFeedbackPayload({
      id: 'w2',
      selectedType: 'argumentative',
      versionGroupId: 'w1',
      versionNo: 2,
      previousWritingId: 'w1',
      analysisMeta: { status: 'ready' },
      feedback: {
        summary: '第二稿有所进步',
        selectedType: '',
        totalScore: 12,
      },
    });

    expect(payload).toMatchObject({
      summary: '第二稿有所进步',
      selectedType: 'argumentative',
      totalScore: 12,
    });
  });

  it('does not mutate the original feedback.analysisMeta when merging', () => {
    const original = {
      summary: '原始反馈',
      selectedType: 'letter',
      analysisMeta: { status: 'ready' },
    };
    const writing = {
      selectedType: 'letter',
      analysisMeta: { status: 'pending' },
      feedback: original,
    };

    buildModalFeedbackPayload(writing);

    expect(original.analysisMeta.status).toBe('ready');
  });

  it('resets selected version when a different writing opens', async () => {
    writingsApiMock.get.mockResolvedValueOnce({
      id: 'w2',
      writingTitle: '第二稿',
      promptText: '',
      fullText: 'second draft',
      selectedType: 'general',
      feedback: { summary: 'second' },
    });

    const firstWriting = {
      id: 'w1',
      writingTitle: '第一稿',
      promptText: '',
      fullText: 'first draft',
      selectedType: 'general',
      versions: [
        { id: 'w1', versionNo: 1 },
        { id: 'w2', versionNo: 2 },
      ],
      feedback: { summary: 'first' },
    };
    const otherWriting = {
      id: 'w3',
      writingTitle: '另一篇作文',
      promptText: '',
      fullText: 'other writing',
      selectedType: 'general',
      feedback: { summary: 'other' },
    };

    const { rerender } = render(
      <WritingFeedbackModal detailWriting={firstWriting} user={{ role: 'student' }} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByText('第2稿'));

    await waitFor(() => {
      expect(screen.getByTestId('feedback-title')).toHaveTextContent('第二稿');
    });

    rerender(
      <WritingFeedbackModal detailWriting={otherWriting} user={{ role: 'student' }} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('feedback-title')).toHaveTextContent('另一篇作文');
    });
  });
});
