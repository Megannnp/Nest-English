import { createHash } from 'node:crypto';

import db from '../db/database.js';
import { ConflictError, ValidationError } from '../utils/appError.js';
import { normalizeLearningModule } from '../utils/learningModules.js';
import { logError } from '../utils/logger.js';
import { nanoid } from '../utils/nanoid.js';

export const LEARNING_POINT_RULES = {
  writing: 10,
  reading: 5,
  listening: 5,
  phonetics: 5,
  speaking: 5,
  vocabulary: 3,
  grammar: 3,
};

export const LEARNING_DAILY_LIMITS = {
  writing: 1,
  reading: 1,
  listening: 1,
  phonetics: 1,
  speaking: 1,
  vocabulary: 1,
  grammar: 1,
};

export const FIRST_COMPLETION_BONUS = 20;

export const FREE_MONTHLY_ENTITLEMENTS = {
  writing_review: 2,
  sentence_analysis: 5,
  reading_analysis: 2,
  paper_generation: 1,
};

export const POINT_EARNING_RULES = [
  { code: 'daily_checkin', action: '每日签到', points: 5 },
  { code: 'checkin_streak_7', action: '连续签到7天', points: 20 },
  { code: 'checkin_streak_30', action: '连续签到30天', points: 100 },
  { code: 'learning_writing', action: '每日完成写作训练', points: 10, module: 'writing', dailyLimit: 1 },
  { code: 'learning_reading', action: '每日完成阅读训练', points: 5, module: 'reading', dailyLimit: 1 },
  { code: 'learning_listening', action: '每日完成听力训练', points: 5, module: 'listening', dailyLimit: 1 },
  { code: 'learning_phonetics', action: '每日完成语音训练', points: 5, module: 'phonetics', dailyLimit: 1 },
  { code: 'learning_speaking', action: '每日完成口语训练', points: 5, module: 'speaking', dailyLimit: 1 },
  { code: 'learning_vocab', action: '每日完成词汇学习', points: 3, module: 'vocabulary', dailyLimit: 1 },
  { code: 'learning_grammar', action: '每日完成语法学习', points: 3, module: 'grammar', dailyLimit: 1 },
  { code: 'profile_completion', action: '完善个人资料', points: 20 },
  { code: 'first_completion', action: '首次完成写作/阅读/听力/口语/语音/词汇/语法', points: 20 },
  { code: 'referral_registration', action: '邀请好友注册', points: 50, status: 'reserved', note: '邀请系统上线后启用' },
  { code: 'referral_standard_member', action: '好友开通普通会员', points: 200, status: 'reserved', note: '邀请系统上线后启用' },
  { code: 'referral_premium_member', action: '好友开通大会员', points: 500, status: 'reserved', note: '邀请系统上线后启用' },
];

export const POINT_REDEMPTION_RULES = [
  { code: 'writing_review_1', reward: '写作批改1次', points: 100, quantity: 1, unit: 'writing_review' },
  { code: 'sentence_analysis_5', reward: '句子分析5次', points: 50, quantity: 5, unit: 'sentence_analysis' },
  { code: 'reading_analysis_1', reward: '阅读分析1次', points: 80, quantity: 1, unit: 'reading_analysis' },
  { code: 'paper_generation_1', reward: '题卷生成1次', points: 80, quantity: 1, unit: 'paper_generation' },
  { code: 'sentence_reading_10', reward: '句子朗读10次', points: 20, quantity: 10, unit: 'sentence_reading' },
  { code: 'ai_speaking_30m', reward: 'AI口语30分钟', points: 150, quantity: 30, unit: 'ai_speaking_minutes' },
  { code: 'ai_listening_30m', reward: 'AI听力30分钟', points: 150, quantity: 30, unit: 'ai_listening_minutes' },
];

const LEARNING_REASON_CODES = {
  vocabulary: 'learning_vocab',
};
const FIRST_COMPLETION_MODULES = new Set(['writing', 'reading', 'listening', 'speaking', 'phonetics', 'vocabulary', 'grammar']);
const RESERVED_REDEMPTION_CODES = new Set(['ai_speaking_30m', 'ai_listening_30m']);
const ENTITLEMENT_UNITS = new Set(POINT_REDEMPTION_RULES.map((rule) => rule.unit));
const BUSINESS_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000;
const POINT_REASON_LABELS = new Map(POINT_EARNING_RULES.map((rule) => [rule.code, rule.action]));

export function toDateKey(timestamp = Date.now()) {
  return new Date(Number(timestamp) + BUSINESS_TIMEZONE_OFFSET_MS).toISOString().slice(0, 10);
}

function getBusinessDayRange(dateKey) {
  const dayStart = Date.parse(`${dateKey}T00:00:00.000+08:00`);
  return { dayStart, dayEnd: dayStart + 24 * 60 * 60 * 1000 };
}

function previousDateKey(dateKey) {
  const { dayStart } = getBusinessDayRange(dateKey);
  return toDateKey(dayStart - 24 * 60 * 60 * 1000);
}

export function toBusinessMonthKey(timestamp = Date.now()) {
  return new Date(Number(timestamp) + BUSINESS_TIMEZONE_OFFSET_MS).toISOString().slice(0, 7);
}

