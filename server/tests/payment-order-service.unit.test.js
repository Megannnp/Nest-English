import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import {
  BOOSTER_EXPIRES_MS,
  PAYMENT_ORDER_EXPIRES_MS,
  isPaymentOrderExpired,
  markManualPaymentOrderFailedByAdmin,
  markManualPaymentOrderRefundedByAdmin,
  normalizeAdminOrderSummary,
  resolveMembershipActivation,
} from '../services/paymentOrderService.js';

test('same-tier active renewal extends expiry without granting another current-period quota', () => {
  const now = Date.UTC(2026, 5, 22, 8);
  const currentPeriodEnd = Date.UTC(2026, 6, 1);
  const existingExpiresAt = Date.UTC(2026, 6, 22);

  const activation = resolveMembershipActivation({
    existing: {
      status: 'active',
      tier: 'standard',
      started_at: Date.UTC(2026, 4, 22),
      expires_at: existingExpiresAt,
      current_period_start: Date.UTC(2026, 5, 1),
      current_period_end: currentPeriodEnd,
    },
    product: { tier: 'standard', cycleMonths: 1 },
    now,
  });

  assert.equal(activation.periodEnd, currentPeriodEnd);
  assert.equal(activation.shouldGrantCurrentPeriodQuotas, false);
  assert.ok(activation.expiresAt > existingExpiresAt);
});

test('tier change starts a fresh current period and grants the new tier quota', () => {
  const now = Date.UTC(2026, 5, 22, 8);

  const activation = resolveMembershipActivation({
    existing: {
      status: 'active',
      tier: 'standard',
      started_at: Date.UTC(2026, 4, 22),
      expires_at: Date.UTC(2026, 6, 22),
      current_period_start: Date.UTC(2026, 5, 1),
      current_period_end: Date.UTC(2026, 6, 1),
    },
    product: { tier: 'premium', cycleMonths: 1 },
    now,
  });

  assert.equal(activation.periodStart, now);
  assert.equal(activation.shouldGrantCurrentPeriodQuotas, true);
});

test('membership month math clamps end-of-month activations to target month end', () => {
  const now = Date.UTC(2026, 0, 31, 8);

  const activation = resolveMembershipActivation({
    existing: null,
    product: { tier: 'standard', cycleMonths: 1 },
    now,
  });

  assert.equal(activation.expiresAt, Date.UTC(2026, 1, 28, 8));
  assert.equal(activation.periodEnd, Date.UTC(2026, 1, 28, 8));
});

test('membership month math preserves leap-day target month end', () => {
  const now = Date.UTC(2028, 0, 31, 8);

  const activation = resolveMembershipActivation({
    existing: null,
    product: { tier: 'standard', cycleMonths: 1 },
    now,
  });

  assert.equal(activation.expiresAt, Date.UTC(2028, 1, 29, 8));
  assert.equal(activation.periodEnd, Date.UTC(2028, 1, 29, 8));
});

test('payment and booster expiry policies are explicit', () => {
  assert.equal(PAYMENT_ORDER_EXPIRES_MS, 24 * 60 * 60 * 1000);
  assert.equal(BOOSTER_EXPIRES_MS, 90 * 24 * 60 * 60 * 1000);
});

test('payment order expiry closes exactly at the 24 hour boundary', () => {
  const createdAt = Date.UTC(2026, 5, 22, 8);

  assert.equal(isPaymentOrderExpired({ created_at: createdAt }, createdAt + PAYMENT_ORDER_EXPIRES_MS - 1), false);
  assert.equal(isPaymentOrderExpired({ created_at: createdAt }, createdAt + PAYMENT_ORDER_EXPIRES_MS), true);
});

