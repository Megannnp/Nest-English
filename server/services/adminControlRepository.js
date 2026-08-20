import {
  buildUsageScopeClause,
  normalizeFeature,
  normalizePercent,
  normalizeText,
  now,
} from './adminControlDomain.js';
import db from '../db/database.js';
import { nanoid } from '../utils/nanoid.js';

export async function getBudgetAlertThreshold() {
  const row = await db.prepare(`
    SELECT setting_value
    FROM system_settings
    WHERE setting_key = 'ai_budget_alert_threshold'
    LIMIT 1
  `).get();
  return normalizePercent(row?.setting_value, 80);
}

export async function insertAdminOperation({
  adminId = null,
  action,
  targetType = '',
  targetId = '',
  detail = null,
}) {
  if (!action) return null;
  await db.prepare(`
    INSERT INTO admin_operation_logs (id, admin_id, action, target_type, target_id, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    nanoid(),
    adminId,
    action,
    targetType,
    targetId,
    detail ? JSON.stringify(detail) : null,
    now()
  );
  return true;
}

export async function listActiveBudgetPolicies() {
  return db.prepare(`
    SELECT *
    FROM admin_budget_policies
    WHERE status = 'active'
  `).all();
}

export async function listBudgetPolicies() {
  return db.prepare(`
    SELECT *
    FROM admin_budget_policies
    ORDER BY updated_at DESC, created_at DESC
  `).all();
}

export async function getBudgetPolicyById(id) {
  return db.prepare('SELECT * FROM admin_budget_policies WHERE id = ?').get(id);
}

export async function getExistingBudgetPolicyId(id) {
  return db.prepare('SELECT id FROM admin_budget_policies WHERE id = ?').get(id);
}

export async function saveBudgetPolicyRow({
  existing,
  id,
  name,
  scopeType,
  scopeId,
  feature,
  dailyLimit,
  monthlyLimit,
  totalLimit,
  status,
  notes,
  timestamp,
}) {
  if (existing) {
    await db.prepare(`
      UPDATE admin_budget_policies
      SET name = ?, scope_type = ?, scope_id = ?, feature = ?, daily_limit = ?,
          monthly_limit = ?, total_limit = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name,
      scopeType,
      scopeId,
      feature,
      dailyLimit,
      monthlyLimit,
      totalLimit,
      status,
      notes,
      timestamp,
      id
    );
    return;
  }
  await db.prepare(`
    INSERT INTO admin_budget_policies
      (id, name, scope_type, scope_id, feature, daily_limit, monthly_limit,
       total_limit, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    scopeType,
    scopeId,
    feature,
    dailyLimit,
    monthlyLimit,
    totalLimit,
    status,
    notes,
    timestamp,
    timestamp
  );
}

function applyFeatureUsageFilters(feature, taskWhere, taskParams, eventWhere, eventParams) {
  if (feature === 'all') return;
  taskWhere.push('wt.task_type = ?');
  taskParams.push(feature);
  eventWhere.push('feature = ?');
  eventParams.push(feature);
}

function applySinceUsageFilters(since, taskWhere, taskParams, eventWhere, eventParams) {
  if (since == null) return;
  taskWhere.push('wt.created_at >= ?');
  taskParams.push(since);
  eventWhere.push('created_at >= ?');
  eventParams.push(since);
}

function applyTaskScopeUsageFilter(policy, taskWhere, taskParams) {
  if (!policy.scope_id) return;
  if (policy.scope_type === 'role') {
    taskWhere.push('u.role = ?');
    taskParams.push(policy.scope_id);
    return;
  }
  if (policy.scope_type === 'user') {
    taskWhere.push('w.user_id = ?');
    taskParams.push(policy.scope_id);
    return;
  }
  if (policy.scope_type === 'class') {
    taskWhere.push('u.class_id = ?');
    taskParams.push(policy.scope_id);
  }
}

function buildWhereSql(conditions) {
  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

function sumUsageTotals(taskRow, eventRow) {
  return Number(taskRow?.total || 0) + Number(eventRow?.total || 0);
}

export async function countAIUsageForPolicy(policy, since = null) {
  const feature = normalizeFeature(policy.feature);
  const taskParams = [];
  const eventParams = [];
  const taskWhere = [];
  const eventWhere = [];

  applyFeatureUsageFilters(feature, taskWhere, taskParams, eventWhere, eventParams);
  applySinceUsageFilters(since, taskWhere, taskParams, eventWhere, eventParams);
  applyTaskScopeUsageFilter(policy, taskWhere, taskParams);
  eventWhere.push(buildUsageScopeClause(policy.scope_type, policy.scope_id, eventParams));

  const taskWhereSql = buildWhereSql(taskWhere);
  const eventWhereSql = buildWhereSql(eventWhere);
  const [taskRow, eventRow] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) AS total
      FROM writing_tasks wt
      LEFT JOIN writings w ON w.id = wt.writing_id
      LEFT JOIN users u ON u.id = w.user_id
      ${taskWhereSql}
    `).get(...taskParams),
    db.prepare(`
      SELECT COUNT(*) AS total
      FROM ai_usage_events
      ${eventWhereSql}
    `).get(...eventParams),
  ]);
  return sumUsageTotals(taskRow, eventRow);
}

