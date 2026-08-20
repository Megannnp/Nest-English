import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GrammarQuizPage from './GrammarQuizPage.jsx';

const { generateQuizMock, recordMock, submitTaskMock } = vi.hoisted(() => ({
  generateQuizMock: vi.fn(),
  recordMock: vi.fn(),
  submitTaskMock: vi.fn(),
}));

vi.mock('../api/index.js', () => ({
  grammarAPI: {
    generateQuiz: generateQuizMock,
    record: recordMock,
    submitTask: submitTaskMock,
  },
}));

const TASK_STORAGE_KEY = 'nest_grammar_task_context';

describe('GrammarQuizPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.removeItem(TASK_STORAGE_KEY);
    generateQuizMock.mockResolvedValue([
      {
        id: 1,
        type: 'single',
        question: 'Choose the correct answer.',
        options: ['A. is', 'B. are', 'C. were', 'D. be'],
        answer: 'A',
        explanation: 'Use singular verb.',
        optionsAnalysis: { A: '正确', B: '错误', C: '错误', D: '错误' },
      },
    ]);
    recordMock.mockResolvedValue({ id: 'record-1' });
    submitTaskMock.mockResolvedValue({ id: 'assignment-1' });
  });

  it('submits grammar task without creating a duplicate practice record from the client', async () => {
    sessionStorage.setItem(TASK_STORAGE_KEY, JSON.stringify({
      grammarConfig: {
        assignmentId: 'assignment-1',
        grammar: '主谓一致',
        type: 'single',
        stage: '高中',
        difficulty: '中等',
      },
    }));

    render(<GrammarQuizPage user={{ id: 'student-1' }} />);

    expect(await screen.findByText('Choose the correct answer.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'A. is' }));
    fireEvent.click(screen.getByRole('button', { name: '查看结果' }));

    await waitFor(() => {
      expect(submitTaskMock).toHaveBeenCalledWith('assignment-1', { correctCount: 1, totalCount: 1 });
    });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('disables result actions while a grammar task submission is saving', async () => {
    submitTaskMock.mockReturnValue(new Promise(() => {}));
    sessionStorage.setItem(TASK_STORAGE_KEY, JSON.stringify({
      grammarConfig: {
        assignmentId: 'assignment-1',
        grammar: '主谓一致',
        type: 'single',
        stage: '高中',
        difficulty: '中等',
      },
    }));

    render(<GrammarQuizPage user={{ id: 'student-1' }} />);

    expect(await screen.findByText('Choose the correct answer.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'A. is' }));
    fireEvent.click(screen.getByRole('button', { name: '查看结果' }));

    expect(await screen.findByText('正在提交语法任务…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '继续挑战同类题' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '结束练习' })).toBeDisabled();
  });

  it('passes the selected prep exam context to quiz generation', async () => {
    render(<GrammarQuizPage prepExamId="cet4" />);

    fireEvent.change(screen.getByLabelText('语法点'), { target: { value: '时态' } });
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(await screen.findByRole('button', { name: '高中' }));
    fireEvent.click(await screen.findByRole('button', { name: '中等' }));
    fireEvent.click(await screen.findByRole('button', { name: /单选题/ }));

    await waitFor(() => {
      expect(generateQuizMock).toHaveBeenCalledWith(expect.objectContaining({
        prepExamId: 'cet4',
        prepExamLabel: '四级',
        systemId: 'system-cet4',
      }));
    });
  });
});
