import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useTeacherWorkbenchDerivedState from './useTeacherWorkbenchDerivedState.js';

const { usersAPI } = vi.hoisted(() => ({
  usersAPI: {
    updateProfile: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../api/index.js', () => ({
  usersAPI,
}));

function createProps(overrides = {}) {
  return {
    activeTodoFilter: 'all',
    commentClassFilter: 'class-ghost',
    gradingClassFilter: 'class-2',
    manualTodoFilterUntil: 0,
    pendingComments: [
      { id: 'comment-1', classId: 'class-1', className: 'Class 1', quickSummary: '需要重写', totalScore: 14, maxScore: 20 },
      { id: 'comment-2', classId: 'class-2', className: 'Class 2', quickSummary: '偏题，需要调整', totalScore: 8, maxScore: 20 },
    ],
    pendingGradings: [
      { id: 'grading-1', classId: 'class-1', className: 'Class 1', quickSummary: '内容较完整', totalScore: 12, maxScore: 20 },
      { id: 'grading-2', classId: 'class-2', className: 'Class 2', quickSummary: '偏题，内容风险较高', totalScore: 4, maxScore: 20 },
    ],
    setActiveTodoFilter: vi.fn(),
    setAutoFocusHint: vi.fn(),
    setCommentClassFilter: vi.fn(),
    setGradingClassFilter: vi.fn(),
    todo: {
      draftCount: 0,
      publishedCount: 0,
      dueSoonCount: 0,
      pendingGradings: 2,
      pendingComments: 1,
      exceptionCount: 3,
    },
    todoFilterStorageKey: 'teacher-workbench-todo-filters:teacher-1',
    userId: 'teacher-1',
    ...overrides,
  };
}

describe('useTeacherWorkbenchDerivedState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  it('auto-focuses the highest priority section and persists filters', async () => {
    const props = createProps();
    const { result } = renderHook(() => useTeacherWorkbenchDerivedState(props));

    expect(props.setActiveTodoFilter).toHaveBeenCalledWith('exceptions');
    expect(props.setAutoFocusHint).toHaveBeenCalledWith('已优先聚焦「异常待处理」，当前有 3 项更值得先处理。');
    expect(window.localStorage.getItem(props.todoFilterStorageKey)).toBe(JSON.stringify({
      gradingClassFilter: 'class-2',
      commentClassFilter: 'class-ghost',
    }));

    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    expect(usersAPI.updateProfile).toHaveBeenCalledWith({
      preferences: {
        teacherWorkbenchFilters: {
          gradingClassFilter: 'class-2',
          commentClassFilter: 'class-ghost',
        },
      },
    });

    expect(result.current.visibleSections.exceptions).toBe(true);
    expect(result.current.gradingClassOptions).toEqual([
      { value: 'class-1', label: 'Class 1' },
      { value: 'class-2', label: 'Class 2' },
    ]);
    expect(result.current.filteredPendingGradings).toHaveLength(1);
  });

  it('resets invalid class filters and computes risk counters from filtered rows', () => {
    const props = createProps();
    const { result } = renderHook(() => useTeacherWorkbenchDerivedState(props));

    expect(props.setCommentClassFilter).toHaveBeenCalledWith('all');
    expect(props.setGradingClassFilter).not.toHaveBeenCalledWith('all');
    expect(result.current.filteredPendingComments).toHaveLength(0);
    expect(result.current.gradingRiskCount).toBe(1);
    expect(result.current.gradingOffTopicCount).toBe(1);
    expect(result.current.commentRiskCount).toBe(1);
    expect(result.current.commentOffTopicCount).toBe(1);
  });
});
