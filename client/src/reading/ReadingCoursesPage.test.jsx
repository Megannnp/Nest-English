import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReadingCoursesPage from './ReadingCoursesPage.jsx';

const { courseProgressMock, saveCourseProgressMock, submitModuleMock } = vi.hoisted(() => ({
  courseProgressMock: vi.fn(),
  saveCourseProgressMock: vi.fn(),
  submitModuleMock: vi.fn(),
}));

vi.mock('../api/index.js', () => ({
  moduleAssignmentsAPI: {
    submit: submitModuleMock,
  },
  readingAPI: {
    courseProgress: courseProgressMock,
    saveCourseProgress: saveCourseProgressMock,
  },
}));

vi.mock('../hooks/useScrollReveal.js', () => ({
  default: () => ({ current: null }),
}));

function clickNode(title) {
  const button = screen.getAllByRole('button').find((item) =>
    item.querySelector('.rdc-node__title')?.textContent === title
  );
  expect(button).toBeTruthy();
  fireEvent.click(button);
}

describe('ReadingCoursesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    window.sessionStorage.clear();
    courseProgressMock.mockResolvedValue({ nodes: [] });
    saveCourseProgressMock.mockResolvedValue({});
    submitModuleMock.mockResolvedValue({});
  });

  it('persists quiz score when a reading course quiz is completed', async () => {
    render(<ReadingCoursesPage onNavigate={vi.fn()} user={{ id: 'u1' }} />);

    await waitFor(() => expect(courseProgressMock).toHaveBeenCalled());

    clickNode('题型精讲');
    clickNode('主旨大意题');

    expect(screen.getByText(/城市绿地不是装饰/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /B\. 城市绿地对城市居民健康具有综合价值/ }));
    fireEvent.click(screen.getByRole('button', { name: '下一题' }));
    fireEvent.click(screen.getByRole('button', { name: /C\. 青少年睡眠需要学校和家庭共同干预/ }));
    fireEvent.click(screen.getByRole('button', { name: '查看结果' }));

    expect(saveCourseProgressMock).toHaveBeenLastCalledWith({
      nodeId: 'qt-main-idea',
      status: 'completed',
      quizCorrect: 2,
      quizTotal: 2,
    });
  });

  it('submits the module task when a course assignment is completed', async () => {
    window.sessionStorage.setItem('nest_module_task_context', JSON.stringify({
      id: 'module-task-1',
      taskType: 'module',
      moduleTaskLaunchedAt: Date.now(),
      assignment: { entryPage: 'reading-courses' },
    }));

    render(<ReadingCoursesPage onNavigate={vi.fn()} user={{ id: 'u1' }} />);

    await waitFor(() => expect(courseProgressMock).toHaveBeenCalled());
    clickNode('题型精讲');
    clickNode('主旨大意题');
    expect(submitModuleMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /B\. 城市绿地对城市居民健康具有综合价值/ }));
    fireEvent.click(screen.getByRole('button', { name: '下一题' }));
    fireEvent.click(screen.getByRole('button', { name: /C\. 青少年睡眠需要学校和家庭共同干预/ }));
    fireEvent.click(screen.getByRole('button', { name: '查看结果' }));

    await waitFor(() => {
      expect(submitModuleMock).toHaveBeenCalledWith('module-task-1');
    });
  });
});
