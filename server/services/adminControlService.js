import {
  DEFAULT_SETTINGS,
  buildPolicyUsage,
  calculateUsagePercent,
  getFeatureLabel,
  getScopeLabel,
  getUserClassId,
  mapBudgetPolicy,
  mapIntegration,
  mapSetting,
  normalizeFeature,
  normalizeLimit,
  normalizeStatus,
  normalizeText,
  now,
  policyAppliesToFeature,
  policyAppliesToUser,
  resolveUsageState,
  safeJson,
  startOfDay,
  startOfMonth,
} from './adminControlDomain.js';
import {
  countAIUsageForPolicy,
  getBudgetOverviewBaseRows,
  getBudgetPolicyById,
  getExistingBudgetPolicyId,
  getExistingIntegrationAccountId,
  getIntegrationAccountById,
  getSystemSettingByKey,
  insertAIUsageEvent,
  insertAdminOperation,
  listActiveBudgetPolicies,
  listIntegrationAccountRows,
  listOperationLogRows,
  listSystemSettingRows,
  countOperationLogsByAction,
  saveBudgetPolicyRow,
  saveIntegrationAccountRow,
  upsertSystemSettingRow,
  updateIntegrationStatusRow,
} from './adminControlRepository.js';
import { AppError, NotFoundError, ValidationError } from '../utils/appError.js';
import { nanoid } from '../utils/nanoid.js';

export async function recordAdminOperation({
  adminId = null,
  action,
  targetType = '',
  targetId = '',
  detail = null,
}) {
  return insertAdminOperation({
    adminId,
    action,
    targetType,
    targetId,
    detail,
  });
}

export async function assertAIBudgetAvailable({ feature, user = null }) {
  const normalizedFeature = normalizeFeature(feature);
  const policies = await listActiveBudgetPolicies();
  const activePolicies = policies.filter((policy) =>
    policyAppliesToFeature(policy, normalizedFeature) && policyAppliesToUser(policy, user)
  );

  for (const policy of activePolicies) {
    const checks = [
      { key: 'daily_limit', label: '每日', since: startOfDay() },
      { key: 'monthly_limit', label: '每月', since: startOfMonth() },
      { key: 'total_limit', label: '总', since: null },
    ];
    for (const check of checks) {
      const limit = policy[check.key];
      if (limit == null) continue;
      const used = await countAIUsageForPolicy(policy, check.since);
      if (used >= Number(limit)) {
        await recordAdminOperation({
          adminId: null,
          action: 'ai_budget_blocked',
          targetType: 'budget_policy',
          targetId: policy.id,
          detail: {
            policyName: policy.name,
            feature: normalizedFeature,
            userId: user?.id || null,
            role: user?.role || '',
            used,
            limit: Number(limit),
            window: check.key,
          },
        });
        throw new AppError(`AI 预算已达到「${policy.name}」${check.label}额度，请联系管理员`, {
          status: 429,
          code: 'AI_BUDGET_EXCEEDED',
          details: {
            policyId: policy.id,
            policyName: policy.name,
            feature: normalizedFeature,
            featureLabel: getFeatureLabel(normalizedFeature),
            scopeType: policy.scope_type || 'global',
            scopeId: policy.scope_id || '',
            scopeLabel: getScopeLabel(policy.scope_type || 'global', policy.scope_id || ''),
            used,
            limit: Number(limit),
            remaining: 0,
            windowKey: check.key,
            windowLabel: check.label,
          },
        });
      }
    }
  }
}

export async function recordAIUsageEvent({ feature, user = null, source = '' }) {
  await insertAIUsageEvent({
    feature,
    user,
    source,
    classId: getUserClassId(user),
  });
}

