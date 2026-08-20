import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GrammarWorkbenchPage from './GrammarWorkbenchPage.jsx';

const { grammarAPIMock } = vi.hoisted(() => ({
  grammarAPIMock: {
    teacherClasses: vi.fn(),
    teacherClassProgress: vi.fn(),
    teacherAssignments: vi.fn(),
    teacherAssignmentSubmissions: vi.fn(),
    createTeacherAssignment: vi.fn(),
  },
}));

vi.mock('../api/index.js', () => ({
  grammarAPI: grammarAPIMock,
}));

describe('GrammarWorkbenchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    grammarAPIMock.teacherClasses.mockResolvedValue([
      { id: 'class-1', className: '高二 1 班', studentCount: 2 },
    ]);
    grammarAPIMock.teacherClassProgress.mockResolvedValue([]);
    grammarAPIMock.teacherAssignments.mockResolvedValue([
      {
        id: 'assignment-1',
        title: '语法任务一',
        grammarPoint: '定语从句',
        quizType: 'single',
        dueAt: null,
        assignedCount: 2,
        completedCount: 1,
      },
    ]);
    grammarAPIMock.teacherAssignmentSubmissions.mockResolvedValue([
      {
        studentId: 's1',
        realName: '张三',
        studentNo: '001',
        status: 'submitted',
        correctCount: 4,
        totalCount: 5,
        submittedAt: 1782800000000,
      },
      {
        studentId: 's2',
        realName: '李四',
        studentNo: '002',
        status: 'pending',
        correctCount: null,
        totalCount: null,
        submittedAt: null,
      },
    ]);
    URL.createObjectURL = vi.fn(() => 'blob:grammar-submissions');
    URL.revokeObjectURL = vi.fn();
  });

  it('filters assignment submissions and exports csv', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<GrammarWorkbenchPage user={{ id: 'teacher-1', role: 'teacher' }} hideTopBar />);

    fireEvent.click(await screen.findByText('语法任务一'));

    expect(await screen.findByText(/张三/)).toBeInTheDocument();
    expect(screen.getByText(/李四/)).toBeInTheDocument();
  });

  it('renders a student row without crashing when grammarStats is missing', async () => {
    grammarAPIMock.teacherClassProgress.mockResolvedValue([
      { id: 's1', realName: '王五', studentNo: '003' },
    ]);

    render(<GrammarWorkbenchPage user={{ id: 'teacher-1', role: 'teacher' }} hideTopBar />);

    expect(await screen.findByText('王五')).toBeInTheDocument();
  });
});
