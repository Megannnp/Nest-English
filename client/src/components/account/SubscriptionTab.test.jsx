import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { usersAPI, paymentsAPI } = vi.hoisted(() => ({
  usersAPI: {
    getPointsSummary: vi.fn(),
    checkIn: vi.fn(),
    redeemPoints: vi.fn(),
  },
  paymentsAPI: {
    orders: vi.fn(),
    createOrder: vi.fn(),
    closeOrder: vi.fn(),
  },
}));

vi.mock('../../api/index.js', () => ({
  usersAPI,
  paymentsAPI,
}));

describe('SubscriptionTab', () => {
  beforeEach(() => {
    paymentsAPI.orders.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the active membership module scope instead of the free plan scope', async () => {
    const { default: SubscriptionTab } = await import('./SubscriptionTab.jsx');
    usersAPI.getPointsSummary.mockResolvedValueOnce({
      balance: 120,
      totalEarned: 320,
      totalSpent: 200,
      todayCheckedIn: false,
      checkinStreak: 3,
      membership: {
        tier: 'premium',
        expiresAt: Date.UTC(2026, 6, 31),
      },
      entitlements: [],
      earningRules: [],
      redemptionRules: [],
    });

    render(<SubscriptionTab isMobile={false} user={{ id: 'student-1' }} onNavigate={vi.fn()} />);

    await waitFor(() => expect(usersAPI.getPointsSummary).toHaveBeenCalled());
    expect((await screen.findAllByText('大会员')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('全部模块开放').length).toBeGreaterThan(0);
    expect(screen.queryByText('阅读、写作、词汇、语法')).not.toBeInTheDocument();
    expect(screen.queryByText('查看完整收费方案')).not.toBeInTheDocument();
  });

  it('offers every paid membership cycle and creates orders with catalog product codes', async () => {
    const { default: SubscriptionTab } = await import('./SubscriptionTab.jsx');
    usersAPI.getPointsSummary.mockResolvedValueOnce({
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      todayCheckedIn: false,
      checkinStreak: 0,
      membership: null,
      entitlements: [],
      earningRules: [],
      redemptionRules: [],
    });
    paymentsAPI.createOrder.mockResolvedValueOnce({
      id: 'order-1',
      productLabel: '普通会员（年卡）',
      amountCents: 49900,
      status: 'pending',
      qrUrl: '',
    });

    render(<SubscriptionTab isMobile={false} user={{ id: 'student-1' }} onNavigate={vi.fn()} />);

    await waitFor(() => expect(usersAPI.getPointsSummary).toHaveBeenCalled());
    expect(screen.getByText('¥59/月')).toBeInTheDocument();
    expect(screen.getByText('¥129/月')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '季卡' }));
    expect(screen.getByText('¥159/季')).toBeInTheDocument();
    expect(screen.getByText('¥349/季')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '年卡' }));
    expect(screen.getByText('¥499/年')).toBeInTheDocument();
    expect(screen.getByText('¥999/年')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: '立即开通' });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(paymentsAPI.createOrder).toHaveBeenCalledWith('standard_year');
    });
  });

  it('marks first-month auto-renewal prices as reserved until recurring payment is connected', async () => {
    const { default: SubscriptionTab } = await import('./SubscriptionTab.jsx');
    usersAPI.getPointsSummary.mockResolvedValueOnce({
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      todayCheckedIn: false,
      checkinStreak: 0,
      membership: null,
      entitlements: [],
      earningRules: [],
      redemptionRules: [],
    });

    render(<SubscriptionTab isMobile={false} user={{ id: 'student-1' }} onNavigate={vi.fn()} />);

    expect(await screen.findByText(/自动续费接入后可享首月优惠/)).toBeInTheDocument();
    expect(screen.getAllByText(/自动续费接入后首月/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/开启自动续费/)).not.toBeInTheDocument();
    expect(screen.queryByText(/首月自动续费/)).not.toBeInTheDocument();
  });

  it('shows recent payment orders with localized status labels', async () => {
    const { default: SubscriptionTab } = await import('./SubscriptionTab.jsx');
    usersAPI.getPointsSummary.mockResolvedValueOnce({
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      todayCheckedIn: false,
      checkinStreak: 0,
      membership: null,
      entitlements: [],
      earningRules: [],
      redemptionRules: [],
    });
    paymentsAPI.orders.mockResolvedValueOnce([
      {
        id: 'order-paid',
        productLabel: '普通会员（月卡）',
        amountCents: 5900,
        status: 'paid',
        createdAt: Date.UTC(2026, 5, 22),
      },
    ]);

    render(<SubscriptionTab isMobile={false} user={{ id: 'student-1' }} onNavigate={vi.fn()} />);

    expect(await screen.findByText('最近订单')).toBeInTheDocument();
    expect(screen.getByText('普通会员（月卡）')).toBeInTheDocument();
    expect(screen.getByText('已确认')).toBeInTheDocument();
  });

  it('can reopen a pending order from recent orders', async () => {
    const { default: SubscriptionTab } = await import('./SubscriptionTab.jsx');
    usersAPI.getPointsSummary.mockResolvedValueOnce({
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      todayCheckedIn: false,
      checkinStreak: 0,
      membership: null,
      entitlements: [],
      earningRules: [],
      redemptionRules: [],
    });
    paymentsAPI.orders.mockResolvedValueOnce([
      {
        id: 'order-pending',
        productLabel: '写作批改包',
        amountCents: 2900,
        status: 'pending',
        createdAt: Date.UTC(2026, 5, 22),
        expiresAt: Date.UTC(2026, 5, 23),
        qrUrl: '',
      },
    ]);

    render(<SubscriptionTab isMobile={false} user={{ id: 'student-1' }} onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: '继续支付' }));

    expect(await screen.findByText(/会员开通暂未开放自动支付/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '关闭订单' })).toBeInTheDocument();
  });
});
