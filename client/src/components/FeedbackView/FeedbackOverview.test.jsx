import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FeedbackOverview from './FeedbackOverview.jsx';

vi.mock('../../hooks/useIsMobile.js', () => ({
  default: () => false,
}));

describe('FeedbackOverview', () => {
  it('renders report header, score, and summary', () => {
    render(
      <FeedbackOverview
        safeData={{
          overall: {
            score: 13,
            total: 15,
            grade: '良',
            summary: '整体完成度不错，语言还可以继续打磨。',
          },
          highlights: {
            content: ['主题抓得比较准，主线没有跑偏。'],
          },
          mainProblems: ['段落之间的转折还不够自然。'],
          nextActions: ['先补一句承上启下的过渡句。'],
          dimensions: {},
        }}
        feedback={{}}
        typeInfo={{ title: '综合写作反馈报告' }}
        onExportPDF={() => {}}
        originalText=""
      />
    );

    expect(screen.getByText('AI 写作诊断报告')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('总体评价')).toBeInTheDocument();
    expect(screen.getByText('整体完成度不错，语言还可以继续打磨。')).toBeInTheDocument();
  });

  it('renders dimension table when dimensions are provided', () => {
    render(
      <FeedbackOverview
        safeData={{
          overall: {
            score: 13,
            total: 15,
            grade: '良',
            summary: '很好。',
          },
          dimensions: {
            内容: { score: 8, total: 10, grade: '良', comment: '内容充实，逻辑清晰。' },
            语言: { score: 5, total: 5, comment: '语言流畅。' },
          },
        }}
        feedback={{}}
        typeInfo={{}}
        onExportPDF={() => {}}
        originalText=""
      />
    );

    expect(screen.getByText('各维度评分')).toBeInTheDocument();
    expect(screen.getByText('内容')).toBeInTheDocument();
    expect(screen.getByText('语言')).toBeInTheDocument();
    expect(screen.getByText('内容充实，逻辑清晰。')).toBeInTheDocument();
  });

  it('renders improvement suggestions when provided', () => {
    render(
      <FeedbackOverview
        safeData={{
          overall: {
            score: 10,
            total: 15,
            grade: '中',
            summary: '基本完成。',
          },
          improvements: ['先优化段落结构。', '注意过渡句的使用。'],
          dimensions: {},
        }}
        feedback={{}}
        typeInfo={{}}
        onExportPDF={() => {}}
        originalText=""
      />
    );

    expect(screen.getByText('改进建议')).toBeInTheDocument();
    expect(screen.getByText('先优化段落结构。')).toBeInTheDocument();
    expect(screen.getByText('注意过渡句的使用。')).toBeInTheDocument();
  });

  it('uses fallback summary text when summary is empty', () => {
    render(
      <FeedbackOverview
        safeData={{
          overall: {
            score: 8,
            total: 15,
            grade: '中',
            summary: '',
          },
          dimensions: {},
        }}
        feedback={{}}
        typeInfo={{ title: '综合写作反馈报告' }}
        onExportPDF={() => {}}
        originalText=""
      />
    );

    expect(screen.getByText('AI 写作诊断报告')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('暂无总体评价')).toBeInTheDocument();
  });
});
