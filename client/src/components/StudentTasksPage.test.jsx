import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StudentTasksPage from './StudentTasksPage.jsx';

const { assignmentListMock, grammarTasksMock, moduleListMock, submitModuleMock } = vi.hoisted(() => ({
  assignmentListMock: vi.fn(),
  grammarTasksMock: vi.fn(),
  moduleListMock: vi.fn(),
  submitModuleMock: vi.fn(),
}));

vi.mock('../api/index.js', () => ({
  assignmentTasksAPI: { listMine: assignmentListMock },
  grammarAPI: { myTasks: grammarTasksMock },
  moduleAssignmentsAPI: {
    listMine: moduleListMock,
    submit: submitModuleMock,
  },
}));

vi.mock('./shared/AppIcon.jsx', () => ({ default: () => null }));
vi.mock('./student/StudentSectionHeader.jsx', () => ({
  default: ({ title }) => <div>{title}</div>,
}));

const STUDENT_USER = { id: 'u-1', role: 'student' };
const MODULE_TASK = {
  id: 'ma-1',
  taskType: 'module',
  status: 'pending',
  submittedAt: null,
  completedAt: null,
  assignment: {
    id: 'ma-1',
    title: '第三单元词汇练习',
    classId: 'cls-1',
    className: '高一1班',
    teacherName: '王老师',
    moduleType: 'vocab',
    moduleLabel: '词汇闪卡',
    moduleGroup: '词汇',
    entryPage: 'vocab-flashcard',
    topic: '',
    dueAt: null,
    allowLate: true,
  },
};

describe('StudentTasksPage — module task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assignmentListMock.mockResolvedValue([]);
    grammarTasksMock.mockResolvedValue([]);
    moduleListMock.mockResolvedValue([MODULE_TASK]);
  });

  it('renders module task card with title and module label', async () => {
    render(<StudentTasksPage user={STUDENT_USER} />);

    await screen.findByText('第三单元词汇练习');
    expect(screen.getByText('词汇闪卡')).toBeInTheDocument();
  });

  it('shows 去练习 and 标记完成 buttons for pending module task', async () => {
    render(<StudentTasksPage user={STUDENT_USER} />);

    await screen.findByText('第三单元词汇练习');
    expect(screen.getByRole('button', { name: '去练习' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '标记完成' })).toBeInTheDocument();
  });

  it('calls moduleAssignmentsAPI.submit with task id when 标记完成 is clicked', async () => {
    submitModuleMock.mockResolvedValue({ id: 'ma-1', status: 'completed' });
    render(<StudentTasksPage user={STUDENT_USER} />);

    await screen.findByText('第三单元词汇练习');
    fireEvent.click(screen.getByRole('button', { name: '标记完成' }));

    await waitFor(() => {
      expect(submitModuleMock).toHaveBeenCalledWith('ma-1');
    });
  });

  it('shows error banner when submit fails', async () => {
    submitModuleMock.mockRejectedValue(new Error('提交失败，服务器错误'));
    render(<StudentTasksPage user={STUDENT_USER} />);

    await screen.findByText('第三单元词汇练习');
    fireEvent.click(screen.getByRole('button', { name: '标记完成' }));

    await waitFor(() => {
      expect(screen.getByText(/提交失败/)).toBeInTheDocument();
    });
  });

  it('shows a compact empty state followed by module entries', async () => {
    const onNavigate = vi.fn();
    moduleListMock.mockResolvedValue([]);

    render(<StudentTasksPage user={STUDENT_USER} onNavigate={onNavigate} />);

    expect(await screen.findByRole('heading', { name: '备考' })).toBeInTheDocument();
    expect(screen.queryByText('筑巢学习 · 任务')).not.toBeInTheDocument();
    await screen.findByText('暂无待完成任务。老师布置的新任务会显示在这里。');
    expect(screen.getByText('继续学习')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /语音/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /口语/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /口语/ }));
    expect(onNavigate).toHaveBeenCalledWith('speaking');
    fireEvent.click(screen.getByRole('button', { name: /语音/ }));
    expect(onNavigate).toHaveBeenCalledWith('phonetics-overview');
    expect(screen.queryByRole('button', { name: /去自由练习/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /刷新任务/ })).not.toBeInTheDocument();
  });

  it('keeps rendering available tasks when one task source fails', async () => {
    assignmentListMock.mockRejectedValue(new Error('写作任务接口失败'));

    render(<StudentTasksPage user={STUDENT_USER} />);

    await screen.findByText('第三单元词汇练习');
    expect(screen.getByText('部分任务加载失败，已显示可获取的任务。')).toBeInTheDocument();
  });
});
