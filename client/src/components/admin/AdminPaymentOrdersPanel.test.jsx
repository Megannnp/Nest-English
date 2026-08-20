import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminApi = vi.hoisted(() => ({
  closeAdminPaymentOrder: vi.fn(),
  confirmAdminPaymentOrder: vi.fn(),
  failAdminPaymentOrder: vi.fn(),
  fetchAdminPaymentOrders: vi.fn(),
  refundAdminPaymentOrder: vi.fn(),
}));

vi.mock('../../api/admin.js', () => adminApi);

describe('AdminPaymentOrdersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.fetchAdminPaymentOrders.mockResolvedValue({
      list: [
        {
          id: 'order-1',
          userRealName: '张三',
          userEmail: 'student@example.com',
          productLabel: '普通会员（月卡）',
          productCode: 'standard_month',
          amountCents: 5900,
          paymentMethod: 'manual_qr',
          status: 'pending',
          createdAt: Date.UTC(2026, 5, 22, 8),
          expiresAt: Date.UTC(2026, 5, 23, 8),
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      summary: {
        totalCount: 3,
        totalAmountCents: 17700,
        byStatus: {
          pending: { count: 1, amountCents: 5900 },
          paid: { count: 2, amountCents: 11800 },
        },
      },
    });
    adminApi.confirmAdminPaymentOrder.mockResolvedValue({ id: 'order-1', status: 'paid' });
    adminApi.closeAdminPaymentOrder.mockResolvedValue({ id: 'order-1', status: 'closed' });
    adminApi.failAdminPaymentOrder.mockResolvedValue({ id: 'order-1', status: 'failed' });
    adminApi.refundAdminPaymentOrder.mockResolvedValue({ id: 'order-1', status: 'refunded' });
  });

  it('loads pending payment orders by default', async () => {
    const { default: AdminPaymentOrdersPanel } = await import('./AdminPaymentOrdersPanel.jsx');

    render(<AdminPaymentOrdersPanel />);

    expect(await screen.findByText('order-1')).toBeInTheDocument();
    expect(screen.getByText('普通会员（月卡）')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getAllByText('¥59').length).toBeGreaterThan(0);
    expect(screen.getByText('待确认金额')).toBeInTheDocument();
    expect(screen.getByText('已支付金额')).toBeInTheDocument();
    expect(screen.getByText('2 单已发放')).toBeInTheDocument();
    expect(adminApi.fetchAdminPaymentOrders).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: 'pending',
      keyword: '',
    });
  });

  it('confirms a pending order after admin confirmation', async () => {
    const { default: AdminPaymentOrdersPanel } = await import('./AdminPaymentOrdersPanel.jsx');

    render(<AdminPaymentOrdersPanel />);
    fireEvent.click(await screen.findByRole('button', { name: '确认到账' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => expect(adminApi.confirmAdminPaymentOrder).toHaveBeenCalledWith('order-1'));
    expect(await screen.findByText('订单已确认，会员或加油包权益已发放。')).toBeInTheDocument();
    expect(adminApi.fetchAdminPaymentOrders).toHaveBeenCalledTimes(2);
  });

  it('explains when confirming an expired order closes it without granting entitlements', async () => {
    adminApi.confirmAdminPaymentOrder.mockResolvedValueOnce({ id: 'order-1', status: 'closed' });
    const { default: AdminPaymentOrdersPanel } = await import('./AdminPaymentOrdersPanel.jsx');

    render(<AdminPaymentOrdersPanel />);
    fireEvent.click(await screen.findByRole('button', { name: '确认到账' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => expect(adminApi.confirmAdminPaymentOrder).toHaveBeenCalledWith('order-1'));
    expect(await screen.findByText('订单已过期并自动关闭，未发放权益。')).toBeInTheDocument();
  });

  it('closes a pending order after admin confirmation', async () => {
    const { default: AdminPaymentOrdersPanel } = await import('./AdminPaymentOrdersPanel.jsx');

    render(<AdminPaymentOrdersPanel />);
    fireEvent.click(await screen.findByRole('button', { name: '关闭' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => expect(adminApi.closeAdminPaymentOrder).toHaveBeenCalledWith('order-1'));
    expect(await screen.findByText('订单已关闭，用户需要重新下单。')).toBeInTheDocument();
    expect(adminApi.fetchAdminPaymentOrders).toHaveBeenCalledTimes(2);
  });

  it('marks a pending order as failed after admin confirmation', async () => {
    const { default: AdminPaymentOrdersPanel } = await import('./AdminPaymentOrdersPanel.jsx');

    render(<AdminPaymentOrdersPanel />);
    fireEvent.click(await screen.findByRole('button', { name: '标记异常' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => expect(adminApi.failAdminPaymentOrder).toHaveBeenCalledWith('order-1'));
    expect(await screen.findByText('订单已标记异常，未发放权益。')).toBeInTheDocument();
    expect(adminApi.fetchAdminPaymentOrders).toHaveBeenCalledTimes(2);
  });

  it('marks a paid order as refunded after admin confirmation', async () => {
    adminApi.fetchAdminPaymentOrders.mockResolvedValueOnce({
      list: [
        {
          id: 'order-paid',
          userRealName: '李四',
          productLabel: '写作批改包',
          productCode: 'booster_writing_review_15',
          amountCents: 2900,
          paymentMethod: 'manual_qr',
          status: 'paid',
          createdAt: Date.UTC(2026, 5, 22, 8),
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      summary: { byStatus: { paid: { count: 1, amountCents: 2900 } } },
    });
    const { default: AdminPaymentOrdersPanel } = await import('./AdminPaymentOrdersPanel.jsx');

    render(<AdminPaymentOrdersPanel />);
    fireEvent.click(await screen.findByRole('button', { name: '标记退款' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => expect(adminApi.refundAdminPaymentOrder).toHaveBeenCalledWith('order-paid'));
    expect(await screen.findByText('订单已标记退款，请确认线下退款和权益处理已完成。')).toBeInTheDocument();
  });
});
