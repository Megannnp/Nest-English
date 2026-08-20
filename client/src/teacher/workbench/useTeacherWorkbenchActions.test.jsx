import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useTeacherWorkbenchActions from './useTeacherWorkbenchActions.js';

const { assignmentsAPI, exportAssignmentPdf } = vi.hoisted(() => ({
  assignmentsAPI: {
    update: vi.fn(),
    create: vi.fn(),
    publish: vi.fn(),
    close: vi.fn(),
    archive: vi.fn(),
    export: vi.fn(),
    getExportData: vi.fn(),
  },
  exportAssignmentPdf: vi.fn(),
}));

vi.mock('../../api/index.js', () => ({
  assignmentsAPI,
}));

vi.mock('./assignmentPdfExport.js', () => ({
  exportAssignmentPdf,
}));

function createProps(overrides = {}) {
  return {
    assignmentDetail: {
      assignment: {
        id: 'assignment-1',
        classId: 'class-a',
        selectedThemes: ['theme-1'],
        status: 'draft',
        maxScore: 15,
      },
    },
    assignmentForm: {
      classId: 'class-a',
      classIds: ['class-a', 'class-b'],
      title: '作文练习',
      promptText: '请完成作文。',
      selectedType: 'narrative',
      selectedTypeMix: [{ type: 'narrative', percentage: 100 }],
      questionId: 'question-1',
      questionTitle: '一次难忘的经历',
      dueAt: '2026-04-20T10:00',
      allowLate: false,
      maxScore: 20,
    },
    clearAssignmentSelection: vi.fn(),
    loadWorkbench: vi.fn().mockResolvedValue(undefined),
    onOpenWriting: vi.fn(),
    onReturnToWorkbench: vi.fn(),
    selectedAssignmentId: 'assignment-1',
    setActionLoading: vi.fn(),
    setActionMessage: vi.fn(),
    ...overrides,
  };
}

describe('useTeacherWorkbenchActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    window.confirm = vi.fn(() => true);
  });

  it('creates and publishes one assignment per selected class', async () => {
    assignmentsAPI.create
      .mockResolvedValueOnce({ assignment: { id: 'draft-a' } })
      .mockResolvedValueOnce({ assignment: { id: 'draft-b' } });
    assignmentsAPI.publish.mockResolvedValue(undefined);

    const props = createProps();
    const { result } = renderHook(() => useTeacherWorkbenchActions(props));

    await act(async () => {
      await result.current.handleCreateAndPublish();
    });

    expect(assignmentsAPI.create).toHaveBeenCalledTimes(2);
    expect(assignmentsAPI.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      classId: 'class-a',
      classIds: ['class-a'],
      title: '作文练习',
      maxScore: 20,
    }));
    expect(assignmentsAPI.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      classId: 'class-b',
      classIds: ['class-b'],
    }));
    expect(assignmentsAPI.publish).toHaveBeenNthCalledWith(1, 'draft-a');
    expect(assignmentsAPI.publish).toHaveBeenNthCalledWith(2, 'draft-b');
    expect(props.loadWorkbench).toHaveBeenCalledWith('');
    expect(props.clearAssignmentSelection).toHaveBeenCalledWith({ keepActionMessage: true });
    expect(props.onReturnToWorkbench).toHaveBeenCalled();
    expect(props.setActionLoading).toHaveBeenNthCalledWith(1, true);
    expect(props.setActionLoading).toHaveBeenLastCalledWith(false);
    expect(props.setActionMessage).toHaveBeenCalledWith('已为 2 个班级发布任务');

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(props.setActionMessage).toHaveBeenLastCalledWith('');
  });

  it('uses the picked question title as the assignment title fallback when publishing', async () => {
    assignmentsAPI.create.mockResolvedValueOnce({ assignment: { id: 'draft-a' } });
    assignmentsAPI.publish.mockResolvedValue(undefined);

    const props = createProps({
      assignmentForm: {
        ...createProps().assignmentForm,
        title: '',
        questionTitle: '2025浙江1月卷——读后续写',
        classIds: ['class-a'],
      },
    });
    const { result } = renderHook(() => useTeacherWorkbenchActions(props));

    await act(async () => {
      await result.current.handleCreateAndPublish();
    });

    expect(assignmentsAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      title: '2025浙江1月卷——读后续写',
    }));
  });

  it('exports PDF payload through the shared exporter', async () => {
    assignmentsAPI.getExportData.mockResolvedValue({ assignment: { id: 'assignment-1' } });
    const props = createProps();
    const { result } = renderHook(() => useTeacherWorkbenchActions(props));

    await act(async () => {
      await result.current.handleExportPdf('assignment-1', ['overview', 'details']);
    });

    expect(assignmentsAPI.getExportData).toHaveBeenCalledWith('assignment-1');
    expect(exportAssignmentPdf).toHaveBeenCalledWith({
      payload: { assignment: { id: 'assignment-1' } },
      modules: ['overview', 'details'],
    });
    expect(props.setActionMessage).toHaveBeenCalledWith('PDF 导出面板已打开，请在打印面板中保存为 PDF');
    expect(props.setActionLoading).toHaveBeenLastCalledWith(false);
  });

  it('rejects class changes for published assignments before calling update', async () => {
    assignmentsAPI.update.mockResolvedValue(undefined);
    const props = createProps({
      assignmentDetail: {
        assignment: {
          id: 'assignment-1',
          classId: 'class-a',
          classIds: ['class-a'],
          selectedThemes: ['theme-1'],
          status: 'published',
          maxScore: 15,
        },
      },
      assignmentForm: {
        ...createProps().assignmentForm,
        classId: 'class-b',
        classIds: ['class-b'],
      },
    });
    const { result } = renderHook(() => useTeacherWorkbenchActions(props));

    await act(async () => {
      await result.current.handleSaveDraft('assignment-1');
    });

    expect(assignmentsAPI.update).not.toHaveBeenCalled();
    expect(props.setActionMessage).toHaveBeenCalledWith('已发布或已关闭任务暂不支持更换班级，如需调整请新建任务');
  });

  it('still updates the class selection for draft assignments', async () => {
    assignmentsAPI.update.mockResolvedValue(undefined);
    const props = createProps({
      assignmentDetail: {
        assignment: {
          id: 'assignment-1',
          classId: 'class-a',
          classIds: ['class-a'],
          selectedThemes: ['theme-1'],
          status: 'draft',
          maxScore: 15,
        },
      },
      assignmentForm: {
        ...createProps().assignmentForm,
        classId: 'class-b',
        classIds: ['class-b'],
      },
    });
    const { result } = renderHook(() => useTeacherWorkbenchActions(props));

    await act(async () => {
      await result.current.handleSaveDraft('assignment-1');
    });

    expect(assignmentsAPI.update).toHaveBeenCalledWith('assignment-1', expect.objectContaining({
      classId: 'class-b',
      classIds: ['class-b'],
    }));
  });

  it('supports csv export calls that pass assignment id and type explicitly', async () => {
    assignmentsAPI.export.mockResolvedValue({ filename: '导出.csv' });
    const props = createProps();
    const { result } = renderHook(() => useTeacherWorkbenchActions(props));

    await act(async () => {
      await result.current.handleExport('assignment-1', 'detail');
    });

    expect(assignmentsAPI.export).toHaveBeenCalledWith('assignment-1', 'detail');
    expect(props.setActionMessage).toHaveBeenCalledWith('导出.csv 已开始下载');
  });
});
