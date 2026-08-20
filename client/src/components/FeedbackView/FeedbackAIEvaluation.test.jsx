import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { FeedbackAIEvaluation } from './FeedbackAIEvaluation.jsx';

// GrammarPracticeLink (rendered inside FeedbackAIEvaluation) calls useNavigate,
// which requires a Router context.  Wrap every render in MemoryRouter.
function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('FeedbackAIEvaluation', () => {
  it('renders quick diagnostic fallback when detailed blocks are absent', () => {
    renderWithRouter(
      <FeedbackAIEvaluation
        feedback={{
          summary: '整体结构基本完整，但语言还有提升空间。',
          mainProblems: ['句式重复较多', '段落衔接不够自然'],
          nextActions: ['先改开头段逻辑', '再补充连接词'],
        }}
        loading={false}
        originalText="Sample writing"
      />
    );

    expect(screen.getByText('整体结构基本完整，但语言还有提升空间。')).toBeInTheDocument();
    expect(screen.getByText('这次最影响得分的问题')).toBeInTheDocument();
    expect(screen.getByText('下一步先改什么')).toBeInTheDocument();
  });

  it('renders detailed sections when navigation/deep review/sample essay data exists', async () => {
    renderWithRouter(
      <FeedbackAIEvaluation
        feedback={{
          highlights: {
            content: ['主题明确'],
            vocabulary: [],
            sentences: [],
          },
          grammarIssues: [
            { original: 'He go to school.', corrected: 'He goes to school.' },
          ],
          correctedSampleEssay: {
            text: 'Corrected sample essay content.',
          },
          questionAnalysis: {
            type: 'general',
          },
        }}
        loading={false}
        originalText="Original writing text."
      />
    );

    expect(await screen.findByText('提升导航')).toBeInTheDocument();
    expect(await screen.findByText('语言深入分析')).toBeInTheDocument();
    expect(await screen.findByText('范文参考')).toBeInTheDocument();
  });

  it('does not render empty sample essay cards when essay content is absent', async () => {
    renderWithRouter(
      <FeedbackAIEvaluation
        feedback={{
          highlights: {
            content: ['主题已经点明'],
            vocabulary: [],
            sentences: [],
          },
          questionAnalysis: {
            type: 'general',
          },
        }}
        loading={false}
        originalText="Original writing text."
      />
    );

    expect(await screen.findByText('范文参考')).toBeInTheDocument();
    expect(screen.queryByText('范文生成中')).not.toBeInTheDocument();
    expect(screen.getByText('范文会严格根据当前作文的标题、题目要求和题型生成；当前暂未返回可展示内容。')).toBeInTheDocument();
  });

  it('shows corrected and excellent essay labels for continuation writing', async () => {
    renderWithRouter(
      <FeedbackAIEvaluation
        feedback={{
          correctedSampleEssay: {
            text: 'Paragraph one.\n\nParagraph two.',
          },
          excellentSampleEssay: {
            text: 'Excellent paragraph one.\n\nExcellent paragraph two.',
          },
          questionAnalysis: {
            type: 'continuation',
          },
        }}
        loading={false}
        originalText="Original writing text."
      />
    );

    expect(await screen.findByText('批改后范文')).toBeInTheDocument();
    expect(await screen.findByText('优秀范文')).toBeInTheDocument();
  });

  it('does not show content and structure deep review panels without real deep review data', async () => {
    renderWithRouter(
      <FeedbackAIEvaluation
        feedback={{
          grammarIssues: [
            { original: 'He go to school.', corrected: 'He goes to school.' },
          ],
          questionAnalysis: {
            type: 'general',
          },
        }}
        loading={false}
        originalText="Original writing text."
      />
    );

    expect(await screen.findByText('语言深入分析')).toBeInTheDocument();
    expect(screen.queryByText('内容深入分析')).not.toBeInTheDocument();
    expect(screen.queryByText('结构深入分析')).not.toBeInTheDocument();
  });

  it('keeps quick priority diagnostics visible after detailed feedback arrives', async () => {
    renderWithRouter(
      <FeedbackAIEvaluation
        feedback={{
          mainProblems: ['内容细节不足'],
          nextActions: ['先补充一个具体例子'],
          highlights: {
            content: ['主题明确'],
            vocabulary: [],
            sentences: [],
          },
          grammarIssues: [
            { original: 'He go to school.', corrected: 'He goes to school.' },
          ],
          correctedSampleEssay: {
            text: 'Corrected sample essay content.',
          },
          questionAnalysis: {
            type: 'general',
          },
        }}
        loading={false}
        originalText="Original writing text."
      />
    );

    expect(await screen.findByText('本次优先处理的问题')).toBeInTheDocument();
    expect(screen.getByText('内容细节不足')).toBeInTheDocument();
    expect(screen.getByText('先补充一个具体例子')).toBeInTheDocument();
    expect(await screen.findByText('提升导航')).toBeInTheDocument();
  });

  it('renders object-shaped deep review content without React object errors', async () => {
    renderWithRouter(
      <FeedbackAIEvaluation
        feedback={{
          contentLogic: [
            {
              title: '例子不足',
              detail: '第二段需要补一个具体经历。',
            },
          ],
          structure: [
            {
              title: '结尾收束',
              detail: '最后一句需要回扣主题。',
            },
          ],
          questionAnalysis: {
            type: 'general',
          },
        }}
        loading={false}
        originalText="Original writing text."
      />
    );

    expect(await screen.findByText('内容深入分析')).toBeInTheDocument();
    expect(screen.getAllByText((content) => content.includes('例子不足') && content.includes('第二段需要补一个具体经历。')).length).toBeGreaterThan(0);
    expect(await screen.findByText((content) => content.includes('结尾收束') && content.includes('最后一句需要回扣主题。'))).toBeInTheDocument();
  });

  it('links grammar issues to Grammar analyzer practice', async () => {
    const onNavigate = vi.fn();

    renderWithRouter(
      <FeedbackAIEvaluation
        feedback={{
          grammarIssues: [
            { original: 'He go to school.', corrected: 'He goes to school.' },
          ],
          questionAnalysis: {
            type: 'general',
          },
        }}
        loading={false}
        originalText="Original writing text."
        onNavigate={onNavigate}
      />
    );

    expect(await screen.findByText('Grammar 延伸练习')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '去拆句分析' }));

    expect(onNavigate).toHaveBeenCalledWith('grammar-analyzer');
  });

  it('keeps rendering when sample essay and deep review details are absent', async () => {
    renderWithRouter(
      <FeedbackAIEvaluation
        feedback={{
          highlights: {
            content: ['主题已经点明'],
            vocabulary: [],
            sentences: [],
          },
          suggestions: ['补足结尾回扣。'],
          questionAnalysis: {
            type: 'general',
          },
        }}
        loading={false}
        originalText="Original writing text."
      />
    );

    expect(await screen.findByText((content) => content.includes('主题已经点明'))).toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes('补足结尾回扣。'))).toBeInTheDocument();
    expect(await screen.findByText('范文参考')).toBeInTheDocument();
  });

  it('shows a safe quick-diagnostic empty fallback for sparse feedback', () => {
    renderWithRouter(
      <FeedbackAIEvaluation
        feedback={{}}
        loading={false}
        originalText=""
      />
    );

    expect(screen.getByText('这是一版快速诊断结果，重点先帮你看清分数区间、最大问题和下一步动作。更完整的深度精批会继续在后台补充。')).toBeInTheDocument();
  });
});
