import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GrammarPracticePage from './GrammarPracticePage.jsx';

const { completeMock } = vi.hoisted(() => ({
  completeMock: vi.fn(),
}));

vi.mock('../api/index.js', () => ({
  grammarAPI: {
    generatePractice: completeMock,
  },
}));

describe('GrammarPracticePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completeMock.mockResolvedValue([
      { id: 'blank-1', type: 'blank', typeLabel: '填空题', points: 2, focus: '关系代词作宾语', prompt: 'The book ___ I bought yesterday is useful.', answer: 'that / which', explanation: '先行词是物，关系词在从句中作 bought 的宾语，所以用 that 或 which。', source: '' },
      { id: 'blank-2', type: 'blank', typeLabel: '填空题', points: 2, focus: '关系代词作主语', prompt: 'The boy ___ likes English is my friend.', answer: 'who / that', explanation: '先行词是人，关系词在从句中作主语，所以用 who 或 that。', source: '' },
      { id: 'blank-3', type: 'blank', typeLabel: '填空题', points: 2, focus: '地点关系副词', prompt: 'This is the school ___ I study.', answer: 'where', explanation: '先行词是地点，关系词在从句中作地点状语，所以用 where。', source: '' },
      { id: 'blank-4', type: 'blank', typeLabel: '填空题', points: 2, focus: '时间关系副词', prompt: 'I remember the day ___ we met.', answer: 'when', explanation: '先行词是时间，关系词在从句中作时间状语，所以用 when。', source: '' },
      { id: 'choice-1', type: 'choice', typeLabel: '选择题', points: 2, focus: 'who', prompt: 'The student ___ finished the project is my classmate.\\nA. who B. which C. where D. when', answer: 'A. who', explanation: '先行词 student 是人，空格在从句中作主语，应选 who。', source: '' },
      { id: 'choice-2', type: 'choice', typeLabel: '选择题', points: 2, focus: 'which', prompt: 'The movie ___ we watched was interesting.\\nA. who B. which C. where D. when', answer: 'B. which', explanation: '先行词 movie 是物，关系词在从句中作宾语，应选 which。', source: '' },
      { id: 'choice-3', type: 'choice', typeLabel: '选择题', points: 2, focus: 'where', prompt: 'This is the park ___ we play.\\nA. where B. who C. whose D. when', answer: 'A. where', explanation: '先行词 park 是地点，空格表示地点状语，应选 where。', source: '' },
      { id: 'choice-4', type: 'choice', typeLabel: '选择题', points: 2, focus: 'when', prompt: 'Sunday is the day ___ I visit grandparents.\\nA. where B. when C. who D. which', answer: 'B. when', explanation: '先行词 day 是时间，空格表示时间状语，应选 when。', source: '' },
    ]);
  });

  it('renders practice generator and creates editable exercises', async () => {
    const onNavigate = vi.fn();

    render(<GrammarPracticePage onNavigate={onNavigate} />);

    expect(screen.getByText('练出手感，考场不慌。')).toBeInTheDocument();
    expect(screen.getByText('生成设置')).toBeInTheDocument();
    expect(screen.getAllByText('定语从句').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '生成题卷内容' }));

    expect(await screen.findByText(/一、填空题/)).toBeInTheDocument();
    expect(screen.getByText(/二、选择题/)).toBeInTheDocument();
    expect(completeMock).toHaveBeenCalledWith(expect.objectContaining({
      grammarPoint: '定语从句',
      sourceSentence: expect.any(String),
      typeConfigs: expect.arrayContaining([
        expect.objectContaining({ type: 'blank', count: 4, points: 2 }),
      ]),
    }));
    expect(screen.getByText(/语法点：定语从句/)).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: '返回长难句分析' })).not.toBeInTheDocument();
  });

  it('opens login when guest generation budget is exhausted', async () => {
    const onLoginClick = vi.fn();
    const error = new Error('访客 AI 试用次数已用完，请登录后继续使用');
    error.statusCode = 429;
    completeMock.mockRejectedValueOnce(error);

    render(<GrammarPracticePage onLoginClick={onLoginClick} />);

    fireEvent.click(screen.getByRole('button', { name: '生成题卷内容' }));

    expect(await screen.findByText('游客试用次数已用完，请登录后继续生成练习题。')).toBeInTheDocument();
    expect(onLoginClick).toHaveBeenCalled();
  });

  it('passes the selected prep exam context to practice generation', async () => {
    render(<GrammarPracticePage prepExamId="ielts" />);

    fireEvent.click(screen.getByRole('button', { name: '生成题卷内容' }));

    await screen.findByText(/一、填空题/);
    expect(completeMock).toHaveBeenCalledWith(expect.objectContaining({
      prepExamId: 'ielts',
      prepExamLabel: 'IELTS',
      systemId: 'system-ielts',
    }));
  });
});
