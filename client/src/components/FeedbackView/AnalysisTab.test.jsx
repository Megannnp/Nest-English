import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AnalysisTab from './AnalysisTab.jsx';

vi.mock('./analysis-types/general', () => ({
  default: ({ feedback, writingType }) => (
    <div>
      generic-analysis:{writingType}
      <span>{feedback?.overview || feedback?.reason || 'no-analysis'}</span>
    </div>
  ),
}));

vi.mock('./analysis-types/summary', () => ({
  default: ({ feedback, writingType }) => (
    <div>
      summary-analysis:{writingType}
      <span>{feedback?.overview || 'summary-ready'}</span>
    </div>
  ),
}));

describe('AnalysisTab', () => {
  it('renders pending placeholder when analysis is still generating and no fallback exists', async () => {
    render(
      <AnalysisTab
        feedback={{
          type: 'summary',
          status: 'pending',
        }}
        originalText=""
      />
    );

    expect(await screen.findByText('题目分析生成中')).toBeInTheDocument();
  });

  it('renders failed fallback when analysis failed and no specialized content exists', async () => {
    render(
      <AnalysisTab
        feedback={{
          type: 'speech',
          status: 'failed',
        }}
        originalText=""
      />
    );

    expect(await screen.findByText('题目分析暂未完全生成')).toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes('演讲稿'))).toBeInTheDocument();
  });

  it('keeps partial summary analysis visible while showing the generation notice', async () => {
    render(
      <AnalysisTab
        feedback={{
          type: 'summary',
          status: 'partial',
          overview: '概要核心结构已返回。',
          focusPoints: ['概括主旨', '评论独立'],
        }}
        originalText=""
      />
    );

    expect(await screen.findByText('题目分析继续生成中')).toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes('summary-analysis:') && content.includes('概要写作'))).toBeInTheDocument();
    expect(screen.getAllByText('概要核心结构已返回。')).toHaveLength(2);
  });

  it('falls back to generic analysis for unsupported writing types', async () => {
    render(
      <AnalysisTab
        feedback={{
          type: 'mystery_type',
          overview: '先展示通用题目理解。',
          focusPoints: ['先抓任务要求'],
        }}
        originalText=""
      />
    );

    expect(await screen.findByText((content) => content.includes('暂未接入专属题型分析模板'))).toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes('generic-analysis:') && content.includes('综合写作'))).toBeInTheDocument();
    expect(screen.getByText('先展示通用题目理解。')).toBeInTheDocument();
  });
});