test('admin order summary normalizes counts and amounts by status', () => {
  const summary = normalizeAdminOrderSummary([
    { status: 'pending', count: '2', amount_cents: '11800' },
    { status: 'paid', count: 1, amount_cents: 5900 },
  ]);

  assert.equal(summary.totalCount, 3);
  assert.equal(summary.totalAmountCents, 17700);
  assert.deepEqual(summary.byStatus.pending, { count: 2, amountCents: 11800 });
  assert.deepEqual(summary.byStatus.paid, { count: 1, amountCents: 5900 });
});

test('admin can mark a paid manual order as refunded', async (t) => {
  const calls = [];
  const order = {
    id: 'order-1',
    user_id: 'user-1',
    product_code: 'standard_month',
    product_type: 'membership',
    product_label: '普通会员（月卡）',
    amount_cents: 5900,
    currency: 'CNY',
    payment_method: 'manual_qr',
    status: 'paid',
    created_at: Date.UTC(2026, 5, 22, 8),
    paid_at: Date.UTC(2026, 5, 22, 9),
    updated_at: Date.UTC(2026, 5, 22, 9),
  };
  const connection = {
    beginTransaction: async () => calls.push(['begin']),
    commit: async () => calls.push(['commit']),
    rollback: async () => calls.push(['rollback']),
    release: () => calls.push(['release']),
    query: async (sql, params = []) => {
      calls.push([sql, params]);
      if (sql.includes('FOR UPDATE')) return [[order]];
      if (sql.startsWith('UPDATE payment_orders')) {
        order.status = 'refunded';
        order.updated_at = params[0];
        return [{ affectedRows: 1 }];
      }
      return [[order]];
    },
  };
  t.mock.method(db.pool, 'getConnection', async () => connection);

  const refunded = await markManualPaymentOrderRefundedByAdmin({ orderId: 'order-1' });

  assert.equal(refunded.status, 'refunded');
  assert.equal(calls.some(([sql]) => String(sql).startsWith('UPDATE payment_orders')), true);
  assert.deepEqual(calls.filter(([name]) => name === 'commit'), [['commit']]);
});

test('admin cannot mark a non-paid manual order as refunded', async (t) => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push(['begin']),
    commit: async () => calls.push(['commit']),
    rollback: async () => calls.push(['rollback']),
    release: () => calls.push(['release']),
    query: async () => [[{ id: 'order-1', status: 'pending' }]],
  };
  t.mock.method(db.pool, 'getConnection', async () => connection);

  await assert.rejects(
    markManualPaymentOrderRefundedByAdmin({ orderId: 'order-1' }),
    /仅已支付订单可标记退款/
  );
  assert.deepEqual(calls.filter(([name]) => name === 'rollback'), [['rollback']]);
  assert.deepEqual(calls.filter(([name]) => name === 'commit'), []);
});

test('admin can mark a pending manual order as failed', async (t) => {
  const order = {
    id: 'order-1',
    user_id: 'user-1',
    product_code: 'standard_month',
    product_type: 'membership',
    product_label: '普通会员（月卡）',
    amount_cents: 5900,
    payment_method: 'manual_qr',
    status: 'pending',
    created_at: Date.UTC(2026, 5, 22, 8),
    updated_at: Date.UTC(2026, 5, 22, 8),
  };
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params = []) => {
      if (sql.includes('FOR UPDATE')) return [[order]];
      if (sql.startsWith('UPDATE payment_orders')) {
        order.status = 'failed';
        order.updated_at = params[0];
        return [{ affectedRows: 1 }];
      }
      return [[order]];
    },
  };
  t.mock.method(db.pool, 'getConnection', async () => connection);

  const failed = await markManualPaymentOrderFailedByAdmin({ orderId: 'order-1' });

  assert.equal(failed.status, 'failed');
});

test('admin cannot mark a non-pending manual order as failed', async (t) => {
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async () => [[{ id: 'order-1', status: 'paid' }]],
  };
  t.mock.method(db.pool, 'getConnection', async () => connection);

  await assert.rejects(
    markManualPaymentOrderFailedByAdmin({ orderId: 'order-1' }),
    /仅待确认订单可标记异常/
  );
});
