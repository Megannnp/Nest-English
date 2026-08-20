import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TeacherWorkbenchPage from './TeacherWorkbenchPage.jsx';

const mockUseTeacherWorkbenchModel = vi.fn();

vi.mock('./workbench/useTeacherWorkbenchModel.js', () => ({
  default: (...args) => mockUseTeacherWorkbenchModel(...args),
}));

vi.mock('../components/shared/UI.jsx', () => ({
  EmptyStateCard: ({ title, description }) => <div>{title}{description}</div>,
  LargePageHeader: ({ eyebrow, title, action }) => <div>{eyebrow}{title}{action}</div>,
  PageHeader: ({ titleZh, subtitle }) => <div><h1>{titleZh}</h1><p>{subtitle}</p></div>,
  StatusBanner: ({ children }) => <div>{children}</div>,
  SmallActionButton: ({ children, onClick, disabled, style, tone: _tone }) => (
    <button type="button" onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  ),
  SurfaceCard: ({ children, style }) => <div style={style}>{children}</div>,
  SurfaceHeader: ({ title, action }) => <div>{title}{action}</div>,
}));

vi.mock('./workbench/WorkbenchQueueSections.jsx', () => ({
  UploadEntrySection: function MockUploadEntrySection() {
    return <div>Upload Entry</div>;
  },
}));

vi.mock('./workbench/AssignmentDetailPanel.jsx', () => ({
  AssignmentCard: function MockAssignmentCard({ assignment, onSelect, onEdit }) {
    return (
      <div>
        <div>{assignment.title}</div>
        <button type="button" onClick={onSelect}>查看详情</button>
        <button type="button" onClick={onEdit}>更多操作 ▾</button>
        {assignment.status === 'draft' ? <button type="button" onClick={onEdit}>编辑任务</button> : null}
      </div>
    );
  },
}));

function createWorkbenchModelValue() {
  return {
    state: {
      assignments: [
        { id: 'draft-1', title: 'Draft Task', status: 'draft', maxScore: 15 },
        { id: 'published-1', title: 'Published Task', status: 'published', maxScore: 20 },
        { id: 'closed-1', title: 'Closed Task', status: 'closed', maxScore: 18 },
        { id: 'archived-1', title: 'Archived Task', status: 'archived', maxScore: 12 },
      ],
      classes: [{ id: 'class-1', className: '高二 1 班' }],
      selectedQueueClassId: 'class-1',
      queueWritings: [],
      queueLoading: false,
      error: '',
    },
    actions: {
      setSelectedQueueClassId: vi.fn(),
      handlePublish: vi.fn(),
      handleClose: vi.fn(),
      handleArchive: vi.fn(),
      handleExport: vi.fn(),
    },
  };
}

describe('TeacherWorkbenchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeacherWorkbenchModel.mockReturnValue(createWorkbenchModelValue());
  });

  it('renders teacher module entry cards without the legacy assignment directory', () => {
    render(<TeacherWorkbenchPage user={{ id: 'teacher-1' }} />);

    expect(screen.getByRole('heading', { name: '工作台' })).toBeInTheDocument();
    expect(screen.queryByText('筑巢工作台 · 布置')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /布置新任务/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '选择模块开始布置' })).toBeInTheDocument();
    ['写作', '语法', '阅读', '词汇', '听读', '语音'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.queryByText('学生任务卡片摘要')).not.toBeInTheDocument();
    expect(screen.getByText('布置流程')).toBeInTheDocument();
  });

  it('opens the correct module workbench when module cards are clicked', () => {
    const onNavigate = vi.fn();
    render(<TeacherWorkbenchPage user={{ id: 'teacher-1' }} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('写作').closest('button'));
    fireEvent.click(screen.getByText('语法').closest('button'));

    expect(onNavigate).toHaveBeenNthCalledWith(1, 'assignment-create');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'grammar-workbench');
  });
});
