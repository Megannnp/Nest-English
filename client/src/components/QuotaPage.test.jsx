import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import QuotaPage from './QuotaPage.jsx';

const { getPointsSummaryMock, getEntitlementLedgerMock } = vi.hoisted(() => ({
  getPointsSummaryMock: vi.fn(),
  getEntitlementLedgerMock: vi.fn(),
}));

vi.mock('../api/index.js', () => ({
  usersAPI: {
    getPointsSummary: getPointsSummaryMock,
    getEntitlementLedger: getEntitlementLedgerMock,
  },
}));

describe('QuotaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPointsSummaryMock.mockResolvedValue({
      entitlements: [
        { unit: 'reading_analysis', balance: 2, totalAdded: 4 },
      ],
      quotaUsages: [],
      membership: null,
    });
    getEntitlementLedgerMock.mockResolvedValue([
      {
        id: 'ledger-1',
        reason: 'points_redemption',
        sourceType: 'points_redemption',
        deltaAmount: 2,
        balanceAfter: 4,
        createdAt: 1782800000000,
      },
      {
        id: 'ledger-2',
        reason: 'feature_usage',
        sourceType: 'reading_analyze',
        deltaAmount: -1,
        balanceAfter: 3,
        createdAt: 1782713600000,
      },
    ]);
  });

  it('opens entitlement ledger in a modal when a quota row is clicked', async () => {
    render(<QuotaPage user={{ id: 'student-1' }} onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /阅读分析/ }));

    await waitFor(() => {
      expect(getEntitlementLedgerMock).toHaveBeenCalledWith('reading_analysis');
    });
    expect(screen.getByRole('dialog')).toHaveTextContent('阅读分析记录');
    expect(screen.getByRole('dialog')).toHaveTextContent('积分兑换');
    expect(screen.getByRole('dialog')).toHaveTextContent('+2');
    expect(screen.getByRole('dialog')).toHaveTextContent('学习消耗');
    expect(screen.getByRole('dialog')).toHaveTextContent('-1');
  }, 10000);
});