export function endOfCurrentBusinessMonth(timestamp = Date.now()) {
  const businessDate = new Date(Number(timestamp) + BUSINESS_TIMEZONE_OFFSET_MS);
  return Date.UTC(businessDate.getUTCFullYear(), businessDate.getUTCMonth() + 1, 1) - BUSINESS_TIMEZONE_OFFSET_MS;
}

export function addMonths(timestamp, months) {
  const date = new Date(timestamp);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDayOfTargetMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
  date.setDate(Math.min(day, lastDayOfTargetMonth));
  return date.getTime();
}

function parseJson(raw, fallback = null) {
  try {
    if (raw && typeof raw === 'object') return raw;
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeLedgerRow(row) {
  return {
    id: row.id,
    deltaPoints: Number(row.delta_points || 0),
    balanceAfter: Number(row.balance_after || 0),
    reason: row.reason,
    sourceType: row.source_type,
    sourceId: row.source_id,
    metadata: parseJson(row.metadata, {}),
    createdAt: Number(row.created_at || 0),
  };
}

function normalizePendingRewardRow(row) {
  return {
    id: row.id,
    points: Number(row.points || 0),
    reason: row.reason,
    sourceType: row.source_type,
    sourceId: row.source_id,
    label: row.label || POINT_REASON_LABELS.get(row.reason) || '学习奖励',
    metadata: parseJson(row.metadata, {}),
    status: row.status,
    ledgerId: row.ledger_id || null,
    createdAt: Number(row.created_at || 0),
    claimedAt: row.claimed_at == null ? null : Number(row.claimed_at || 0),
  };
}

async function withConnection(callback) {
  if (!db.pool?.getConnection) {
    return callback(null);
  }
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function queryOne(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.query(sql, params);
    return rows[0] || null;
  }
  return db.prepare(sql).get(...params);
}

async function queryAll(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.query(sql, params);
    return rows;
  }
  return db.prepare(sql).all(...params);
}

async function runSql(connection, sql, params = []) {
  if (connection) {
    const [result] = await connection.query(sql, params);
    return { changes: result.affectedRows ?? 0 };
  }
  return db.prepare(sql).run(...params);
}

async function ensureAccount(connection, userId) {
  await runSql(
    connection,
    `INSERT IGNORE INTO point_accounts (user_id, balance, total_earned, total_spent, updated_at)
     VALUES (?, 0, 0, 0, ?)`,
    [userId, Date.now()]
  );
}

async function getLockedAccount(connection, userId) {
  await ensureAccount(connection, userId);
  const suffix = connection ? ' FOR UPDATE' : '';
  return queryOne(connection, `SELECT * FROM point_accounts WHERE user_id = ?${suffix}`, [userId]);
}

async function getExistingLedger(connection, userId, sourceType, sourceId) {
  return queryOne(
    connection,
    'SELECT * FROM point_ledger WHERE user_id = ? AND source_type = ? AND source_id = ? LIMIT 1',
    [userId, sourceType, sourceId]
  );
}

async function getExistingPendingReward(connection, userId, sourceType, sourceId) {
  return queryOne(
    connection,
    'SELECT * FROM pending_point_rewards WHERE user_id = ? AND source_type = ? AND source_id = ? LIMIT 1',
    [userId, sourceType, sourceId]
  );
}

async function getExistingPointEvent(connection, userId, sourceType, sourceId) {
  const ledger = await getExistingLedger(connection, userId, sourceType, sourceId);
  if (ledger) return ledger;
  return getExistingPendingReward(connection, userId, sourceType, sourceId);
}

function validatePointAwardParams({ userId, amount, reason, sourceType, sourceId }) {
  if (!userId || !Number.isFinite(amount) || amount === 0 || !reason || !sourceType || !sourceId) {
    throw new ValidationError('积分流水参数不完整');
  }
}

function resolvePointBalance(account, amount, allowNegative) {
  const currentBalance = Number(account?.balance || 0);
  const nextBalance = currentBalance + amount;
  if (!allowNegative && nextBalance < 0) {
    throw new ConflictError('积分余额不足');
  }
  return nextBalance;
}

async function updatePointAccount(connection, { userId, amount, nextBalance, now }) {
  await runSql(
    connection,
    `UPDATE point_accounts
     SET balance = ?, total_earned = total_earned + ?, total_spent = total_spent + ?, updated_at = ?
     WHERE user_id = ?`,
    [nextBalance, amount > 0 ? amount : 0, amount < 0 ? Math.abs(amount) : 0, now, userId]
  );
}

async function insertPointLedger(connection, {
  ledgerId,
  userId,
  amount,
  nextBalance,
  reason,
  sourceType,
  sourceId,
  metadata,
  now,
}) {
  await runSql(
    connection,
    `INSERT INTO point_ledger
      (id, user_id, delta_points, balance_after, reason, source_type, source_id, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ledgerId,
      userId,
      amount,
      nextBalance,
      reason,
      sourceType,
      sourceId,
      metadata ? JSON.stringify(metadata) : null,
      now,
    ]
  );
}

function buildAwardedLedger({ ledgerId, amount, nextBalance, reason, sourceType, sourceId, metadata, now }) {
  return {
    id: ledgerId,
    deltaPoints: amount,
    balanceAfter: nextBalance,
    reason,
    sourceType,
    sourceId,
    metadata: metadata || {},
    createdAt: now,
  };
}

async function awardUserPointsInConnection(connection, {
  userId,
  points,
  reason,
  sourceType,
  sourceId,
  metadata = null,
  allowNegative = false,
}) {
  const amount = Number(points);
  validatePointAwardParams({ userId, amount, reason, sourceType, sourceId });

  const existing = await getExistingLedger(connection, userId, sourceType, sourceId);
  if (existing) {
    return { awarded: false, ledger: normalizeLedgerRow(existing) };
  }

  const account = await getLockedAccount(connection, userId);
  const nextBalance = resolvePointBalance(account, amount, allowNegative);
  const ledgerId = nanoid();
  const now = Date.now();
  await updatePointAccount(connection, { userId, amount, nextBalance, now });
  await insertPointLedger(connection, { ledgerId, userId, amount, nextBalance, reason, sourceType, sourceId, metadata, now });

  return {
    awarded: true,
    ledger: buildAwardedLedger({ ledgerId, amount, nextBalance, reason, sourceType, sourceId, metadata, now }),
  };
}

export async function awardUserPoints(params) {
  return withConnection((connection) => awardUserPointsInConnection(connection, params));
}

async function createPendingPointReward({
  userId,
  points,
  reason,
  sourceType,
  sourceId,
  label = '',
  metadata = null,
}) {
  const amount = Number(points);
  validatePointAwardParams({ userId, amount, reason, sourceType, sourceId });
  if (amount <= 0) throw new ValidationError('待领取积分必须大于 0');

  const existingLedger = await getExistingLedger(null, userId, sourceType, sourceId);
  if (existingLedger) {
    return { pending: false, claimed: true, reward: null, ledger: normalizeLedgerRow(existingLedger) };
  }

  const existingReward = await getExistingPendingReward(null, userId, sourceType, sourceId);
  if (existingReward) {
    return { pending: existingReward.status === 'pending', claimed: existingReward.status === 'claimed', reward: normalizePendingRewardRow(existingReward) };
  }

  const rewardId = nanoid();
  const now = Date.now();
  await runSql(
    null,
    `INSERT INTO pending_point_rewards
      (id, user_id, points, reason, source_type, source_id, label, metadata, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      rewardId,
      userId,
      amount,
      reason,
      sourceType,
      sourceId,
      label || POINT_REASON_LABELS.get(reason) || '学习奖励',
      metadata ? JSON.stringify(metadata) : null,
      now,
    ]
  );

  return {
    pending: true,
    claimed: false,
    reward: {
      id: rewardId,
      points: amount,
      reason,
      sourceType,
      sourceId,
      label: label || POINT_REASON_LABELS.get(reason) || '学习奖励',
      metadata: metadata || {},
      status: 'pending',
      ledgerId: null,
      createdAt: now,
      claimedAt: null,
    },
  };
}

async function ensureEntitlementAccount(connection, userId, unit) {
  await runSql(
    connection,
    `INSERT IGNORE INTO entitlement_accounts (user_id, unit, balance, total_added, total_used, updated_at)
     VALUES (?, ?, 0, 0, 0, ?)`,
    [userId, unit, Date.now()]
  );
}

async function getActiveMembership(connection, userId, { lock = false } = {}) {
  const suffix = connection && lock ? ' FOR UPDATE' : '';
  const row = await queryOne(
    connection,
    `SELECT * FROM membership_accounts
     WHERE user_id = ? AND status = ? AND expires_at > ?
     LIMIT 1${suffix}`,
    [userId, 'active', Date.now()]
  );
  if (!row) return null;
  return {
    userId: row.user_id,
    tier: row.tier,
    planCode: row.plan_code,
    cycleMonths: Number(row.cycle_months || 1),
    status: row.status,
    startedAt: Number(row.started_at || 0),
    expiresAt: Number(row.expires_at || 0),
    currentPeriodStart: Number(row.current_period_start || 0),
    currentPeriodEnd: Number(row.current_period_end || 0),
    nextResetAt: row.next_reset_at ? Number(row.next_reset_at) : null,
    monthlyQuotas: parseJson(row.monthly_quotas, {}),
    sourceOrderId: row.source_order_id,
    updatedAt: Number(row.updated_at || 0),
  };
}

export async function grantEntitlementInConnection(connection, { userId, unit, amount, reason, sourceType, sourceId, metadata = null }) {
  const normalizedAmount = Number(amount);
  if (!userId || !unit || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new ValidationError('权益发放参数不完整');
  }
  const normalizedMetadata = metadata || {};
  const expiresAt = normalizedMetadata.expiresAt ? Number(normalizedMetadata.expiresAt) : null;
  await ensureEntitlementAccount(connection, userId, unit);
  const existing = await queryOne(
    connection,
    'SELECT * FROM entitlement_ledger WHERE user_id = ? AND unit = ? AND source_type = ? AND source_id = ? LIMIT 1',
    [userId, unit, sourceType, sourceId]
  );
  if (existing) {
    return { granted: false, balanceAfter: Number(existing.balance_after || 0) };
  }

  const suffix = connection ? ' FOR UPDATE' : '';
  const account = await queryOne(
    connection,
    `SELECT * FROM entitlement_accounts WHERE user_id = ? AND unit = ?${suffix}`,
    [userId, unit]
  );
  const nextBalance = Number(account?.balance || 0) + normalizedAmount;
  const now = Date.now();
  const ledgerId = nanoid();

  await runSql(
    connection,
    `UPDATE entitlement_accounts
     SET balance = ?, total_added = total_added + ?, updated_at = ?
     WHERE user_id = ? AND unit = ?`,
    [nextBalance, normalizedAmount, now, userId, unit]
  );
  await runSql(
    connection,
    `INSERT INTO entitlement_ledger
      (id, user_id, unit, delta_amount, balance_after, reason, source_type, source_id, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ledgerId, userId, unit, normalizedAmount, nextBalance, reason, sourceType, sourceId, JSON.stringify(normalizedMetadata), now]
  );
  await runSql(
    connection,
    `INSERT INTO entitlement_buckets
      (id, user_id, unit, balance, original_amount, reason, source_type, source_id, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)`,
    [
      nanoid(),
      userId,
      unit,
      normalizedAmount,
      normalizedAmount,
      reason,
      sourceType,
      sourceId,
      expiresAt,
      now,
      now,
    ]
  );

  return { granted: true, ledgerId, balanceAfter: nextBalance };
}

export async function grantEntitlement(params) {
  return withConnection((connection) => grantEntitlementInConnection(connection, params));
}

export function buildRefundEntitlementSourceId({ sourceType, sourceId, unit }) {
  const sourceHash = createHash('sha1')
    .update(`${sourceType}:${sourceId}:${unit}`)
    .digest('hex')
    .slice(0, 16);
  return `refund:${String(sourceType).slice(0, 48)}:${String(unit).slice(0, 32)}:${sourceHash}`;
}

export async function refundEntitlement({ userId, unit, amount = 1, sourceType, sourceId, metadata = null, consumedBuckets = [] }) {
  const normalizedAmount = Number(amount);
  if (!userId || !unit || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || !sourceType || !sourceId) {
    throw new ValidationError('权益退回参数不完整');
  }
  const sourceBucket = Array.isArray(consumedBuckets) ? consumedBuckets.find((bucket) => bucket?.expiresAt) : null;
  const refundMetadata = {
    refundedSourceType: sourceType,
    refundedSourceId: sourceId,
    ...(sourceBucket?.expiresAt ? { expiresAt: Number(sourceBucket.expiresAt) } : {}),
    ...(metadata || {}),
  };
  return grantEntitlement({
    userId,
    unit,
    amount: normalizedAmount,
    reason: 'feature_usage_refund',
    sourceType: 'feature_usage_refund',
    sourceId: buildRefundEntitlementSourceId({ sourceType, sourceId, unit }),
    metadata: refundMetadata,
  });
}

async function ensureCurrentMembershipPeriodInConnection(connection, membership) {
  if (!membership?.nextResetAt || membership.nextResetAt > Date.now()) return;

  const now = Date.now();
  let periodStart = membership.nextResetAt;
  let periodEnd = Math.min(addMonths(periodStart, 1), membership.expiresAt);
  while (periodEnd <= now && periodEnd < membership.expiresAt) {
    periodStart = periodEnd;
    periodEnd = Math.min(addMonths(periodStart, 1), membership.expiresAt);
  }

  const quotas = membership.monthlyQuotas || {};
  for (const [unit, amount] of Object.entries(quotas)) {
    await grantEntitlementInConnection(connection, {
      userId: membership.userId,
      unit,
      amount,
      reason: 'membership_period',
      sourceType: 'membership_period',
      sourceId: `${membership.sourceOrderId}:${periodStart}:${unit}`,
      metadata: {
        productCode: membership.planCode,
        tier: membership.tier,
        periodStart,
        periodEnd,
        expiresAt: periodEnd,
      },
    });
  }

  await runSql(
    connection,
    `UPDATE membership_accounts
     SET current_period_start = ?, current_period_end = ?, next_reset_at = ?, updated_at = ?
     WHERE user_id = ?`,
    [
      periodStart,
      periodEnd,
      periodEnd < membership.expiresAt ? periodEnd : null,
      now,
      membership.userId,
    ]
  );
}

async function ensurePlanEntitlementsInConnection(connection, userId) {
  await expireEntitlementBucketsInConnection(connection, userId);
  const membership = await getActiveMembership(connection, userId, { lock: true });
  if (membership) {
    await ensureCurrentMembershipPeriodInConnection(connection, membership);
    return;
  }

  const now = Date.now();
  const monthKey = toBusinessMonthKey(now);
  const expiresAt = endOfCurrentBusinessMonth(now);
  for (const [unit, amount] of Object.entries(FREE_MONTHLY_ENTITLEMENTS)) {
    await grantEntitlementInConnection(connection, {
      userId,
      unit,
      amount,
      reason: 'free_plan_monthly',
      sourceType: 'free_plan_monthly',
      sourceId: `${monthKey}:${unit}`,
      metadata: { month: monthKey, plan: 'free', expiresAt },
    });
  }
}

async function expireEntitlementBucketsInConnection(connection, userId) {
  const expiredRows = await queryAll(
    connection,
    `SELECT *
     FROM entitlement_buckets
     WHERE user_id = ? AND balance > 0 AND expires_at IS NOT NULL AND expires_at <= ?
     ORDER BY unit ASC, expires_at ASC, created_at ASC
     FOR UPDATE`,
    [userId, Date.now()]
  );
  if (!expiredRows?.length) return;

  for (const bucket of expiredRows) {
    const expiredAmount = Number(bucket.balance || 0);
    if (expiredAmount <= 0) continue;

    await ensureEntitlementAccount(connection, userId, bucket.unit);
    const account = await queryOne(
      connection,
      'SELECT * FROM entitlement_accounts WHERE user_id = ? AND unit = ? FOR UPDATE',
      [userId, bucket.unit]
    );
    const currentBalance = Number(account?.balance || 0);
    const nextBalance = Math.max(0, currentBalance - expiredAmount);
    const now = Date.now();
    const ledgerId = nanoid();
    const sourceId = `bucket:${bucket.id}`;

    await runSql(
      connection,
      'UPDATE entitlement_buckets SET balance = 0, updated_at = ? WHERE id = ?',
      [now, bucket.id]
    );
    await runSql(
      connection,
      `UPDATE entitlement_accounts
       SET balance = ?, updated_at = ?
       WHERE user_id = ? AND unit = ?`,
      [nextBalance, now, userId, bucket.unit]
    );

    const existingLedger = await queryOne(
      connection,
      'SELECT id FROM entitlement_ledger WHERE user_id = ? AND unit = ? AND source_type = ? AND source_id = ? LIMIT 1',
      [userId, bucket.unit, 'entitlement_expired', sourceId]
    );
    if (existingLedger) continue;

    await runSql(
      connection,
      `INSERT INTO entitlement_ledger
        (id, user_id, unit, delta_amount, balance_after, reason, source_type, source_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ledgerId,
        userId,
        bucket.unit,
        -expiredAmount,
        nextBalance,
        'entitlement_expired',
        'entitlement_expired',
        sourceId,
        JSON.stringify({
          bucketId: bucket.id,
          originalSourceType: bucket.source_type,
          originalSourceId: bucket.source_id,
          expiresAt: Number(bucket.expires_at || 0),
        }),
        now,
      ]
    );
  }
}