export async function getBudgetOverview() {
  const {
    policies,
    taskUsageRows,
    eventUsageRows,
    todayTaskRow,
    todayEventRow,
    monthTaskRow,
    monthEventRow,
    alertThreshold,
  } = await getBudgetOverviewBaseRows({
    startOfDayValue: startOfDay(),
    startOfMonthValue: startOfMonth(),
  });
  const usageMap = new Map();
  [...taskUsageRows, ...eventUsageRows].forEach((item) => {
    const feature = normalizeFeature(item.feature);
    usageMap.set(feature, (usageMap.get(feature) || 0) + Number(item.total || 0));
  });

  const mappedPolicies = await Promise.all(policies.map(async (policy) => {
    const [todayUsed, monthUsed, totalUsed] = await Promise.all([
      countAIUsageForPolicy(policy, startOfDay()),
      countAIUsageForPolicy(policy, startOfMonth()),
      countAIUsageForPolicy(policy, null),
    ]);
    const usage = buildPolicyUsage(policy, { todayUsed, monthUsed, totalUsed }, alertThreshold);
    return mapBudgetPolicy({
      ...policy,
      usage,
      display: {
        featureLabel: getFeatureLabel(policy.feature),
        scopeLabel: getScopeLabel(policy.scope_type, policy.scope_id),
      },
    });
  }));

  const alerts = mappedPolicies
    .filter((policy) => policy.status === 'active' && policy.usage?.status !== 'ok')
    .map((policy) => ({
      id: policy.id,
      name: policy.name,
      status: policy.usage.status,
      featureLabel: policy.display?.featureLabel || getFeatureLabel(policy.feature),
      scopeLabel: policy.display?.scopeLabel || getScopeLabel(policy.scopeType, policy.scopeId),
    }));

  return {
    summary: {
      todayAiCalls: Number(todayTaskRow?.total || 0) + Number(todayEventRow?.total || 0),
      monthAiCalls: Number(monthTaskRow?.total || 0) + Number(monthEventRow?.total || 0),
      activePolicies: policies.filter((item) => item.status === 'active').length,
      pausedPolicies: policies.filter((item) => item.status === 'paused').length,
      alertThreshold,
      alertCount: alerts.length,
    },
    usageByFeature: Array.from(usageMap.entries())
      .map(([itemFeature, total]) => ({ feature: itemFeature, label: getFeatureLabel(itemFeature), total }))
      .sort((a, b) => b.total - a.total),
    policies: mappedPolicies,
    alerts,
  };
}

export const __test__ = {
  calculateUsagePercent,
  resolveUsageState,
  buildPolicyUsage,
  getFeatureLabel,
  getScopeLabel,
};

export async function saveBudgetPolicy(payload = {}, adminId = null) {
  const id = normalizeText(payload.id, 64) || nanoid();
  const name = normalizeText(payload.name, 128);
  if (!name) throw new ValidationError('预算名称不能为空');
  const scopeType = normalizeText(payload.scopeType || 'global', 32) || 'global';
  const scopeId = normalizeText(payload.scopeId, 64);
  const feature = normalizeText(payload.feature || 'all', 64) || 'all';
  const timestamp = now();
  const existing = await getExistingBudgetPolicyId(id);

  await saveBudgetPolicyRow({
    existing,
    id,
    name,
    scopeType,
    scopeId,
    feature,
    dailyLimit: normalizeLimit(payload.dailyLimit),
    monthlyLimit: normalizeLimit(payload.monthlyLimit),
    totalLimit: normalizeLimit(payload.totalLimit),
    status: normalizeStatus(payload.status),
    notes: normalizeText(payload.notes, 2000),
    timestamp,
  });

  await recordAdminOperation({
    adminId,
    action: existing ? 'budget_policy_updated' : 'budget_policy_created',
    targetType: 'budget_policy',
    targetId: id,
    detail: { name, scopeType, feature },
  });

  const row = await getBudgetPolicyById(id);
  return mapBudgetPolicy(row);
}

export async function listIntegrationAccounts() {
  const rows = await listIntegrationAccountRows();
  return rows.map(mapIntegration);
}

