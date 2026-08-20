import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useTeacherWorkbenchData from './useTeacherWorkbenchData.js';

const { assignmentsAPI, classesAPI, questionsAPI, teacherWorkbenchAPI } = vi.hoisted(() => ({
  assignmentsAPI: {
    get: vi.fn(),
  },
  classesAPI: {
    list: vi.fn(),
    getWritings: vi.fn(),
  },
  questionsAPI: {
    list: vi.fn(),
  },
  teacherWorkbenchAPI: {
    overview: vi.fn(),
    drafts: vi.fn(),
    dueSoon: vi.fn(),
    gradings: vi.fn(),
    pendingComments: vi.fn(),
    exceptions: vi.fn(),
  },
}));

vi.mock('../../api/index.js', () => ({
  assignmentsAPI,
  classesAPI,
  questionsAPI,
  teacherWorkbenchAPI,
}));

function createHookProps(overrides = {}) {
  return {
    setActionMessage: vi.fn(),
    setAssignmentForm: vi.fn(),
    ...overrides,
  };
}

describe('useTeacherWorkbenchData', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    teacherWorkbenchAPI.overview.mockResolvedValue({
      recentAssignments: [{ id: 'assignment-1', title: 'First assignment' }],
      todo: {
        draftCount: 1,
        publishedCount: 2,
        dueSoonCount: 1,
        pendingGradings: 3,
        pendingComments: 1,
        exceptionCount: 0,
      },
    });
    teacherWorkbenchAPI.drafts.mockResolvedValue([{ id: 'draft-1' }]);
    teacherWorkbenchAPI.dueSoon.mockResolvedValue([{ id: 'due-1' }]);
    teacherWorkbenchAPI.gradings.mockResolvedValue([{ id: 'grading-1' }]);
    teacherWorkbenchAPI.pendingComments.mockResolvedValue([{ id: 'comment-1' }]);
    teacherWorkbenchAPI.exceptions.mockResolvedValue([{ id: 'exception-1' }]);

    questionsAPI.list.mockResolvedValue([{ id: 'question-1', title: 'Question 1' }]);
    classesAPI.list.mockResolvedValue([
      { id: 'class-1', name: 'Class 1' },
      { id: 'class-2', name: 'Class 2' },
    ]);
    classesAPI.getWritings.mockResolvedValue([{ id: 'writing-1' }]);
    assignmentsAPI.get.mockResolvedValue({
      assignment: {
        id: 'assignment-1',
        classId: 'class-1',
        classIds: ['class-1'],
        title: 'Recovered assignment',
        promptText: 'Write something',
        selectedType: 'narrative',
        selectedTypeMix: [{ type: 'narrative', percentage: 100 }],
        questionId: 'question-1',
        questionTitle: 'Question 1',
        dueAt: Date.parse('2026-04-20T10:00:00Z'),
        allowLate: true,
        maxScore: 18,
      },
    });
  });

  it('loads workbench data and selects the default class for queue and form', async () => {
    const props = createHookProps();
    const { result } = renderHook(() => useTeacherWorkbenchData(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    expect(result.current.state.assignments).toEqual([{ id: 'assignment-1', title: 'First assignment' }]);
    expect(result.current.state.draftAssignments).toEqual([{ id: 'draft-1' }]);
    expect(result.current.state.classes).toEqual([
      { id: 'class-1', name: 'Class 1' },
      { id: 'class-2', name: 'Class 2' },
    ]);
    expect(result.current.state.selectedQueueClassId).toBe('class-1');
    expect(classesAPI.getWritings).toHaveBeenCalledWith('class-1');
    expect(props.setAssignmentForm).toHaveBeenCalledWith(expect.any(Function));

    const defaulted = props.setAssignmentForm.mock.calls.at(-1)[0]({
      classId: '',
      classIds: [],
      title: '',
    });
    expect(defaulted.classId).toBe('class-1');
    expect(defaulted.classIds).toEqual(['class-1']);
    expect(questionsAPI.list).toHaveBeenCalledTimes(1);
    expect(classesAPI.list).toHaveBeenCalledTimes(1);
  });

  it('restores assignment detail by id even when it is not in recent overview assignments', async () => {
    assignmentsAPI.get.mockResolvedValueOnce({
      assignment: {
        id: 'older-assignment',
        classId: 'class-1',
        classIds: ['class-1'],
        title: 'Older assignment',
        promptText: 'Write something older',
        selectedType: 'narrative',
        selectedTypeMix: [{ type: 'narrative', percentage: 100 }],
        questionId: 'question-1',
        questionTitle: 'Question 1',
        dueAt: Date.parse('2026-04-20T10:00:00Z'),
        allowLate: true,
        maxScore: 18,
      },
    });
    const props = createHookProps();
    const { result } = renderHook(() => useTeacherWorkbenchData(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.loadWorkbench('older-assignment');
    });

    expect(assignmentsAPI.get).toHaveBeenCalledWith('older-assignment');
    expect(result.current.state.selectedAssignmentId).toBe('older-assignment');
    expect(result.current.state.assignmentDetail).toEqual(expect.objectContaining({
      assignment: expect.objectContaining({
        id: 'older-assignment',
        title: 'Older assignment',
      }),
    }));
    expect(props.setAssignmentForm).toHaveBeenCalledWith(expect.objectContaining({
      classId: 'class-1',
      classIds: ['class-1'],
      title: 'Older assignment',
      maxScore: 18,
    }));
  });

  it('keeps previous class queue data when queue refresh fails', async () => {
    const props = createHookProps();
    const { result } = renderHook(() => useTeacherWorkbenchData(props));

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.questionBankStatus).toBe('ready');
      expect(result.current.state.classesStatus).toBe('ready');
      expect(result.current.state.queueStatus).toBe('ready');
    });

    expect(result.current.state.questionBank).toEqual([{ id: 'question-1', title: 'Question 1' }]);
    expect(result.current.state.queueWritings).toEqual([{ id: 'writing-1' }]);

    classesAPI.getWritings.mockRejectedValueOnce(new Error('queue down'));

    await act(async () => {
      result.current.actions.setSelectedQueueClassId('class-2');
    });

    await waitFor(() => {
      expect(result.current.state.queueLoading).toBe(false);
      expect(result.current.state.queueStatus).toBe('degraded');
    });

    expect(result.current.state.queueWritings).toEqual([{ id: 'writing-1' }]);
    expect(result.current.state.queueError).toEqual(expect.objectContaining({
      code: 'CLASS_QUEUE_LOAD_FAILED',
    }));
  });
});