async function getConsumableBuckets(connection, userId, unit) {
  return queryAll(
    connection,
    `SELECT *
     FROM entitlement_buckets
     WHERE user_id = ? AND unit = ? AND balance > 0 AND (expires_at IS NULL OR expires_at > ?)
     ORDER BY CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END ASC, expires_at ASC, created_at ASC
     FOR UPDATE`,
    [userId, unit, Date.now()]
  );
}

export async function ensureMonthlyFreeEntitlements(userId) {
  return withConnection((connection) => ensurePlanEntitlementsInConnection(connection, userId));
}

function validateEntitlementConsumptionParams({ userId, unit, amount, reason, sourceType, sourceId }) {
  if (!userId || !unit || !Number.isFinite(amount) || amount <= 0 || !reason || !sourceType || !sourceId) {
    throw new ValidationError('权益扣减参数不完整');
  }
}

async function getExistingEntitlementConsumption(connection, { userId, unit, sourceType, sourceId }) {
  return queryOne(
    connection,
    'SELECT * FROM entitlement_ledger WHERE user_id = ? AND unit = ? AND source_type = ? AND source_id = ? LIMIT 1',
    [userId, unit, sourceType, sourceId]
  );
}

function normalizeExistingEntitlementConsumption(existing) {
  return {
    consumed: false,
    balanceAfter: Number(existing.balance_after || 0),
    ledger: {
      id: existing.id,
      deltaAmount: Number(existing.delta_amount || 0),
      balanceAfter: Number(existing.balance_after || 0),
    },
  };
}

