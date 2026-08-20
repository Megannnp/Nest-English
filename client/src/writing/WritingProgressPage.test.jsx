import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WritingProgressPage from './WritingProgressPage.jsx';

const { recordsModelMock, writingProgressApiMock } = vi.hoisted(() => ({
  recordsModelMock: vi.fn(),
  writingProgressApiMock: {
    progress: vi.fn(),
    favorites: vi.fn(),
  },
}));

vi.mock('./records/useWritingRecordsModel.js', () => ({
  default: recordsModelMock,
}));

vi.mock('./records/AnalyticsPanel.jsx', () => ({
  default: ({ writings }) => <div data-testid="analytics-panel">{writings.length}</div>,
}));

vi.mock('./records/WritingRecordsPanel.jsx', () => ({
  default: () => <div data-testid="records-panel" />,
}));

vi.mock('./records/WritingFeedbackModal.jsx', () => ({
  default: () => null,
}));

vi.mock('../api/index.js', () => ({
  writingProgressAPI: writingProgressApiMock,
}));

vi.mock('../components/shared/ModuleGrowthPage.jsx', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe('WritingProgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordsModelMock.mockReturnValue({
      state: {
        writings: [{ id: 'w1' }],
        detailWriting: null,
        listError: '',
      },
      actions: {
        refreshWritings: vi.fn(),
        setDetailWriting: vi.fn(),
      },
    });
    writingProgressApiMock.progress.mockResolvedValue({
      data: { totalWritings: 1, writingsWithFeedback: 1, averageScore: 88 },
    });
    writingProgressApiMock.favorites.mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        id: `fav-${index + 1}`,
        content: `收藏句 ${index + 1}`,
        createdAt: '2026-07-11T00:00:00.000Z',
        metadata: { difficulty: '高级', original: `原句 ${index + 1}` },
      }))
    );
  });

  it('loads up to 50 favorite sentences and renders the full list', async () => {
    render(<WritingProgressPage user={{ id: 'student-1' }} />);

    await waitFor(() => {
      expect(writingProgressApiMock.favorites).toHaveBeenCalledWith(50);
    });

    expect(screen.getByTestId('analytics-panel')).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: /收藏的句子/ }));
    expect(await screen.findByText('收藏句 6')).toBeInTheDocument();
    expect(screen.getByText(/原句 6/)).toBeInTheDocument();
  });
});
