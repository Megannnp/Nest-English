import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TeacherWritingDetailContent, { formatSupplementalFailureReason } from './TeacherWritingDetailContent.jsx';

vi.mock('../../components/shared/UI.jsx', () => ({
  SurfaceCard: ({ children }) => <div>{children}</div>,
}));

vi.mock('./WritingMetaSection.jsx', () => ({
  default: () => <div>Writing Meta</div>,
}));

vi.mock('./WritingBodySection.jsx', () => ({
  default: () => <div>Writing Body</div>,
}));

vi.mock('./QuickFeedbackSection.jsx', () => ({
  default: () => <div>Quick Feedback</div>,
}));

vi.mock('./TeacherCommentSection.jsx', () => ({
  default: () => <div>Teacher Comment</div>,
}));

vi.mock('./DetailedFeedbackStatusSection.jsx', () => ({
  default: () => <div>Detailed Status</div>,
}));

vi.mock('./TeacherWritingStatusBlocks.jsx', () => ({
  default: () => <div>Status Blocks</div>,
}));

describe('TeacherWritingDetailContent', () => {
  it('formats supplemental failure reasons for teacher-facing copy', () => {
    expect(formatSupplementalFailureReason('完整反馈生成超时（55s）')).toBe('失败原因：生成超时，本次完整精批没有在后台时限内完成。');
    expect(formatSupplementalFailureReason('JSON parse failed')).toBe('失败原因：AI 返回内容格式不完整，系统没有直接写入这版结果。');
    expect(formatSupplementalFailureReason('schema validation failed')).toBe('失败原因：反馈内容没有通过完整性校验，系统已阻止写入。');
  });

  it('shows supplemental failure reason and retry action in teacher detail', () => {
    render(
      <TeacherWritingDetailContent
        isMobile={false}
        writingId="writing-1"
        writing={{
          id: 'writing-1',
          userName: 'Amy',
          className: '高一（3）班',
          writingTitle: '一次续写',
          source: 'homework',
          text: 'Student writing',
        }}
        feedback={{
          quickFeedback: {
            status: 'ready',
            result: {
              summary: '快速诊断已经返回。',
            },
          },
          supplementalFeedback: {
            status: 'failed',
            errorMessage: '完整反馈生成超时（55s）',
          },
        }}
        comment=""
        loading={false}
        saving={false}
        message={null}
        jumpHighlight={false}
        voiceSupported={false}
        isVoiceListening={false}
        feedbackStatusSummary="基础反馈已完成 · 完整精批补齐失败"
        retryingQuickFeedback={false}
        retryingSupplementalFeedback={false}
        writingContext={null}
        currentSequenceIndex={-1}
        writingSequence={[]}
        progressTotal={0}
        progressCurrent={0}
        progressPercent={0}
        nextWriting={null}
        onSetComment={vi.fn()}
        onToggleVoiceComment={vi.fn()}
        onRestartVoiceComment={vi.fn()}
        onRetryQuickFeedback={vi.fn()}
        onRetrySupplementalFeedback={vi.fn()}
        onSaveComment={vi.fn()}
        onSaveAndBack={vi.fn()}
        onSaveAndMoveNext={vi.fn()}
      />
    );

    expect(screen.getByText('失败原因：生成超时，本次完整精批没有在后台时限内完成。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试完整精批补齐' })).toBeInTheDocument();
    expect(screen.queryByText('Detailed Status')).not.toBeInTheDocument();
  });
});