export async function saveIntegrationAccount(payload = {}, adminId = null) {
  const id = normalizeText(payload.id, 64) || nanoid();
  const provider = normalizeText(payload.provider, 64);
  const displayName = normalizeText(payload.displayName, 128);
  if (!provider || !displayName) throw new ValidationError('服务类型和账号名称不能为空');
  const timestamp = now();
  const existing = await getExistingIntegrationAccountId(id);

  await saveIntegrationAccountRow({
    existing,
    id,
    provider,
    displayName,
    accountIdentifier: normalizeText(payload.accountIdentifier, 256),
    secretRef: normalizeText(payload.secretRef, 256),
    notes: normalizeText(payload.notes, 2000),
    status: normalizeStatus(payload.status),
    timestamp,
  });

  await recordAdminOperation({
    adminId,
    action: existing ? 'integration_account_updated' : 'integration_account_created',
    targetType: 'integration_account',
    targetId: id,
    detail: { provider, displayName },
  });

  const row = await getIntegrationAccountById(id);
  return mapIntegration(row);
}

export async function updateIntegrationStatus({ id, status, adminId }) {
  const normalizedStatus = normalizeStatus(status);
  const result = await updateIntegrationStatusRow({
    id,
    status: normalizedStatus,
    timestamp: now(),
  });
  if (!result.changes) throw new NotFoundError('集成账号不存在');
  await recordAdminOperation({
    adminId,
    action: 'integration_account_status_updated',
    targetType: 'integration_account',
    targetId: id,
    detail: { status: normalizedStatus },
  });
  const row = await getIntegrationAccountById(id);
  return mapIntegration(row);
}

export async function listOperationLogs(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(10, Number.parseInt(query.pageSize, 10) || 20));
  const action = normalizeText(query.action, 64);
  const offset = (page - 1) * pageSize;
  const [totalRow, rows] = await Promise.all([
    countOperationLogsByAction(action),
    listOperationLogRows({ action, pageSize, offset }),
  ]);

  return {
    list: rows.map((row) => ({
      id: row.id,
      adminId: row.admin_id || '',
      adminName: row.admin_name || row.admin_email || '系统',
      action: row.action,
      targetType: row.target_type || '',
      targetId: row.target_id || '',
      detail: safeJson(row.detail),
      createdAt: row.created_at || 0,
    })),
    page,
    pageSize,
    total: Number(totalRow?.total || 0),
    totalPages: Math.max(1, Math.ceil(Number(totalRow?.total || 0) / pageSize)),
  };
}

export async function listSystemSettings() {
  const rows = await listSystemSettingRows();
  const existing = new Map(rows.map((row) => [row.setting_key, mapSetting(row)]));
  return DEFAULT_SETTINGS.map((item) => existing.get(item.key) || {
    key: item.key,
    value: item.value,
    valueType: item.valueType,
    description: item.description,
    updatedBy: '',
    updatedAt: 0,
  }).concat(
    rows
      .filter((row) => !DEFAULT_SETTINGS.some((item) => item.key === row.setting_key))
      .map(mapSetting)
  );
}

export async function saveSystemSetting(payload = {}, adminId = null) {
  const key = normalizeText(payload.key, 128);
  if (!key) throw new ValidationError('设置键不能为空');
  const valueType = ['string', 'number', 'boolean', 'json'].includes(payload.valueType)
    ? payload.valueType
    : 'string';
  const value = String(payload.value ?? '');
  if (valueType === 'json' && value) {
    try {
      JSON.parse(value);
    } catch {
      throw new ValidationError('JSON 设置值格式不正确');
    }
  }
  const timestamp = now();
  await upsertSystemSettingRow({
    key,
    value,
    valueType,
    description: normalizeText(payload.description, 255),
    adminId,
    timestamp,
  });

  await recordAdminOperation({
    adminId,
    action: 'system_setting_updated',
    targetType: 'system_setting',
    targetId: key,
    detail: { key, valueType },
  });

  const row = await getSystemSettingByKey(key);
  return mapSetting(row);
}
