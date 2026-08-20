import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DailyTasksFloat from './DailyTasksFloat.jsx';

const { assignmentTasksAPI, grammarAPI, usersAPI } = vi.hoisted(() => ({
  assignmentTasksAPI: { listMine: vi.fn() },
  grammarAPI: { myTasks: vi.fn() },
  usersAPI: {
    getPointsSummary: vi.fn(),
    claimPendingPoints: vi.fn(),
  },
}));

vi.mock('../../api/index.js', () => ({
  assignmentTasksAPI,
  grammarAPI,
  usersAPI,
}));

describe('DailyTasksFloat', () => {
  it('opens from the points page pending reward event', async () => {
    assignmentTasksAPI.listMine.mockResolvedValue([]);
    grammarAPI.myTasks.mockResolvedValue([]);
    usersAPI.getPointsSummary.mockResolvedValue({
      pendingRewards: [{ id: 'reward-1', label: '完成写作练习', points: 10 }],
    });

    render(<DailyTasksFloat user={{ id: 'student-1' }} onNavigate={vi.fn()} />);

    act(() => {
      window.dispatchEvent(new CustomEvent('nest:open-daily-tasks'));
    });

    expect(await screen.findByRole('dialog', { name: '今日任务' })).toBeInTheDocument();
    await waitFor(() => expect(usersAPI.getPointsSummary).toHaveBeenCalled());
    expect(screen.getByText(/完成写作练习/)).toBeInTheDocument();
  });

  it('snaps the floating trigger to the nearest screen edge after dragging', async () => {
    assignmentTasksAPI.listMine.mockResolvedValue([]);
    grammarAPI.myTasks.mockResolvedValue([]);
    usersAPI.getPointsSummary.mockResolvedValue({ pendingRewards: [] });

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });

    const { container } = render(<DailyTasksFloat user={{ id: 'student-1' }} onNavigate={vi.fn()} />);
    const root = container.querySelector('.dtf-root');
    const trigger = screen.getByRole('button', { name: '今日任务' });
    root.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 500,
      width: 120,
      height: 44,
      right: 220,
      bottom: 544,
      x: 100,
      y: 500,
      toJSON: () => {},
    }));

    fireEvent.pointerDown(trigger, { pointerId: 1, clientX: 110, clientY: 510, button: 0 });
    fireEvent.pointerMove(trigger, { pointerId: 1, clientX: 900, clientY: 600 });
    fireEvent.pointerUp(trigger, { pointerId: 1, clientX: 900, clientY: 600 });
    fireEvent.click(trigger);

    expect(root).toHaveStyle({ left: '888px', top: '590px' });
    expect(screen.queryByRole('dialog', { name: '今日任务' })).not.toBeInTheDocument();
  });
});
