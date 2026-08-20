import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import GrammarProgressPage from './GrammarProgressPage.jsx';
import { grammarAPI } from '../api/index.js';

vi.mock('../api/index.js', () => ({
  grammarAPI: {
    progress: vi.fn(),
    courseProgress: vi.fn(),
    favorites: vi.fn(),
  },
}));

const mockUser = { id: 'u1', name: '测试用户', role: 'student' };

describe('GrammarProgressPage', () => {
  beforeEach(() => {
    sessionStorage.removeItem('nestGrammarQuizSeed');
    grammarAPI.progress.mockResolvedValue({ sessions: 3, totalQuestions: 30, correctQuestions: 24, byPoint: [] });
    grammarAPI.courseProgress.mockResolvedValue({ nodes: [] });
    grammarAPI.favorites.mockResolvedValue([]);
  });

  it('renders hero text always', () => {
    render(<GrammarProgressPage onNavigate={vi.fn()} />);
    expect(screen.getByText('一题一进，轨迹可见。')).toBeInTheDocument();
  });

  it('shows demo stats card for guests', () => {
    render(<GrammarProgressPage onNavigate={vi.fn()} />);
    // Demo data visible
    expect(screen.getByText('练习场次')).toBeInTheDocument();
    // No login/register prompt
    expect(screen.queryByText(/登录后查看真实成长数据/)).not.toBeInTheDocument();
  });

  it('renders real stats and blocks when user is logged in', async () => {
    render(<GrammarProgressPage onNavigate={vi.fn()} user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('练习场次')).toBeInTheDocument();
    });

    expect(screen.getByText('语法精讲进度')).toBeInTheDocument();
    expect(screen.getByText('练习题库')).toBeInTheDocument();
    // No guest overlay
    expect(screen.queryByText(/登录后查看真实成长数据/)).not.toBeInTheDocument();
  });

  it('shows an error state when progress loading fails for logged-in users', async () => {
    grammarAPI.progress.mockRejectedValueOnce(new Error('服务暂时不可用'));

    render(<GrammarProgressPage onNavigate={vi.fn()} user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('服务暂时不可用')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument();
    expect(screen.queryByText('18')).not.toBeInTheDocument();
  });

  it('expands a block and navigates to quiz when logged in', async () => {
    const onNavigate = vi.fn();

    render(<GrammarProgressPage onNavigate={onNavigate} user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('练习题库')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /练习题库/ }));
    fireEvent.click(screen.getByRole('button', { name: /去做练习/ }));

    expect(onNavigate).toHaveBeenCalledWith('grammar-quiz');
  });

  it('starts quiz from the weakest grammar point', async () => {
    const onNavigate = vi.fn();
    grammarAPI.progress.mockResolvedValueOnce({
      sessions: 3,
      totalQuestions: 30,
      correctQuestions: 21,
      byPoint: [
        { grammarPoint: '定语从句', total: 10, correct: 9 },
        { grammarPoint: '虚拟语气', total: 10, correct: 4 },
      ],
    });

    render(<GrammarProgressPage onNavigate={onNavigate} user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('练习题库')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /练习题库/ }));
    expect(screen.getByText('优先复练的薄弱语法点')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '复练' })[0]);

    expect(JSON.parse(sessionStorage.getItem('nestGrammarQuizSeed'))).toEqual({ grammarPointLabel: '虚拟语气' });
    expect(onNavigate).toHaveBeenCalledWith('grammar-quiz');
  });
});
