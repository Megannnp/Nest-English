import { grantEntitlementInConnection } from './pointsService.js';
import db from '../db/database.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/appError.js';
import { nanoid } from '../utils/nanoid.js';

const STANDARD_MONTHLY_QUOTAS = {
  writing_review: 8,
  sentence_analysis: 50,
  reading_analysis: 15,
  paper_generation: 8,
  sentence_reading: 100,
  ai_speaking_minutes: 200,
  ai_listening_minutes: 200,
};

const PREMIUM_MONTHLY_QUOTAS = {
  writing_review: 15,
  sentence_analysis: 100,
  reading_analysis: 30,
  paper_generation: 15,
  sentence_reading: 300,
  ai_speaking_minutes: 500,
  ai_listening_minutes: 500,
};

export const PAYMENT_PRODUCTS = [
  { code: 'standard_month', type: 'membership', tier: 'standard', cycleMonths: 1, label: '普通会员（月卡）', amountCents: 5900, monthlyQuotas: STANDARD_MONTHLY_QUOTAS },
  { code: 'standard_quarter', type: 'membership', tier: 'standard', cycleMonths: 3, label: '普通会员（季卡）', amountCents: 15900, monthlyQuotas: STANDARD_MONTHLY_QUOTAS },
  { code: 'standard_year', type: 'membership', tier: 'standard', cycleMonths: 12, label: '普通会员（年卡）', amountCents: 49900, monthlyQuotas: STANDARD_MONTHLY_QUOTAS },
  { code: 'premium_month', type: 'membership', tier: 'premium', cycleMonths: 1, label: '大会员（月卡）', amountCents: 12900, monthlyQuotas: PREMIUM_MONTHLY_QUOTAS },
  { code: 'premium_quarter', type: 'membership', tier: 'premium', cycleMonths: 3, label: '大会员（季卡）', amountCents: 34900, monthlyQuotas: PREMIUM_MONTHLY_QUOTAS },
  { code: 'premium_year', type: 'membership', tier: 'premium', cycleMonths: 12, label: '大会员（年卡）', amountCents: 99900, monthlyQuotas: PREMIUM_MONTHLY_QUOTAS },
  { code: 'booster_writing_review_15', type: 'booster', label: '写作批改包', amountCents: 2900, unit: 'writing_review', quantity: 15 },
  { code: 'booster_sentence_analysis_20', type: 'booster', label: '句子分析包', amountCents: 990, unit: 'sentence_analysis', quantity: 20 },
  { code: 'booster_reading_analysis_10', type: 'booster', label: '阅读分析包', amountCents: 990, unit: 'reading_analysis', quantity: 10 },
  { code: 'booster_sentence_reading_50', type: 'booster', label: '句子朗读包', amountCents: 500, unit: 'sentence_reading', quantity: 50 },
  { code: 'booster_paper_generation_10', type: 'booster', label: '题卷生成包', amountCents: 990, unit: 'paper_generation', quantity: 10 },
];

const PRODUCT_MAP = new Map(PAYMENT_PRODUCTS.map((item) => [item.code, item]));
export const PAYMENT_ORDER_EXPIRES_MS = 24 * 60 * 60 * 1000;
export const BOOSTER_EXPIRES_MS = 90 * 24 * 60 * 60 * 1000;

export function isPaymentOrderExpired(order, now = Date.now()) {
  return Number(order?.created_at || order?.createdAt || 0) + PAYMENT_ORDER_EXPIRES_MS <= now;
}

