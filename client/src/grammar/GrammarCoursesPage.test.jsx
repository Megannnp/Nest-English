import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GrammarCoursesPage from './GrammarCoursesPage.jsx';

const { courseProgressMock, saveCourseProgressMock } = vi.hoisted(() => ({
  courseProgressMock: vi.fn(),
  saveCourseProgressMock: vi.fn(),
}));

vi.mock('./grammarTreeMap.jsx', () => ({
  default: () => null,
}));

vi.mock('../api/index.js', () => ({
  grammarAPI: {
    courseProgress: courseProgressMock,
    saveCourseProgress: saveCourseProgressMock,
  },
}));

function clickNode(title) {
  const button = screen.getAllByRole('button').find((item) =>
    item.querySelector('.gc-node__title')?.textContent === title
  );
  expect(button).toBeTruthy();
  fireEvent.click(button);
}

describe('GrammarCoursesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    courseProgressMock.mockResolvedValue({ completedIds: [], nodes: [] });
    saveCourseProgressMock.mockResolvedValue({});
  });

  it('renders the grammar tree with top-level nodes', () => {
    const onNavigate = vi.fn();

    render(<GrammarCoursesPage onNavigate={onNavigate} />);

    expect(screen.getByText('由浅入深，融会贯通。')).toBeInTheDocument();
    expect(screen.getAllByText('句子').length).toBeGreaterThan(0);
    expect(screen.getAllByText('词语').length).toBeGreaterThan(0);
  });

  it('expands a top-level node to show children', () => {
    render(<GrammarCoursesPage onNavigate={vi.fn()} />);

    clickNode('句子');

    expect(screen.getByText('句子成分')).toBeInTheDocument();
  });

  it('records lesson view before quiz completion and completion after inline quiz', async () => {
    render(<GrammarCoursesPage onNavigate={vi.fn()} user={{ id: 'u1' }} />);

    await waitFor(() => expect(courseProgressMock).toHaveBeenCalled());

    clickNode('句子');
    clickNode('句子成分');
    clickNode('按主干/支干分类');

    expect(saveCourseProgressMock).toHaveBeenLastCalledWith({
      nodeId: 'by-trunk',
      status: 'viewed',
      quizCorrect: 0,
      quizTotal: 0,
    });
    expect(screen.queryByText(/1 \/ 23/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /C\. 宾语补足语/ }));
    fireEvent.click(screen.getByRole('button', { name: '下一题' }));
    fireEvent.click(screen.getByRole('button', { name: /B\. The beautiful girl sang/ }));
    fireEvent.click(screen.getByRole('button', { name: '下一题' }));
    fireEvent.click(screen.getByRole('button', { name: /C\. 同位语/ }));
    fireEvent.click(screen.getByRole('button', { name: '查看结果' }));

    expect(saveCourseProgressMock).toHaveBeenLastCalledWith({
      nodeId: 'by-trunk',
      status: 'completed',
      quizCorrect: 3,
      quizTotal: 3,
    });
  });
});
