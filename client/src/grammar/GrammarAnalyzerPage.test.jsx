import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GrammarAnalyzerPage from './GrammarAnalyzerPage.jsx';

const { analyzeSentenceMock } = vi.hoisted(() => ({
  analyzeSentenceMock: vi.fn(),
}));

vi.mock('../api/index.js', () => ({
  grammarAPI: {
    analyzeSentence: analyzeSentenceMock,
    analyzeSentenceTree: vi.fn().mockResolvedValue(null),
  },
}));

describe('GrammarAnalyzerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyzeSentenceMock.mockResolvedValue({
      sentence: 'The scientists who discovered the new element were awarded the Nobel Prize.',
      mainStructure: {
        subject: 'The scientists',
        predicate: 'were awarded',
        object: 'the Nobel Prize',
      },
      clauses: [
        { marker: 'who', type: 'relative_clause', label: '定语从句', text: 'who discovered the new element' },
      ],
      sentenceType: { id: 'complex', label: '复合句' },
      sentenceComponents: [
        { id: 'subject', label: '主语', text: 'The scientists', role: 'subject' },
        { id: 'relative_clause-0', label: '定语从句', text: 'who discovered the new element', role: 'relative_clause' },
        { id: 'predicate', label: '谓语', text: 'were awarded', role: 'predicate' },
        { id: 'object', label: '宾语', text: 'the Nobel Prize', role: 'object' },
      ],
      grammarPoints: ['定语从句', '被动语态'],
      detectedGrammarPoints: [
        {
          id: 'relative_clause',
          label: '定语从句',
          groupLabel: '从句系统',
          evidence: 'who discovered the new element',
        },
      ],
      grammarPointCatalog: [{ id: 'clauses', label: '从句系统', children: [] }],
      analysisText: {
        components: '句子成分：主语是“The scientists”，定语从句是“who discovered the new element”，谓语是“were awarded”，宾语是“the Nobel Prize”。',
        structure: '句子结构：主句主干 + 定语从句。',
        translation: '参考翻译：发现这种新元素的科学家被授予了诺贝尔奖。',
      },
      explanation: '先抓主干，再处理从句。',
      nextSteps: ['标出从句', '确认主干'],
    });
  });

  it('renders analyzer shell and displays analysis result', async () => {
    const onNavigate = vi.fn();
    render(<GrammarAnalyzerPage onNavigate={onNavigate} />);

    expect(screen.getByText('剥开长句，读透结构。')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('form', { name: '句子分析表单' })).getByRole('button', { name: '分析句子' }));

    await waitFor(() => {
      expect(analyzeSentenceMock).toHaveBeenCalledWith({
        sentence: expect.stringContaining('The scientists'),
        includeTree: true,
      });
    });

    await screen.findByText('点击语法点，选择学习方式。');
    expect(screen.getAllByText('定语从句').length).toBeGreaterThan(0);
    expect(screen.getByText('标出从句')).toBeInTheDocument();
    expect(screen.getByText('确认主干')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /定语从句/ }));
    fireEvent.click(screen.getByRole('button', { name: '生成题卷' }));

    expect(onNavigate).toHaveBeenCalledWith('grammar-practice');
  });
});