function addMonths(timestamp, months) {
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

function isActiveMembership(existing, now) {
  return existing?.status === 'active' && Number(existing.expires_at || 0) > now;
}

function isSameTierCurrentPeriodRenewal(existing, product, now, active) {
  return active
    && existing?.tier === product.tier
    && Number(existing.current_period_end || 0) > now;
}

function resolvePeriodStart(existing, now, sameTierRenewal) {
  return sameTierRenewal ? Number(existing.current_period_start || now) : now;
}

function resolvePeriodEnd(existing, now, expiresAt, sameTierRenewal) {
  return sameTierRenewal ? Number(existing.current_period_end) : Math.min(addMonths(now, 1), expiresAt);
}

export function resolveMembershipActivation({ existing, product, now }) {
  const active = isActiveMembership(existing, now);
  const sameTierRenewal = isSameTierCurrentPeriodRenewal(existing, product, now, active);
  const startBase = active ? Number(existing.expires_at) : now;
  const expiresAt = addMonths(startBase, product.cycleMonths || 1);
  const periodStart = resolvePeriodStart(existing, now, sameTierRenewal);
  const periodEnd = resolvePeriodEnd(existing, now, expiresAt, sameTierRenewal);

  return {
    startedAt: existing?.started_at ? Number(existing.started_at) : now,
    expiresAt,
    periodStart,
    periodEnd,
    nextResetAt: periodEnd < expiresAt ? periodEnd : null,
    shouldGrantCurrentPeriodQuotas: !sameTierRenewal,
  };
}

async function withPaymentConnection(callback) {
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
  const [rows] = await connection.query(sql, params);
  return rows[0] || null;
}

async function runSql(connection, sql, params = []) {
  const [result] = await connection.query(sql, params);
  return { changes: result.affectedRows ?? 0 };
}

function numberField(row, field) {
  return Number(row[field] || 0);
}

function nullableNumberField(row, field) {
  return row[field] ? Number(row[field]) : null;
}

function stringField(row, field) {
  return row[field] || '';
}

function getOrderExpiresAt(status, createdAt) {
  return status === 'pending' ? createdAt + PAYMENT_ORDER_EXPIRES_MS : null;
}

function normalizeOrder(row) {
  const createdAt = numberField(row, 'created_at');
  return {
    id: row.id,
    userId: row.user_id,
    productCode: row.product_code,
    productType: row.product_type,
    productLabel: row.product_label,
    amountCents: numberField(row, 'amount_cents'),
    currency: row.currency || 'CNY',
    paymentMethod: row.payment_method,
    status: row.status,
    provider: stringField(row, 'provider'),
    providerOrderId: stringField(row, 'provider_order_id'),
    qrUrl: stringField(row, 'qr_url'),
    proofNote: stringField(row, 'proof_note'),
    createdAt,
    expiresAt: getOrderExpiresAt(row.status, createdAt),
    paidAt: nullableNumberField(row, 'paid_at'),
    confirmedAt: nullableNumberField(row, 'confirmed_at'),
    confirmedBy: stringField(row, 'confirmed_by'),
    updatedAt: numberField(row, 'updated_at'),
    userEmail: stringField(row, 'user_email'),
    userPhone: stringField(row, 'user_phone'),
    userRealName: stringField(row, 'user_real_name'),
    userAccountCode: stringField(row, 'user_account_code'),
  };
}

export function normalizeAdminOrderSummary(rows = []) {
  const summary = {
    totalCount: 0,
    totalAmountCents: 0,
    byStatus: {},
  };
  for (const row of rows || []) {
    const status = row.status || 'unknown';
    const count = Number(row.count || 0);
    const amountCents = Number(row.amount_cents || 0);
    summary.totalCount += count;
    summary.totalAmountCents += amountCents;
    summary.byStatus[status] = { count, amountCents };
  }
  return summary;
}

function getManualQrUrl() {
  return process.env.MANUAL_PAYMENT_QR_URL || '';
}

export function listPaymentProducts() {
  return PAYMENT_PRODUCTS.map((item) => ({ ...item }));
}

// Accepts an optional connection so it can participate in an existing transaction.
export async function closeExpiredPendingOrders(userId = null, now = Date.now(), connection = null) {
  const cutoff = now - PAYMENT_ORDER_EXPIRES_MS;
  const sql = userId
    ? `UPDATE payment_orders
       SET status = 'closed', updated_at = ?
       WHERE user_id = ? AND status = 'pending' AND created_at <= ?`
    : `UPDATE payment_orders
       SET status = 'closed', updated_at = ?
       WHERE status = 'pending' AND created_at <= ?`;
  const params = userId ? [now, userId, cutoff] : [now, cutoff];

  const exec = connection || db.pool;
  const [result] = await exec.query(sql, params);
  return { closed: result.affectedRows ?? 0 };
}

export async function createPaymentOrder({ userId, productCode, paymentMethod = 'manual_qr', proofNote = '' }) {
  const product = PRODUCT_MAP.get(productCode);
  if (!product) throw new ValidationError('不支持的购买项目');
  if (paymentMethod !== 'manual_qr') throw new ValidationError('当前仅支持手动二维码收款订单');

  await closeExpiredPendingOrders(userId);

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[existingPending]] = await connection.query(
      `SELECT * FROM payment_orders
       WHERE user_id = ? AND product_code = ? AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1 FOR UPDATE`,
      [userId, product.code]
    );
    if (existingPending) {
      await connection.rollback();
      return normalizeOrder(existingPending);
    }

    const now = Date.now();
    const id = nanoid();
    await connection.query(
      `INSERT INTO payment_orders
         (id, user_id, product_code, product_type, product_label, amount_cents, currency,
          payment_method, status, provider, provider_order_id, qr_url, proof_note,
          created_at, paid_at, confirmed_at, confirmed_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'CNY', ?, 'pending', '', '', ?, ?, ?, NULL, NULL, '', ?)`,
      [
        id,
        userId,
        product.code,
        product.type,
        product.label,
        product.amountCents,
        paymentMethod,
        getManualQrUrl(),
        String(proofNote || '').slice(0, 512),
        now,
        now,
      ]
    );

    await connection.commit();
    return getPaymentOrder({ userId, orderId: id });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function getPaymentOrder({ userId, orderId }) {
  const [[row]] = await db.pool.query(
    'SELECT * FROM payment_orders WHERE id = ? AND user_id = ?',
    [orderId, userId]
  );
  if (!row) throw new NotFoundError('订单不存在');
  return normalizeOrder(row);
}

export async function listMyPaymentOrders(userId) {
  const [rows] = await db.pool.query(
    'SELECT * FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  return rows.map(normalizeOrder);
}

function buildAdminOrderFilters({ status = '', keyword = '' } = {}) {
  const where = [];
  const params = [];
  const countParams = [];
  const summaryWhere = [];
  const summaryParams = [];
  const normalizedStatus = String(status || '').trim();
  const normalizedKeyword = String(keyword || '').trim();

  if (normalizedStatus) {
    where.push('o.status = ?');
    params.push(normalizedStatus);
    countParams.push(normalizedStatus);
  }

  if (normalizedKeyword) {
    const like = `%${normalizedKeyword}%`;
    const keywordClause = `(
      o.id LIKE ?
      OR o.product_label LIKE ?
      OR u.real_name LIKE ?
      OR u.email LIKE ?
      OR u.phone LIKE ?
      OR u.account_code LIKE ?
    )`;
    where.push(keywordClause);
    summaryWhere.push(keywordClause);
    params.push(like, like, like, like, like, like);
    countParams.push(like, like, like, like, like, like);
    summaryParams.push(like, like, like, like, like, like);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    summaryWhereSql: summaryWhere.length ? `WHERE ${summaryWhere.join(' AND ')}` : '',
    params,
    countParams,
    summaryParams,
  };
}

export async function listAdminPaymentOrders({ status = '', keyword = '', page = 1, pageSize = 20 } = {}) {
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const normalizedPageSize = Math.min(100, Math.max(1, Number.parseInt(pageSize, 10) || 20));
  const offset = (normalizedPage - 1) * normalizedPageSize;
  const { whereSql, summaryWhereSql, params, countParams, summaryParams } = buildAdminOrderFilters({ status, keyword });
  const [[countRow]] = await db.pool.query(
    `SELECT COUNT(*) AS total FROM payment_orders o LEFT JOIN users u ON u.id = o.user_id ${whereSql}`,
    countParams
  );
  const [summaryRows] = await db.pool.query(
    `SELECT o.status, COUNT(*) AS count, COALESCE(SUM(o.amount_cents), 0) AS amount_cents
     FROM payment_orders o
     LEFT JOIN users u ON u.id = o.user_id
     ${summaryWhereSql}
     GROUP BY o.status`,
    summaryParams
  );
  const [rows] = await db.pool.query(
    `SELECT o.*, u.email AS user_email, u.phone AS user_phone,
            u.real_name AS user_real_name, u.account_code AS user_account_code
     FROM payment_orders o
     LEFT JOIN users u ON u.id = o.user_id
     ${whereSql}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, normalizedPageSize, offset]
  );
  const total = Number(countRow?.total || 0);

  return {
    list: rows.map(normalizeOrder),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / normalizedPageSize)),
    summary: normalizeAdminOrderSummary(summaryRows),
  };
}

export async function closeMyPaymentOrder({ userId, orderId }) {
  const [[row]] = await db.pool.query(
    'SELECT * FROM payment_orders WHERE id = ? AND user_id = ?',
    [orderId, userId]
  );
  if (!row) throw new NotFoundError('订单不存在');
  if (row.status !== 'pending') throw new ConflictError('仅待支付订单可关闭');
  const now = Date.now();
  await db.pool.query(
    `UPDATE payment_orders SET status = 'closed', updated_at = ? WHERE id = ? AND user_id = ? AND status = 'pending'`,
    [now, orderId, userId]
  );
  return getPaymentOrder({ userId, orderId });
}

export async function closeManualPaymentOrderByAdmin({ orderId }) {
  return withPaymentConnection(async (connection) => {
    const row = await queryOne(connection, 'SELECT * FROM payment_orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!row) throw new NotFoundError('订单不存在');
    if (row.status !== 'pending') throw new ConflictError('仅待支付订单可关闭');
    const now = Date.now();
    await runSql(
      connection,
      `UPDATE payment_orders SET status = 'closed', updated_at = ? WHERE id = ? AND status = 'pending'`,
      [now, orderId]
    );
    const updated = await queryOne(connection, 'SELECT * FROM payment_orders WHERE id = ?', [orderId]);
    return normalizeOrder(updated);
  });
}

export async function markManualPaymentOrderFailedByAdmin({ orderId }) {
  return withPaymentConnection(async (connection) => {
    const row = await queryOne(connection, 'SELECT * FROM payment_orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!row) throw new NotFoundError('订单不存在');
    if (row.status !== 'pending') throw new ConflictError('仅待确认订单可标记异常');
    const now = Date.now();
    await runSql(
      connection,
      `UPDATE payment_orders SET status = 'failed', updated_at = ? WHERE id = ? AND status = 'pending'`,
      [now, orderId]
    );
    const updated = await queryOne(connection, 'SELECT * FROM payment_orders WHERE id = ?', [orderId]);
    return normalizeOrder(updated);
  });
}

export async function markManualPaymentOrderRefundedByAdmin({ orderId }) {
  return withPaymentConnection(async (connection) => {
    const row = await queryOne(connection, 'SELECT * FROM payment_orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!row) throw new NotFoundError('订单不存在');
    if (row.status !== 'paid') throw new ConflictError('仅已支付订单可标记退款');
    const now = Date.now();
    await runSql(
      connection,
      `UPDATE payment_orders SET status = 'refunded', updated_at = ? WHERE id = ? AND status = 'paid'`,
      [now, orderId]
    );
    const updated = await queryOne(connection, 'SELECT * FROM payment_orders WHERE id = ?', [orderId]);
    return normalizeOrder(updated);
  });
}

async function activateMembershipInConnection(connection, { row, product, adminUserId, now }) {
  const existing = await queryOne(
    connection,
    'SELECT * FROM membership_accounts WHERE user_id = ? FOR UPDATE',
    [row.user_id]
  );
  const quotas = product.monthlyQuotas || {};
  const activation = resolveMembershipActivation({ existing, product, now });

  await runSql(
    connection,
    `INSERT INTO membership_accounts
      (user_id, tier, plan_code, cycle_months, status, started_at, expires_at,
       current_period_start, current_period_end, next_reset_at, monthly_quotas,
       source_order_id, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       tier = VALUES(tier),
       plan_code = VALUES(plan_code),
       cycle_months = VALUES(cycle_months),
       status = 'active',
       expires_at = VALUES(expires_at),
       current_period_start = VALUES(current_period_start),
       current_period_end = VALUES(current_period_end),
       next_reset_at = VALUES(next_reset_at),
       monthly_quotas = VALUES(monthly_quotas),
       source_order_id = VALUES(source_order_id),
       updated_at = VALUES(updated_at)`,
    [
      row.user_id,
      product.tier,
      product.code,
      product.cycleMonths || 1,
      activation.startedAt,
      activation.expiresAt,
      activation.periodStart,
      activation.periodEnd,
      activation.nextResetAt,
      JSON.stringify(quotas),
      row.id,
      now,
    ]
  );

  if (!activation.shouldGrantCurrentPeriodQuotas) return;

  for (const [unit, amount] of Object.entries(quotas)) {
    await grantEntitlementInConnection(connection, {
      userId: row.user_id,
      unit,
      amount,
      reason: 'membership_period',
      sourceType: 'payment_order',
      sourceId: `${row.id}:membership:${unit}`,
      metadata: {
        productCode: product.code,
        productLabel: product.label,
        tier: product.tier,
        confirmedBy: adminUserId,
        periodStart: activation.periodStart,
        periodEnd: activation.periodEnd,
        expiresAt: activation.periodEnd,
      },
    });
  }
}

export async function confirmManualPaymentOrder({ orderId, adminUserId }) {
  return withPaymentConnection(async (connection) => {
    const row = await queryOne(connection, 'SELECT * FROM payment_orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!row) throw new NotFoundError('订单不存在');
    if (row.status === 'paid') return normalizeOrder(row);
    if (row.status !== 'pending') throw new ConflictError('当前订单状态不支持确认');

    const product = PRODUCT_MAP.get(row.product_code);
    if (!product) throw new ValidationError('订单产品配置不存在');
    const now = Date.now();
    if (isPaymentOrderExpired(row, now)) {
      await runSql(
        connection,
        `UPDATE payment_orders SET status = 'closed', updated_at = ? WHERE id = ? AND status = 'pending'`,
        [now, orderId]
      );
      const closed = await queryOne(connection, 'SELECT * FROM payment_orders WHERE id = ?', [orderId]);
      return normalizeOrder(closed);
    }
    await runSql(
      connection,
      `UPDATE payment_orders
       SET status = 'paid', paid_at = ?, confirmed_at = ?, confirmed_by = ?, updated_at = ?
       WHERE id = ? AND status = 'pending'`,
      [now, now, adminUserId, now, orderId]
    );

    if (product.type === 'booster') {
      await grantEntitlementInConnection(connection, {
        userId: row.user_id,
        unit: product.unit,
        amount: product.quantity,
        reason: 'payment_order',
        sourceType: 'payment_order',
        sourceId: orderId,
        metadata: {
          productCode: product.code,
          productLabel: product.label,
          confirmedBy: adminUserId,
          expiresAt: now + BOOSTER_EXPIRES_MS,
        },
      });
    } else if (product.type === 'membership') {
      await activateMembershipInConnection(connection, { row, product, adminUserId, now });
    }

    const updated = await queryOne(connection, 'SELECT * FROM payment_orders WHERE id = ?', [orderId]);
    return normalizeOrder(updated);
  });
}
