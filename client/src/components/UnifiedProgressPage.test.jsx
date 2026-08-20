import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import UnifiedProgressPage from './UnifiedProgressPage.jsx';

vi.mock('../api/index.js', () => ({
  grammarAPI: {
    progress: vi.fn().mockResolvedValue({ sessions: 0, totalQuestions: 0, correctQuestions: 0 }),
  },
  readingAPI: {
    practiceProgress: vi.fn().mockResolvedValue({ sessions: 0, analyses: { total: 0 }, accuracy: 0 }),
  },
  vocabularyAPI: {
    progress: vi.fn().mockResolvedValue({ sessions: 0, averageScore: 0, averageAccuracy: 0 }),
  },
  listeningAPI: {
    progress: vi.fn().mockResolvedValue({ sessions: 0, averageScore: 0, averageAccuracy: 0 }),
  },
  phoneticsAPI: {
    progress: vi.fn().mockResolvedValue({ sessions: 0, averageScore: 0, averageAccuracy: 0 }),
  },
  speakingAPI: {
    progress: vi.fn().mockResolvedValue({ sessions: 0, averageScore: 0 }),
  },
}));

describe('UnifiedProgressPage', () => {
  it('shows the launched speaking shortcut in the learning loop', () => {
    const onNavigate = vi.fn();

    render(<UnifiedProgressPage user={{ id: 'u-1', role: 'student' }} onNavigate={onNavigate} />);

    expect(screen.getByText('口语')).toBeInTheDocument();
    const speakingCard = within(screen.getByText('口语').parentElement?.parentElement);
    fireEvent.click(speakingCard.getByRole('button', { name: '去练习' }));
    expect(onNavigate).toHaveBeenCalledWith('speaking');
    fireEvent.click(speakingCard.getByRole('button', { name: '看详情' }));
    expect(onNavigate).toHaveBeenCalledWith('speaking-progress');

    fireEvent.click(within(screen.getByText('语音').parentElement?.parentElement).getByRole('button', { name: '去练习' }));
    expect(onNavigate).toHaveBeenCalledWith('phonetics-overview');
  });

  it('opens the vocabulary growth detail page from the vocabulary card', () => {
    const onNavigate = vi.fn();

    render(<UnifiedProgressPage user={{ id: 'u-1', role: 'student' }} onNavigate={onNavigate} />);

    fireEvent.click(within(screen.getByText('词汇').parentElement?.parentElement).getByRole('button', { name: '看详情' }));

    expect(onNavigate).toHaveBeenCalledWith('vocab-progress');
  });
});
