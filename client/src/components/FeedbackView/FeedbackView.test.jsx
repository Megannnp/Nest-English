import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FeedbackView from './index.jsx';

vi.mock('../../hooks/useIsMobile.js', () => ({
  default: () => false,
}));

vi.mock('./FeedbackOverview', () => ({
  default: ({ typeInfo }) => <div>overview:{typeInfo?.title || 'none'}</div>,
}));

vi.mock('./FeedbackAIEvaluation', () => ({
  FeedbackAIEvaluation: () => <div>evaluation-panel</div>,
  FeedbackAnalysisPanel: ({ writingType }) => <div>analysis-panel:{writingType}</div>,
}));

describe('FeedbackView', () => {
  it('renders empty state when feedback is missing', () => {
    render(<FeedbackView feedback={null} />);

    expect(screen.getByText('暂无反馈数据')).toBeInTheDocument();
  });

  it('switches between evaluation and analysis tabs', async () => {
    render(
      <FeedbackView
        feedback={{
          totalScore: 12,
          maxScore: 15,
          summary: '结构基本完整',
          questionAnalysis: { type: 'summary' },
        }}
        question={{ type: 'summary', title: 'Test Question' }}
      />
    );

    expect(await screen.findByText('overview:概要写作反馈报告')).toBeInTheDocument();
    expect(await screen.findByText('evaluation-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('题目分析'));

    await waitFor(() => {
      expect(screen.getByText('analysis-panel:summary')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('写作评价'));

    await waitFor(() => {
      expect(screen.getByText('evaluation-panel')).toBeInTheDocument();
    });
  });
});
