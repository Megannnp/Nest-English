import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AssignmentDetailPanel from './AssignmentDetailPanel.jsx';

vi.mock('../../components/shared/UI.jsx', () => ({
  SurfaceCard: ({ children, style }) => <div style={style}>{children}</div>,
  SurfaceHeader: ({ title, badge }) => <div>{title} {badge}</div>,
  SmallActionButton: ({ children, onClick, disabled, style, tone: _tone }) => (
    <button type="button" onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  ),
  StatusBanner: ({ children, style, tone: _tone }) => <div style={style}>{children}</div>,
}));

vi.mock('./AssignmentDetailPanelSections.jsx', async () => {
  const actual = await vi.importActual('./AssignmentDetailPanelSections.jsx');
  return {
    ...actual,
    AssignmentPromptSection: () => <div>Prompt Section</div>,
    AssignmentPublishSettingsSection: () => <div>Publish Settings</div>,
    AssignmentRecordsSection: () => <div>Records Section</div>,
  };
});

vi.mock('../questions/QuestionSourceBrowser.jsx', () => ({
  default: function MockQuestionSourceBrowser() {
    return <div>Question Browser</div>;
  },
}));

function createProps(overrides = {}) {
  return {
    detail: null,
    form: {
      classId: 'class-a',
      classIds: ['class-a'],
      title: '作文练习',
      promptText: '请完成作文。',
      selectedType: 'general',
      selectedTypeMix: [],
      questionId: '',
      questionTitle: '',
      dueAt: '',
      allowLate: false,
      maxScore: 15,
    },
    classes: [
      { id: 'class-a', className: '高二 1 班' },
      { id: 'class-b', className: '高二 2 班' },
    ],
    questions: [],
    onChange: vi.fn(),
    onCreate: vi.fn(),
    onCreateAndPublish: vi.fn(),
    onPickQuestion: vi.fn(),
    onSave: vi.fn(),
    onPublish: vi.fn(),
    onClose: vi.fn(),
    onArchive: vi.fn(),
    onExport: vi.fn(),
    onExportPdf: vi.fn(),
    actionLoading: false,
    actionMessage: '',
    isMobile: false,
    ...overrides,
  };
}

describe('AssignmentDetailPanel', () => {
  it('allows class selection only when creating a new assignment', () => {
    render(<AssignmentDetailPanel {...createProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /高二 1 班/i }));

    expect(screen.getByLabelText('高二 2 班')).toBeInTheDocument();
  });

  it('keeps class selection locked for published assignments', () => {
    const onChange = vi.fn();
    render(<AssignmentDetailPanel {...createProps({
      onChange,
      detail: {
        assignment: {
          id: 'assignment-1',
          classId: 'class-a',
          className: '高二 1 班',
          title: '已发布作文',
          status: 'published',
          maxScore: 15,
        },
        summary: {},
        rows: [],
      },
    })} />);

    fireEvent.click(screen.getByRole('button', { name: /高二 1 班/i }));

    expect(screen.queryByLabelText('高二 2 班')).not.toBeInTheDocument();
    expect(screen.getByText('已发布或已关闭任务暂不支持更换班级。')).toBeInTheDocument();
    expect(screen.getByText('当前可继续修改标题、题目内容、截止时间和满分设置；如需更换班级，请新建任务。')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('passes the assignment id when exporting csv details', () => {
    const onExport = vi.fn();
    render(<AssignmentDetailPanel {...createProps({
      onExport,
      detail: {
        assignment: {
          id: 'assignment-1',
          classId: 'class-a',
          className: '高二 1 班',
          title: '已发布作文',
          status: 'published',
          maxScore: 15,
        },
        summary: {},
        rows: [],
      },
    })} />);

    fireEvent.click(screen.getByRole('button', { name: '导出学生明细' }));
    expect(onExport).toHaveBeenCalledWith('assignment-1', 'detail');
  });

  it('shows the action message near the publish buttons while creating a new assignment', () => {
    render(<AssignmentDetailPanel {...createProps({
      actionMessage: '请先填写写作要求',
    })} />);

    const messages = screen.getAllByText('请先填写写作要求');
    expect(messages.length).toBeGreaterThan(1);
  });
});
