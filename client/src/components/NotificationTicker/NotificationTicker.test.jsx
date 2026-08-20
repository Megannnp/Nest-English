import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NotificationTicker from './NotificationTicker.jsx';

const fetchTickerData = vi.fn();
const fetchAnnouncement = vi.fn();
const fetchMyMessages = vi.fn();
const submitMessage = vi.fn();
const getFileDownloadUrl = vi.fn((id) => `/api/announcements/${id}/file`);

vi.mock('../../api/announcements.js', () => ({
  fetchTickerData: (...args) => fetchTickerData(...args),
  fetchAnnouncement: (...args) => fetchAnnouncement(...args),
  fetchMyMessages: (...args) => fetchMyMessages(...args),
  submitMessage: (...args) => submitMessage(...args),
  getFileDownloadUrl: (...args) => getFileDownloadUrl(...args),
}));

vi.mock('../../utils/guestId.js', () => ({
  getOrCreateGuestId: () => 'guest-1',
}));

describe('NotificationTicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMyMessages.mockResolvedValue({ data: [] });
    submitMessage.mockResolvedValue({ ok: true });
  });

  it('renders announcement markdown in detail view', async () => {
    fetchTickerData.mockResolvedValueOnce({
      data: {
        announcements: [
          { id: 'a1', title: '系统维护', body: '摘要', created_at: '2026-04-18T09:00:00.000Z' },
        ],
        myMessages: [],
      },
    });
    fetchAnnouncement.mockResolvedValueOnce({
      data: {
        id: 'a1',
        title: '系统维护',
        body: '## 维护窗口\n\n[color=#2563a8]今晚 22:00[/color]',
        created_at: '2026-04-18T09:00:00.000Z',
      },
    });

    render(<NotificationTicker isGuest />);

    fireEvent.click(await screen.findByLabelText('留言面板'));
    fireEvent.click((await screen.findByText('摘要')).closest('button'));

    await waitFor(() => {
      expect(screen.getByText('维护窗口')).toBeInTheDocument();
    });

    const detail = screen.getByText('今晚 22:00');
    expect(detail.closest('span')).toHaveStyle({ color: 'rgb(37, 99, 168)' });
  });

  it('allows guests to leave messages with an anonymous id', async () => {
    fetchTickerData.mockResolvedValueOnce({
      data: {
        announcements: [],
        myMessages: [],
      },
    });

    render(<NotificationTicker isGuest />);
    fireEvent.click(await screen.findByLabelText('留言面板'));

    fireEvent.change(screen.getByLabelText('留言输入框'), { target: { value: '访客建议' } });
    fireEvent.click(screen.getByLabelText('提交留言'));

    await waitFor(() => {
      expect(submitMessage).toHaveBeenCalledWith('访客建议', 'guest-1');
    });
  });

  it('submits a message from the notification panel', async () => {
    fetchTickerData.mockResolvedValueOnce({
      data: {
        announcements: [],
        myMessages: [],
      },
    });

    render(<NotificationTicker userId="user-1" />);
    fireEvent.click(await screen.findByLabelText('留言面板'));

    fireEvent.change(screen.getByLabelText('留言输入框'), { target: { value: '希望增加练习提醒' } });
    fireEvent.click(screen.getByLabelText('提交留言'));

    await waitFor(() => {
      expect(submitMessage).toHaveBeenCalledWith('希望增加练习提醒', '');
    });
  });

  it('shows a floating window for logged-in mobile users and can minimize then restore', async () => {
    fetchTickerData.mockResolvedValueOnce({
      data: {
        announcements: [
          { id: 'a1', title: '系统维护', body: '今晚维护', created_at: '2026-04-18T09:00:00.000Z' },
        ],
        myMessages: [],
      },
    });

    render(<NotificationTicker userId="user-1" isMobile />);

    expect(await screen.findByLabelText('系统公告悬浮窗')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('最小化系统公告'));

    expect(screen.queryByLabelText('系统公告悬浮窗')).not.toBeInTheDocument();
    const launcher = screen.getByLabelText('打开系统公告悬浮窗');
    expect(launcher).toBeInTheDocument();
    expect(launcher).toHaveStyle({ left: `${window.innerWidth - 46}px` });

    fireEvent.click(screen.getByLabelText('打开系统公告悬浮窗'));

    expect(await screen.findByLabelText('系统公告悬浮窗')).toBeInTheDocument();
  });

  it('collapses the floating window after mobile page navigation', async () => {
    fetchTickerData.mockResolvedValueOnce({
      data: {
        announcements: [
          { id: 'a1', title: '系统维护', body: '今晚维护', created_at: '2026-04-18T09:00:00.000Z' },
        ],
        myMessages: [],
      },
    });

    const { rerender } = render(<NotificationTicker userId="user-1" isMobile currentPage="workbench" />);

    expect(await screen.findByLabelText('系统公告悬浮窗')).toBeInTheDocument();

    rerender(<NotificationTicker userId="user-1" isMobile currentPage="batch-grading" />);

    expect(screen.queryByLabelText('系统公告悬浮窗')).not.toBeInTheDocument();
    expect(screen.getByLabelText('打开系统公告悬浮窗')).toBeInTheDocument();
  });
});
