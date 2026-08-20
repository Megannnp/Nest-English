import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const calls = {
  ledgerMetadata: null,
  bucketExpiresAt: undefined,
};

const dbMock = {
  prepare(sql) {
    return {
      get(...params) {
        if (sql.includes('SELECT * FROM entitlement_ledger')) return null;
        if (sql.includes('SELECT * FROM entitlement_accounts')) {
          return { user_id: params[0], unit: params[1], balance: 0, total_added: 0, total_used: 0 };
        }
        return null;
      },
      all() {
        return [];
      },
      run(...params) {
        if (sql.includes('INSERT INTO entitlement_ledger')) {
          calls.ledgerMetadata = JSON.parse(params[8]);
        }
        if (sql.includes('INSERT INTO entitlement_buckets')) {
          calls.bucketExpiresAt = params[8];
        }
        return { changes: 1 };
      },
    };
  },
};

mock.module('../db/database.js', { defaultExport: dbMock });

const {
  addMonths,
  buildRefundEntitlementSourceId,
  endOfCurrentBusinessMonth,
  LEARNING_POINT_RULES,
  LEARNING_DAILY_LIMITS,
  POINT_EARNING_RULES,
  redeemPoints,
  refundEntitlement,
  toBusinessMonthKey,
  toDateKey,
} = await import('../services/pointsService.js');

test('toDateKey uses the China business day instead of UTC day', () => {
  assert.equal(toDateKey(Date.parse('2026-06-21T15:59:59.000Z')), '2026-06-21');
  assert.equal(toDateKey(Date.parse('2026-06-21T16:00:00.000Z')), '2026-06-22');
});

test('free monthly entitlement helpers use the China business month', () => {
  assert.equal(toBusinessMonthKey(Date.parse('2026-05-31T15:59:59.000Z')), '2026-05');
  assert.equal(toBusinessMonthKey(Date.parse('2026-05-31T16:00:00.000Z')), '2026-06');
  assert.equal(
    endOfCurrentBusinessMonth(Date.parse('2026-05-31T16:00:00.000Z')),
    Date.parse('2026-06-30T16:00:00.000Z')
  );
});

test('membership entitlement renewal month math clamps target month end', () => {
  assert.equal(addMonths(Date.UTC(2026, 0, 31, 8), 1), Date.UTC(2026, 1, 28, 8));
  assert.equal(addMonths(Date.UTC(2028, 0, 31, 8), 1), Date.UTC(2028, 1, 29, 8));
});

test('refundEntitlement preserves consumed expiring bucket expiry', async () => {
  calls.ledgerMetadata = null;
  calls.bucketExpiresAt = undefined;
  const expiresAt = Date.UTC(2026, 6, 1);

  await refundEntitlement({
    userId: 'student-1',
    unit: 'writing_review',
    amount: 1,
    sourceType: 'writing_review_quick_feedback',
    sourceId: 'writing_review_quick_feedback:w-1',
    consumedBuckets: [{ id: 'bucket-1', amount: 1, expiresAt }],
    metadata: { failedFeature: 'quick_feedback' },
  });

  assert.equal(calls.bucketExpiresAt, expiresAt);
  assert.equal(calls.ledgerMetadata.expiresAt, expiresAt);
  assert.equal(calls.ledgerMetadata.refundedSourceType, 'writing_review_quick_feedback');
  assert.equal(calls.ledgerMetadata.failedFeature, 'quick_feedback');
});

test('refund entitlement source id stays within ledger database limit', () => {
  const params = {
    unit: 'writing_review',
    sourceType: 'writing_review_quick_feedback_stream',
    sourceId: `${'writing-id-'.repeat(8)}:${'request-id-'.repeat(8)}`,
  };

  const sourceId = buildRefundEntitlementSourceId(params);

  assert.equal(sourceId.length <= 128, true);
  assert.equal(sourceId, buildRefundEntitlementSourceId(params));
  assert.match(sourceId, /^refund:writing_review_quick_feedback_stream:writing_review:/);
});

test('redeemPoints blocks reserved AI minute rewards before spending points', async () => {
  await assert.rejects(
    () => redeemPoints({ userId: 'student-1', rewardCode: 'ai_speaking_30m' }),
    /上线后开放兑换/
  );
});

test('phonetics learning can earn points and appears in earning rules', () => {
  assert.equal(LEARNING_POINT_RULES.phonetics, 5);
  assert.ok(POINT_EARNING_RULES.some((rule) => rule.code === 'learning_phonetics' && rule.module === 'phonetics'));
});

test('speaking learning can earn points after speaking launch', () => {
  assert.equal(LEARNING_POINT_RULES.speaking, 5);
  const rule = POINT_EARNING_RULES.find((item) => item.code === 'learning_speaking');
  assert.equal(rule?.module, 'speaking');
  assert.equal(rule?.status, undefined);
});

test('vocabulary learning uses the normalized module name in rules', () => {
  assert.equal(LEARNING_POINT_RULES.vocabulary, 3);
  assert.equal(LEARNING_DAILY_LIMITS.vocabulary, 1);
  const rule = POINT_EARNING_RULES.find((item) => item.code === 'learning_vocab');
  assert.equal(rule?.module, 'vocabulary');
});

test('learning point rewards are capped to once per module per day', () => {
  for (const [moduleName, limit] of Object.entries(LEARNING_DAILY_LIMITS)) {
    assert.equal(limit, 1, `${moduleName} should only award once per business day`);
  }
});