async function getLockedEntitlementAccount(connection, userId, unit) {
  const suffix = connection ? ' FOR UPDATE' : '';
  return queryOne(
    connection,
    `SELECT * FROM entitlement_accounts WHERE user_id = ? AND unit = ?${suffix}`,
    [userId, unit]
  );
}

function assertEntitlementBalance(balance, requiredAmount) {
  if (balance < requiredAmount) {
    throw new ConflictError('权益额度不足，请兑换积分、购买加油包或升级会员');
  }
}

async function consumeEntitlementBuckets(connection, buckets, amount, now) {
  let remaining = amount;
  const consumedBuckets = [];

  for (const bucket of buckets) {
    if (remaining <= 0) break;
    const bucketBalance = Number(bucket.balance || 0);
    const used = Math.min(bucketBalance, remaining);
    if (used <= 0) continue;
    remaining -= used;
    consumedBuckets.push({
      id: bucket.id,
      amount: used,
      sourceType: bucket.source_type,
      sourceId: bucket.source_id,
      expiresAt: bucket.expires_at ? Number(bucket.expires_at) : null,
    });
    await runSql(
      connection,
      'UPDATE entitlement_buckets SET balance = balance - ?, updated_at = ? WHERE id = ?',
      [used, now, bucket.id]
    );
  }

  return consumedBuckets;
}

