import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBatchGradingData } from './useBatchGradingData.js';
import { assignmentsAPI, classesAPI } from '../../api/index.js';

vi.mock('../../api/index.js', () => ({
  classesAPI: {
    list: vi.fn(),
    getStudents: vi.fn(),
    getRoster: vi.fn(),
  },
  assignmentsAPI: {
    list: vi.fn(),
  },
}));

describe('useBatchGradingData', () => {
  it('does not reset the selected assignment on rerender when studentsInClass reference changes', async () => {
    classesAPI.list.mockResolvedValue([{ id: 'class-1', className: '高一（3）班' }]);
    classesAPI.getStudents.mockResolvedValue([]);
    classesAPI.getRoster.mockResolvedValue([]);
    assignmentsAPI.list.mockResolvedValue([
      { id: 'assignment-1', title: '任务 1', status: 'published', maxScore: 15 },
    ]);

    const setClasses = vi.fn();
    const setSelectedClassId = vi.fn();
    const setClassStudents = vi.fn();
    const setRosterItems = vi.fn();
    const setAssignments = vi.fn();
    const setSelectedAssignmentId = vi.fn();

    const { rerender } = renderHook(
      ({ studentsInClass }) => useBatchGradingData({
        user: { role: 'teacher' },
        selectedClassId: 'class-1',
        setClasses,
        setSelectedClassId,
        setClassStudents,
        setRosterItems,
        setAssignments,
        setSelectedAssignmentId,
        studentsInClass,
      }),
      {
        initialProps: {
          studentsInClass: [],
        },
      }
    );

    await waitFor(() => {
      expect(assignmentsAPI.list).toHaveBeenCalledTimes(1);
    });

    setSelectedAssignmentId.mockClear();

    rerender({ studentsInClass: [] });

    await waitFor(() => {
      expect(assignmentsAPI.list).toHaveBeenCalledTimes(1);
    });

    expect(setSelectedAssignmentId).not.toHaveBeenCalled();
  });

  it('keeps the selected assignment while refreshing the same class list', async () => {
    classesAPI.list.mockResolvedValue([{ id: 'class-1', className: '高一（3）班' }]);
    classesAPI.getStudents.mockResolvedValue([]);
    classesAPI.getRoster.mockResolvedValue([]);
    assignmentsAPI.list.mockResolvedValue([
      { id: 'assignment-1', title: '任务 1', status: 'published', maxScore: 15 },
    ]);

    const setClasses = vi.fn();
    const setSelectedClassId = vi.fn();
    const setClassStudents = vi.fn();
    const setRosterItems = vi.fn();
    const setAssignments = vi.fn();
    const setSelectedAssignmentId = vi.fn();

    renderHook(() => useBatchGradingData({
      user: { role: 'teacher' },
      selectedClassId: 'class-1',
      selectedAssignmentId: 'assignment-1',
      setClasses,
      setSelectedClassId,
      setClassStudents,
      setRosterItems,
      setAssignments,
      setSelectedAssignmentId,
      studentsInClass: [],
    }));

    await waitFor(() => {
      expect(assignmentsAPI.list).toHaveBeenCalled();
    });
    expect(setSelectedAssignmentId).not.toHaveBeenCalled();
  });

  it('reports a failed class list load through setClassesError instead of swallowing it', async () => {
    classesAPI.list.mockRejectedValue(new Error('网络异常，请稍后再试'));

    const setClassesError = vi.fn();

    renderHook(() => useBatchGradingData({
      user: { role: 'teacher' },
      selectedClassId: '',
      setClasses: vi.fn(),
      setSelectedClassId: vi.fn(),
      setClassStudents: vi.fn(),
      setRosterItems: vi.fn(),
      setAssignments: vi.fn(),
      setSelectedAssignmentId: vi.fn(),
      setClassesError,
      studentsInClass: [],
    }));

    await waitFor(() => {
      expect(setClassesError).toHaveBeenCalledWith('网络异常，请稍后再试');
    });
  });
});