export async function getBudgetOverviewBaseRows({ startOfDayValue, startOfMonthValue }) {
  const [
    policies,
    taskUsageRows,
    eventUsageRows,
    todayTaskRow,
    todayEventRow,
    monthTaskRow,
    monthEventRow,
    alertThreshold,
  ] = await Promise.all([
    listBudgetPolicies(),
    db.prepare(`
      SELECT task_type AS feature, COUNT(*) AS total
      FROM writing_tasks
      GROUP BY task_type
      ORDER BY total DESC
    `).all(),
    db.prepare(`
      SELECT feature, COUNT(*) AS total
      FROM ai_usage_events
      GROUP BY feature
      ORDER BY total DESC
    `).all(),
    db.prepare('SELECT COUNT(*) AS total FROM writing_tasks WHERE created_at >= ?').get(startOfDayValue),
    db.prepare('SELECT COUNT(*) AS total FROM ai_usage_events WHERE created_at >= ?').get(startOfDayValue),
    db.prepare('SELECT COUNT(*) AS total FROM writing_tasks WHERE created_at >= ?').get(startOfMonthValue),
    db.prepare('SELECT COUNT(*) AS total FROM ai_usage_events WHERE created_at >= ?').get(startOfMonthValue),
    getBudgetAlertThreshold(),
  ]);

  return {
    policies,
    taskUsageRows,
    eventUsageRows,
    todayTaskRow,
    todayEventRow,
    monthTaskRow,
    monthEventRow,
    alertThreshold,
  };
}

export async function insertAIUsageEvent({ feature, user = null, source = '', classId }) {
  await db.prepare(`
    INSERT INTO ai_usage_events (id, user_id, role, class_id, feature, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    nanoid(),
    user?.id || null,
    user?.role || '',
    classId,
    normalizeFeature(feature),
    normalizeText(source, 64),
    now()
  );
}

export async function listIntegrationAccountRows() {
  return db.prepare(`
    SELECT *
    FROM integration_accounts
    ORDER BY updated_at DESC, created_at DESC
  `).all();
}

export async function getExistingIntegrationAccountId(id) {
  return db.prepare('SELECT id FROM integration_accounts WHERE id = ?').get(id);
}

export async function saveIntegrationAccountRow({
  existing,
  id,
  provider,
  displayName,
  accountIdentifier,
  secretRef,
  notes,
  status,
  timestamp,
}) {
  if (existing) {
    await db.prepare(`
      UPDATE integration_accounts
      SET provider = ?, display_name = ?, account_identifier = ?, secret_ref = ?,
          notes = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      provider,
      displayName,
      accountIdentifier,
      secretRef,
      notes,
      status,
      timestamp,
      id
    );
    return;
  }

  await db.prepare(`
    INSERT INTO integration_accounts
      (id, provider, display_name, account_identifier, secret_ref, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    provider,
    displayName,
    accountIdentifier,
    secretRef,
    notes,
    status,
    timestamp,
    timestamp
  );
}

export async function updateIntegrationStatusRow({ id, status, timestamp }) {
  return db.prepare(`
    UPDATE integration_accounts
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).run(status, timestamp, id);
}

export async function getIntegrationAccountById(id) {
  return db.prepare('SELECT * FROM integration_accounts WHERE id = ?').get(id);
}

export async function countOperationLogsByAction(action) {
  const where = action ? 'WHERE l.action = ?' : '';
  return db.prepare(`
    SELECT COUNT(*) AS total
    FROM admin_operation_logs l
    ${where}
  `).get(...(action ? [action] : []));
}

export async function listOperationLogRows({ action, pageSize, offset }) {
  const where = action ? 'WHERE l.action = ?' : '';
  const params = action ? [action, pageSize, offset] : [pageSize, offset];
  return db.prepare(`
    SELECT l.*, u.real_name AS admin_name, u.email AS admin_email
    FROM admin_operation_logs l
    LEFT JOIN users u ON u.id = l.admin_id
    ${where}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params);
}

export async function listSystemSettingRows() {
  return db.prepare(`
    SELECT *
    FROM system_settings
    ORDER BY setting_key ASC
  `).all();
}

export async function upsertSystemSettingRow({
  key,
  value,
  valueType,
  description,
  adminId,
  timestamp,
}) {
  await db.prepare(`
    INSERT INTO system_settings
      (setting_key, setting_value, value_type, description, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      setting_value = VALUES(setting_value),
      value_type = VALUES(value_type),
      description = VALUES(description),
      updated_by = VALUES(updated_by),
      updated_at = VALUES(updated_at)
  `).run(
    key,
    value,
    valueType,
    description,
    adminId,
    timestamp
  );
}

export async function getSystemSettingByKey(key) {
  return db.prepare('SELECT * FROM system_settings WHERE setting_key = ?').get(key);
}