async function updateEntitlementAccountUsage(connection, { userId, unit, nextBalance, amount, now }) {
  await runSql(
    connection,
    `UPDATE entitlement_accounts
     SET balance = ?, total_used = total_used + ?, updated_at = ?
     WHERE user_id = ? AND unit = ?`,
    [nextBalance, amount, now, userId, unit]
  );
}

async function insertEntitlementConsumptionLedger(connection, {
  ledgerId,
  userId,
  unit,
  amount,
  nextBalance,
  reason,
  sourceType,
  sourceId,
  metadata,
  consumedBuckets,
  now,
}) {
  await runSql(
    connection,
    `INSERT INTO entitlement_ledger
      (id, user_id, unit, delta_amount, balance_after, reason, source_type, source_id, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ledgerId,
      userId,
      unit,
      -amount,
      nextBalance,
      reason,
      sourceType,
      sourceId,
      JSON.stringify({ ...(metadata || {}), consumedBuckets }),
      now,
    ]
  );
}

export async function consumeEntitlementInConnection(connection, {
  userId,
  unit,
  amount = 1,
  reason,
  sourceType,
  sourceId,
  metadata = null,
}) {
  const normalizedAmount = Number(amount);
  validateEntitlementConsumptionParams({ userId, unit, amount: normalizedAmount, reason, sourceType, sourceId });

  await ensurePlanEntitlementsInConnection(connection, userId);
  await ensureEntitlementAccount(connection, userId, unit);

  const existing = await getExistingEntitlementConsumption(connection, { userId, unit, sourceType, sourceId });
  if (existing) {
    return normalizeExistingEntitlementConsumption(existing);
  }

  const account = await getLockedEntitlementAccount(connection, userId, unit);
  const currentBalance = Number(account?.balance || 0);
  assertEntitlementBalance(currentBalance, normalizedAmount);

  const buckets = await getConsumableBuckets(connection, userId, unit);
  const availableBucketBalance = buckets.reduce((sum, bucket) => sum + Number(bucket.balance || 0), 0);
  assertEntitlementBalance(availableBucketBalance, normalizedAmount);

  const nextBalance = currentBalance - normalizedAmount;
  const now = Date.now();
  const ledgerId = nanoid();
  const consumedBuckets = await consumeEntitlementBuckets(connection, buckets, normalizedAmount, now);

  await updateEntitlementAccountUsage(connection, { userId, unit, nextBalance, amount: normalizedAmount, now });
  await insertEntitlementConsumptionLedger(connection, {
    ledgerId,
    userId,
    unit,
    amount: normalizedAmount,
    nextBalance,
    reason,
    sourceType,
    sourceId,
    metadata,
    consumedBuckets,
    now,
  });

  return { consumed: true, ledgerId, balanceAfter: nextBalance, consumedBuckets };
}

export async function consumeEntitlement(params) {
  return withConnection((connection) => consumeEntitlementInConnection(connection, params));
}

async function getEntitlements(userId) {
  const rows = await queryAll(
    null,
    'SELECT * FROM entitlement_accounts WHERE user_id = ? ORDER BY unit ASC',
    [userId]
  );
  return (rows || []).map((row) => ({
    unit: row.unit,
    balance: Number(row.balance || 0),
    totalAdded: Number(row.total_added || 0),
    totalUsed: Number(row.total_used || 0),
    updatedAt: Number(row.updated_at || 0),
  }));
}

export async function getEntitlementLedger(userId, unit, { limit = 50, offset = 0 } = {}) {
  if (!ENTITLEMENT_UNITS.has(unit)) {
    throw new ValidationError('无效的额度类型');
  }
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const rows = await queryAll(
    null,
    `SELECT id, unit, delta_amount, balance_after, reason, source_type, source_id, metadata, created_at
     FROM entitlement_ledger
     WHERE user_id = ? AND unit = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, unit, safeLimit, safeOffset]
  );

  return (rows || []).map((row) => ({
    id: row.id,
    unit: row.unit,
    deltaAmount: Number(row.delta_amount || 0),
    balanceAfter: Number(row.balance_after || 0),
    reason: row.reason,
    sourceType: row.source_type,
    sourceId: row.source_id,
    metadata: parseJson(row.metadata, null),
    createdAt: Number(row.created_at || 0),
  }));
}

