import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AuthenticatedAppShell from './AuthenticatedAppShell.jsx';

const studentPage = {
  state: {},
  actions: {
    resetWritingSession: vi.fn(),
  },
};

function teacherPage(setPage = vi.fn()) {
  return {
    state: {
      selectedWritingContext: null,
      selectedTodoScene: 'gradings',
      selectedAssignmentId: '',
      accountTab: 'profile',
      accountReturnRoute: null,
      questions: [],
      writingFeedback: null,
      writingSessionKey: 0,
    },
    actions: {
      handleQuestionsChange: vi.fn(),
      handleWritingSaved: vi.fn(),
      setWritingFeedback: vi.fn(),
      setPage,
      setUser: vi.fn(),
      openWriting: vi.fn(),
      openTodoScene: vi.fn(),
      openAssignment: vi.fn(),
      openClassContext: vi.fn(),
    },
  };
}

function renderShell({ page, user, isMobile = true }) {
  const setPage = vi.fn();
  return render(
    <AuthenticatedAppShell
      user={user}
      page={page}
      setPage={setPage}
      isMobile={isMobile}
      sideHover={false}
      setSideHover={vi.fn()}
      showAccountMenu={false}
      setShowAccountMenu={vi.fn()}
      handleLogout={vi.fn()}
      studentPage={studentPage}
      teacherPage={teacherPage(setPage)}
    />
  );
}

describe('AuthenticatedAppShell', () => {
  it('hides the daily task float for teachers', () => {
    renderShell({ page: 'workbench', user: { id: 'teacher-1', role: 'teacher', realName: '测试老师' } });

    expect(screen.queryByRole('button', { name: '今日任务' })).not.toBeInTheDocument();
  });

  it('keeps the daily task float for students', () => {
    renderShell({ page: 'tasks', user: { id: 'student-1', role: 'student', realName: '测试学生' } });

    expect(screen.getByRole('button', { name: '今日任务' })).toBeInTheDocument();
  });

  it.each([
    ['listening-progress', { id: 'student-1', role: 'student', realName: '测试学生' }, '听得清楚，读得明白。'],
    ['vocab-analyzer', { id: 'student-1', role: 'student', realName: '测试学生' }, '吃透一个词，从词根到语境。'],
    ['phonetics-progress', { id: 'student-1', role: 'student', realName: '测试学生' }, '发音从音素到语流，成长一路可见。'],
    ['listening-workbench', { id: 'teacher-1', role: 'teacher', realName: '测试老师' }, '看见听读断点，安排下一次训练。'],
    ['vocab-workbench', { id: 'teacher-1', role: 'teacher', realName: '测试老师' }, '看见词汇掌握差异，安排分层复习。'],
    ['phonetics-workbench', { id: 'teacher-1', role: 'teacher', realName: '测试老师' }, '看见发音问题，安排基础训练。'],
  ])('keeps %s as a full-width module page on mobile', async (page, user, heading) => {
    renderShell({ page, user });

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '我的' })).toBeInTheDocument();
  });
});
