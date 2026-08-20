import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ClassManagementPage from './ClassManagementPage.jsx';
import { classesAPI } from '../api/index.js';

vi.mock('../api/index.js', () => ({
  classesAPI: {
    list: vi.fn(),
    getStudents: vi.fn().mockResolvedValue([]),
    getWritings: vi.fn().mockResolvedValue([]),
    getRoster: vi.fn().mockResolvedValue([]),
    getUnmatchedUsers: vi.fn().mockResolvedValue([]),
  },
}));

describe('ClassManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces an error instead of a silent empty list when loading classes fails', async () => {
    classesAPI.list.mockRejectedValue(new Error('网络异常，请稍后再试'));

    render(<ClassManagementPage isMobile={false} />);

    expect(await screen.findByText('班级列表加载失败')).toBeInTheDocument();
    expect(screen.getByText('网络异常，请稍后再试')).toBeInTheDocument();
    expect(screen.queryByText('还没有班级')).not.toBeInTheDocument();
  });

  it('renders the class list and detail panel on success', async () => {
    classesAPI.list.mockResolvedValue([
      { id: 'c1', className: '高二(3)班', classCode: 'ABC123', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);

    render(<ClassManagementPage isMobile={false} />);

    expect(await screen.findByText('Class Profile')).toBeInTheDocument();
    expect(screen.getAllByText('高二(3)班').length).toBeGreaterThan(0);
    await waitFor(() => expect(classesAPI.getStudents).toHaveBeenCalledWith('c1'));
    expect(screen.getByText('导入学生名单')).toBeInTheDocument();
  });
});