async function getMembershipQuotaUsages(userId, membership) {
  if (!membership?.monthlyQuotas) return [];
  const rows = await queryAll(
    null,
    `SELECT unit, SUM(balance) AS balance
     FROM entitlement_buckets
     WHERE user_id = ?
       AND reason = ?
       AND expires_at = ?
       AND balance > 0
     GROUP BY unit`,
    [userId, 'membership_period', membership.currentPeriodEnd]
  );
  const balanceByUnit = new Map((rows || []).map((row) => [row.unit, Number(row.balance || 0)]));
  return Object.entries(membership.monthlyQuotas).map(([unit, quota]) => {
    const normalizedQuota = Number(quota || 0);
    const balance = balanceByUnit.get(unit) || 0;
    return {
      unit,
      quota: normalizedQuota,
      used: Math.max(0, normalizedQuota - balance),
      balance,
      periodStart: membership.currentPeriodStart,
      periodEnd: membership.currentPeriodEnd,
      nextResetAt: membership.nextResetAt,
    };
  });
}

async function getMembership(userId) {
  return getActiveMembership(null, userId);
}

async function countDailyLearningAwards(userId, reasonCode, dateKey = toDateKey()) {
  const { dayStart, dayEnd } = getBusinessDayRange(dateKey);
  const ledgerRow = await queryOne(
    null,
    `SELECT COUNT(*) AS count
     FROM point_ledger
     WHERE user_id = ? AND reason = ? AND delta_points > 0 AND created_at >= ? AND created_at < ?`,
    [userId, reasonCode, dayStart, dayEnd]
  );
  const pendingRow = await queryOne(
    null,
    `SELECT COUNT(*) AS count
     FROM pending_point_rewards
     WHERE user_id = ? AND reason = ? AND status = 'pending' AND created_at >= ? AND created_at < ?`,
    [userId, reasonCode, dayStart, dayEnd]
  );
  return Number(ledgerRow?.count || 0) + Number(pendingRow?.count || 0);
}

