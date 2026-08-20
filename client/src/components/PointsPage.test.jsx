import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PointsPage from './PointsPage.jsx';

const { checkInMock, claimPendingPointsMock, getPointsSummaryMock, redeemPointsMock } = vi.hoisted(() => ({
  checkInMock: vi.fn(),
  claimPendingPointsMock: vi.fn(),
  getPointsSummaryMock: vi.fn(),
  redeemPointsMock: vi.fn(),
}));

vi.mock('../api/index.js', () => ({
  usersAPI: {
    getPointsSummary: getPointsSummaryMock,
    checkIn: checkInMock,
    claimPendingPoints: claimPendingPointsMock,
    redeemPoints: redeemPointsMock,
  },
}));

vi.mock('./shared/AppIcon.jsx', () => ({ default: () => null }));

describe('PointsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPointsSummaryMock.mockResolvedValue({
      balance: 150,
      pendingPoints: 0,
      pendingRewards: [],
      totalEarned: 45,
      totalSpent: 10,
      todayCheckedIn: false,
      checkinStreak: 0,
      recentLedger: [
        { id: '1', reason: 'daily_checkin', deltaPoints: 5, createdAt: 1782800000000 },
        { id: '2', reason: 'learning_writing', deltaPoints: 10, createdAt: 1782800000000 },
        { id: '3', reason: 'first_completion', deltaPoints: 20, createdAt: 1782800000000 },
        { id: '4', reason: 'unknown_internal_key', deltaPoints: 3, createdAt: 1782800000000 },
        { id: '5', reason: 'points_redemption', deltaPoints: -100, metadata: { reward: '写作批改1次' }, createdAt: 1782800000000 },
      ],
    });
    redeemPointsMock.mockResolvedValue({
      redemption: { reward: '写作批改1次', points: 100 },
      summary: { balance: 0, recentLedger: [] },
    });
    claimPendingPointsMock.mockResolvedValue({
      claimedPoints: 10,
      summary: { balance: 30, pendingPoints: 0, pendingRewards: [], recentLedger: [] },
    });
    checkInMock.mockResolvedValue({
      summary: {
        balance: 150,
        pendingPoints: 5,
        pendingRewards: [{ id: 'pending-checkin', reason: 'daily_checkin', points: 5 }],
        todayCheckedIn: true,
        checkinStreak: 1,
        recentLedger: [],
      },
    });
  });

  it('renders readable ledger labels instead of internal event keys', async () => {
    render(<PointsPage user={{ id: 'student-1' }} onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /近期记录/ }));

    expect(await screen.findAllByText('每日签到')).not.toHaveLength(0);
    expect(screen.getAllByText('完成写作练习')).not.toHaveLength(0);
    expect(screen.getAllByText('首次完成学习任务')).not.toHaveLength(0);
    expect(screen.getByText('兑换写作批改1次')).toBeInTheDocument();
    expect(screen.getByText('学习记录')).toBeInTheDocument();
    expect(screen.queryByText('daily_checkin')).not.toBeInTheDocument();
    expect(screen.queryByText('learning_writing')).not.toBeInTheDocument();
    expect(screen.queryByText('first_completion')).not.toBeInTheDocument();
    expect(screen.queryByText('unknown_internal_key')).not.toBeInTheDocument();
  });

  it('turns earning rules into actionable entries with status', async () => {
    const onNavigate = vi.fn();
    getPointsSummaryMock.mockResolvedValueOnce({
      balance: 20,
      pendingPoints: 10,
      pendingRewards: [{ id: 'pending-writing', reason: 'learning_writing', points: 10 }],
      todayCheckedIn: false,
      checkinStreak: 2,
      recentLedger: [{ id: 'reading-done', reason: 'learning_reading', deltaPoints: 5 }],
      earningRules: [
        { code: 'daily_checkin', action: '每日签到', points: 5 },
        { code: 'learning_writing', action: '每日完成写作训练', points: 10, dailyLimit: 1 },
        { code: 'learning_reading', action: '每日完成阅读训练', points: 5, dailyLimit: 1 },
        { code: 'learning_phonetics', action: '每日完成语音训练', points: 5, dailyLimit: 1 },
      ],
      redemptionRules: [],
    });
    render(<PointsPage user={{ id: 'student-1' }} onNavigate={onNavigate} />);

    expect(await screen.findByText('领取 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /每日完成写作训练/ })).toHaveTextContent('待领取');
    expect(screen.getByRole('button', { name: /每日完成阅读训练/ })).toHaveTextContent('已完成');
    expect(screen.getByRole('button', { name: /每日完成语音训练/ })).toHaveTextContent('每日1次 · 去语音');

    fireEvent.click(screen.getByRole('button', { name: /每日完成写作训练/ }));
    await waitFor(() => expect(claimPendingPointsMock).toHaveBeenCalledTimes(1));
    expect(onNavigate).not.toHaveBeenCalledWith('writing');

    fireEvent.click(screen.getByRole('button', { name: /每日完成语音训练/ }));
    expect(onNavigate).toHaveBeenCalledWith('phonetics-overview');

  });

  it('checks in from the earning rules card', async () => {
    render(<PointsPage user={{ id: 'student-1' }} onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /每日签到/ }));

    await waitFor(() => expect(checkInMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('签到成功，可在本页或今日任务领取积分。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /每日签到/ })).toHaveTextContent('待领取');
    expect(screen.getByText('领取 5')).toBeInTheDocument();
  });

  it('confirms redemption and shows success in a centered toast', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<PointsPage user={{ id: 'student-1' }} onNavigate={vi.fn()} />);

    await screen.findByText('写作批改1次');
    const redeemButton = screen.getAllByRole('button', { name: '兑换' }).find((button) => !button.disabled);
    fireEvent.click(redeemButton);

    expect(window.confirm).toHaveBeenCalledWith('确认兑换「写作批改1次」？将消耗 100 积分。');
    await waitFor(() => {
      expect(redeemPointsMock).toHaveBeenCalledWith('writing_review_1');
    });
    expect(screen.getByRole('status')).toHaveTextContent('✓ 兑换成功');
    expect(screen.getByRole('status')).toHaveTextContent('已消耗 100 积分');
    expect(screen.getByRole('status')).toHaveTextContent('获得：写作批改1次');
    expect(screen.queryByText('兑换成功！')).not.toBeInTheDocument();
  });
});
