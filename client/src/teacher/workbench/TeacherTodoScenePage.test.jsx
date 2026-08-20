import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TeacherTodoScenePage from './TeacherTodoScenePage.jsx';

const mockUseTeacherWorkbenchModel = vi.fn();
const assignmentDetailPanelSpy = vi.fn();

vi.mock('./useTeacherWorkbenchModel.js', () => ({
  default: (...args) => mockUseTeacherWorkbenchModel(...args),
}));

vi.mock('./AssignmentDetailPanel.jsx', () => ({
  default: (props) => {
    assignmentDetailPanelSpy(props);
    return <div data-testid="assignment-detail-panel">{props.detail?.assignment?.id || 'empty'}</div>;
  },
}));

function createWorkbenchModelValue(overrides = {}) {
  return {
    state: {
      draftAssignments: [
        { id: 'draft-1', title: 'Draft 1', status: 'draft', maxScore: 15 },
      ],
      dueSoonAssignments: [
        {
          id: 'assignment-2',
          title: 'Due Soon',
          className: '高二 1 班',
          dueAt: Date.parse('2026-04-22T10:00:00Z'),
          returnedCount: 1,
          totalCount: 3,
          unfinishedCount: 2,
          status: 'published',
          maxScore: 20,
        },
      ],
      selectedAssignmentId: '',
      assignmentDetail: {
        assignment: {
          id: 'assignment-2',
          title: 'Due Soon',
          status: 'published',
          classId: 'class-1',
          classIds: ['class-1'],
          maxScore: 20,
        },
        summary: {},
        rows: [],
      },
      assignmentForm: {
        classId: 'class-1',
        classIds: ['class-1'],
        title: 'Due Soon',
        promptText: '请完成作文。',
        selectedType: 'general',
        selectedTypeMix: [],
        questionId: '',
        questionTitle: '',
        dueAt: '2026-04-22T18:00',
        allowLate: false,
        maxScore: 20,
      },
      classes: [{ id: 'class-1', className: '高二 1 班' }],
      questionBank: [],
      questionBankStatus: 'ready',
      questionBankError: null,
      classesStatus: 'ready',
      classesError: null,
      queueStatus: 'idle',
      queueError: null,
      exceptions: [],
      gradingClassFilter: 'all',
      commentClassFilter: 'all',
      gradingClassOptions: [],
      filteredPendingGradings: [],
      commentClassOptions: [],
      filteredPendingComments: [],
      loading: false,
      detailLoading: false,
      error: '',
      actionLoading: false,
      actionMessage: '',
    },
    actions: {
      setGradingClassFilter: vi.fn(),
      setCommentClassFilter: vi.fn(),
      loadAssignmentDetail: vi.fn(),
      handleAssignmentFieldChange: vi.fn(),
      handlePickQuestion: vi.fn(),
      handleSaveDraft: vi.fn(),
      handleOpenWriting: vi.fn(),
      handlePublish: vi.fn(),
      handleClose: vi.fn(),
      handleArchive: vi.fn(),
      handleExport: vi.fn(),
      handleExportPdf: vi.fn(),
    },
    ...overrides,
  };
}

describe('TeacherTodoScenePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders assignment detail panel for dueSoon scene and loads the first task by default', () => {
    const modelValue = createWorkbenchModelValue();
    mockUseTeacherWorkbenchModel.mockReturnValue(modelValue);

    render(<TeacherTodoScenePage user={{ id: 'teacher-1' }} scene="dueSoon" />);

    expect(screen.getByTestId('assignment-detail-panel')).toHaveTextContent('assignment-2');
    expect(modelValue.actions.loadAssignmentDetail).toHaveBeenCalledWith('assignment-2');
  });

  it('does not pass unsupported delete or withdraw actions into the assignment detail panel', () => {
    const modelValue = createWorkbenchModelValue({
      state: {
        ...createWorkbenchModelValue().state,
        selectedAssignmentId: 'draft-1',
        assignmentDetail: {
          assignment: {
            id: 'draft-1',
            title: 'Draft 1',
            status: 'draft',
            classId: 'class-1',
            classIds: ['class-1'],
            maxScore: 15,
          },
          summary: {},
          rows: [],
        },
      },
    });
    mockUseTeacherWorkbenchModel.mockReturnValue(modelValue);

    render(<TeacherTodoScenePage user={{ id: 'teacher-1' }} scene="drafts" />);

    const lastPanelProps = assignmentDetailPanelSpy.mock.calls.at(-1)[0];
    expect(lastPanelProps.onDelete).toBeUndefined();
    expect(lastPanelProps.onWithdraw).toBeUndefined();
  });

  it('keeps dueSoon row actions hooked to loadAssignmentDetail', () => {
    const modelValue = createWorkbenchModelValue();
    mockUseTeacherWorkbenchModel.mockReturnValue(modelValue);

    render(<TeacherTodoScenePage user={{ id: 'teacher-1' }} scene="dueSoon" />);

    fireEvent.click(screen.getByRole('button', { name: '查看任务' }));

    expect(modelValue.actions.loadAssignmentDetail).toHaveBeenCalledWith('assignment-2');
  });
});