export async function getPointsSummary(userId) {
  await ensureAccount(null, userId);
  await ensureMonthlyFreeEntitlements(userId);
  const account = await queryOne(null, 'SELECT * FROM point_accounts WHERE user_id = ?', [userId]);
  const ledgerRows = await queryAll(
    null,
    'SELECT * FROM point_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [userId]
  );
  const redemptionRows = await queryAll(
    null,
    'SELECT * FROM point_redemptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [userId]
  );
  const todayKey = toDateKey();
  const todayCheckin = await getExistingPointEvent(null, userId, 'daily_checkin', todayKey);
  const pendingRows = await queryAll(
    null,
    `SELECT * FROM pending_point_rewards
     WHERE user_id = ? AND status = 'pending'
     ORDER BY created_at DESC`,
    [userId]
  );
  const pendingRewards = (pendingRows || []).map(normalizePendingRewardRow);

  const membership = await getMembership(userId);

  return {
    balance: Number(account?.balance || 0),
    pendingPoints: pendingRewards.reduce((sum, reward) => sum + reward.points, 0),
    pendingRewards,
    totalEarned: Number(account?.total_earned || 0),
    totalSpent: Number(account?.total_spent || 0),
    todayCheckedIn: Boolean(todayCheckin),
    checkinStreak: await getCurrentCheckinStreak(userId),
    earningRules: POINT_EARNING_RULES,
    redemptionRules: POINT_REDEMPTION_RULES,
    membership,
    quotaUsages: await getMembershipQuotaUsages(userId, membership),
    entitlements: await getEntitlements(userId),
    recentLedger: (ledgerRows || []).map(normalizeLedgerRow),
    redemptions: (redemptionRows || []).map((row) => ({
      id: row.id,
      rewardCode: row.reward_code,
      rewardLabel: row.reward_label,
      pointsSpent: Number(row.points_spent || 0),
      quantity: Number(row.quantity || 0),
      unit: row.unit,
      createdAt: Number(row.created_at || 0),
    })),
  };
}

async function getCurrentCheckinStreak(userId, startDateKey = toDateKey()) {
  let cursor = startDateKey;
  let streak = 0;
  for (let i = 0; i < 366; i += 1) {
    const row = await getExistingPointEvent(null, userId, 'daily_checkin', cursor);
    if (!row) break;
    streak += 1;
    cursor = previousDateKey(cursor);
  }
  return streak;
}

export async function checkInToday(userId) {
  const todayKey = toDateKey();
  const base = await createPendingPointReward({
    userId,
    points: 5,
    reason: 'daily_checkin',
    sourceType: 'daily_checkin',
    sourceId: todayKey,
    label: '每日签到奖励',
    metadata: { date: todayKey },
  });

  const streak = await getCurrentCheckinStreak(userId, todayKey);
  const bonuses = [];
  if (streak === 7) {
    bonuses.push(await createPendingPointReward({
      userId,
      points: 20,
      reason: 'checkin_streak_7',
      sourceType: 'checkin_streak',
      sourceId: `7:${todayKey}`,
      label: '连续签到7天奖励',
      metadata: { date: todayKey, streak },
    }));
  }
  if (streak === 30) {
    bonuses.push(await createPendingPointReward({
      userId,
      points: 100,
      reason: 'checkin_streak_30',
      sourceType: 'checkin_streak',
      sourceId: `30:${todayKey}`,
      label: '连续签到30天奖励',
      metadata: { date: todayKey, streak },
    }));
  }

  return { base, bonuses, summary: await getPointsSummary(userId) };
}

export async function awardLearningActivity({ userId, module: mod, eventType = 'complete', sourceId, metadata = null }) {
  const normalizedModule = normalizeLearningModule(mod);
  const ruleModule = normalizedModule;
  const points = LEARNING_POINT_RULES[ruleModule];
  if (!points) {
    throw new ValidationError('不支持的学习模块');
  }

  const source = sourceId || `${normalizedModule}:${eventType}:${nanoid()}`;
  const awards = [];
  const reasonCode = LEARNING_REASON_CODES[ruleModule] || `learning_${ruleModule}`;
  const dailyCount = await countDailyLearningAwards(userId, reasonCode);
  const dailyLimit = LEARNING_DAILY_LIMITS[ruleModule] || 10;
  if (dailyCount >= dailyLimit) {
    return {
      awards: [{ awarded: false, reason: 'daily_limit_reached', dailyLimit }],
      summary: await getPointsSummary(userId),
    };
  }

  awards.push(await createPendingPointReward({
    userId,
    points,
    reason: reasonCode,
    sourceType: 'learning_activity',
    sourceId: source,
    label: POINT_REASON_LABELS.get(reasonCode) || '完成学习奖励',
    metadata: { module: normalizedModule, eventType, ...(metadata || {}) },
  }));

  if (FIRST_COMPLETION_MODULES.has(ruleModule)) {
    awards.push(await createPendingPointReward({
      userId,
      points: FIRST_COMPLETION_BONUS,
      reason: 'first_completion',
      sourceType: 'first_completion',
      sourceId: ruleModule,
      label: '首次完成学习任务奖励',
      metadata: { module: normalizedModule },
    }));
  }

  return { awards, summary: await getPointsSummary(userId) };
}

export async function awardPointsForLearningEvent({ eventId, userId, module: mod, eventType, metadata = null }) {
  try {
    return await awardLearningActivity({
      userId,
      module: mod,
      eventType,
      sourceId: eventId,
      metadata,
    });
  } catch (error) {
    logError('learning_event_points_award_failed', {
      message: error.message,
      eventId,
      userId,
      module: mod,
      eventType,
    });
    return null;
  }
}

export async function awardProfileCompletion(userId, userRow) {
  const hasIdentity = Boolean(userRow?.real_name || userRow?.realName || userRow?.nick_name);
  const hasContact = Boolean(userRow?.email || userRow?.phone);
  if (!hasIdentity || !hasContact) return null;
  return awardUserPoints({
    userId,
    points: 20,
    reason: 'profile_completion',
    sourceType: 'profile_completion',
    sourceId: 'profile',
    metadata: { completedAt: Date.now() },
  });
}

export async function claimPendingPointRewards(userId) {
  let claimed = [];
  await withConnection(async (connection) => {
    const suffix = connection ? ' FOR UPDATE' : '';
    const rows = await queryAll(
      connection,
      `SELECT * FROM pending_point_rewards
       WHERE user_id = ? AND status = 'pending'
       ORDER BY created_at ASC${suffix}`,
      [userId]
    );
    claimed = [];
    for (const row of rows || []) {
      const metadata = parseJson(row.metadata, {});
      const award = await awardUserPointsInConnection(connection, {
        userId,
        points: Number(row.points || 0),
        reason: row.reason,
        sourceType: row.source_type,
        sourceId: row.source_id,
        metadata: { ...metadata, pendingRewardId: row.id, claimedFromPending: true },
      });
      const now = Date.now();
      await runSql(
        connection,
        `UPDATE pending_point_rewards
         SET status = 'claimed', ledger_id = ?, claimed_at = ?
         WHERE id = ? AND status = 'pending'`,
        [award.ledger?.id || null, now, row.id]
      );
      claimed.push({
        ...normalizePendingRewardRow(row),
        status: 'claimed',
        ledgerId: award.ledger?.id || null,
        claimedAt: now,
      });
    }
  });

  return {
    claimed,
    claimedPoints: claimed.reduce((sum, reward) => sum + reward.points, 0),
    summary: await getPointsSummary(userId),
  };
}

export async function redeemPoints({ userId, rewardCode }) {
  const reward = POINT_REDEMPTION_RULES.find((item) => item.code === rewardCode);
  if (!reward) {
    throw new ValidationError('不支持的积分兑换项目');
  }
  if (RESERVED_REDEMPTION_CODES.has(reward.code)) {
    throw new ValidationError('该权益将在对应功能上线后开放兑换');
  }

  const redemptionId = nanoid();
  await withConnection(async (connection) => {
    const spend = await awardUserPointsInConnection(connection, {
      userId,
      points: -reward.points,
      reason: 'points_redemption',
      sourceType: 'points_redemption',
      sourceId: redemptionId,
      metadata: { rewardCode: reward.code, reward: reward.reward },
    });

    await runSql(
      connection,
      `INSERT INTO point_redemptions
        (id, user_id, reward_code, reward_label, points_spent, quantity, unit, ledger_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        redemptionId,
        userId,
        reward.code,
        reward.reward,
        reward.points,
        reward.quantity,
        reward.unit,
        spend.ledger.id,
        Date.now(),
      ]
    );

    await grantEntitlementInConnection(connection, {
      userId,
      unit: reward.unit,
      amount: reward.quantity,
      reason: 'points_redemption',
      sourceType: 'points_redemption',
      sourceId: redemptionId,
      metadata: { rewardCode: reward.code, reward: reward.reward },
    });
  });

  return { redemption: reward, summary: await getPointsSummary(userId) };
}
