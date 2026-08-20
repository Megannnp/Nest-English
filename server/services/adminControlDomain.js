import { ValidationError } from '../utils/appError.js';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_SETTINGS = [
  {
    key: 'site_maintenance',
    value: 'false',
    valueType: 'boolean',
    description: '是否开启维护模式',
  },
  {
    key: 'ai_budget_alert_threshold',
    value: '80',
    valueType: 'number',
    description: 'AI 预算预警阈值百分比',
  },
  {
    key: 'admin_contact_email',
    value: '',
    valueType: 'string',
    description: '后台通知联系人邮箱',
  },
];

export function now() {
  return Date.now();
}

export function startOfDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function startOfMonth(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function normalizeLimit(value) {
  if (value === '' || value == null) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) throw new ValidationError('额度必须是非负整数');
  return parsed;
}

export function normalizeStatus(value) {
  return value === 'paused' ? 'paused' : 'active';
}

export function normalizeText(value, max = 255) {
  return String(value || '').trim().slice(0, max);
}

export function safeJson(value) {
  if (!value) return null;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

export function normalizePercent(value, fallback = 80) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(1, parsed));
}

export function calculateUsagePercent(used, limit) {
  if (limit == null) return null;
  const normalizedLimit = Number(limit);
  if (!Number.isFinite(normalizedLimit) || normalizedLimit <= 0) return null;
  return Math.min(100, Math.round((Number(used || 0) / normalizedLimit) * 100));
}

export function resolveUsageState(percentages, thresholdPercent) {
  const defined = percentages.filter((value) => value != null);
  if (!defined.length) return 'ok';
  if (defined.some((value) => value >= 100)) return 'exceeded';
  if (defined.some((value) => value >= thresholdPercent)) return 'warning';
  return 'ok';
}

export function mapBudgetPolicy(row) {
  return {
    id: row.id,
    name: row.name || '',
    scopeType: row.scope_type || 'global',
    scopeId: row.scope_id || '',
    feature: row.feature || 'all',
    dailyLimit: row.daily_limit,
    monthlyLimit: row.monthly_limit,
    totalLimit: row.total_limit,
    status: row.status || 'active',
    notes: row.notes || '',
    createdAt: row.created_at || 0,
    updatedAt: row.updated_at || 0,
    usage: row.usage || null,
    display: row.display || null,
  };
}

export function mapIntegration(row) {
  return {
    id: row.id,
    provider: row.provider || '',
    displayName: row.display_name || '',
    accountIdentifier: row.account_identifier || '',
    secretRef: row.secret_ref || '',
    notes: row.notes || '',
    status: row.status || 'active',
    createdAt: row.created_at || 0,
    updatedAt: row.updated_at || 0,
  };
}

export function mapSetting(row) {
  return {
    key: row.setting_key,
    value: row.setting_value || '',
    valueType: row.value_type || 'string',
    description: row.description || '',
    updatedBy: row.updated_by || '',
    updatedAt: row.updated_at || 0,
  };
}

export function normalizeFeature(feature) {
  const value = normalizeText(feature || 'all', 64);
  if (value === 'recognize_text') return 'ocr';
  if (value === 'analyze_tags') return 'tags';
  return value || 'all';
}

export function getFeatureLabel(feature) {
  switch (normalizeFeature(feature)) {
    case 'all': return '全部 AI 功能';
    case 'grading': return '作文批改';
    case 'detailed_feedback': return '精批补充';
    case 'supplemental_feedback': return '完整精批补齐';
    case 'question_analysis': return '题目分析';
    case 'ocr': return '图片识别';
    case 'tags': return '标签分析';
    case 'complete': return '通用生成';
    case 'complete_stream': return '流式生成';
    default: return normalizeFeature(feature);
  }
}

export function getScopeLabel(scopeType, scopeId) {
  if (scopeType === 'role') return scopeId ? `角色 ${scopeId}` : '按角色';
  if (scopeType === 'user') return scopeId ? `用户 ${scopeId}` : '按用户';
  if (scopeType === 'class') return scopeId ? `班级 ${scopeId}` : '按班级';
  return '全站';
}

export function getUserClassId(user) {
  return user?.classId || user?.class_id || '';
}

export function policyAppliesToUser(policy, user) {
  if (policy.scope_type === 'global') return true;
  if (policy.scope_type === 'role') return !policy.scope_id || policy.scope_id === user?.role;
  if (policy.scope_type === 'user') return Boolean(user?.id) && policy.scope_id === user.id;
  if (policy.scope_type === 'class') return Boolean(getUserClassId(user)) && policy.scope_id === getUserClassId(user);
  return false;
}

export function policyAppliesToFeature(policy, feature) {
  return policy.feature === 'all' || normalizeFeature(policy.feature) === normalizeFeature(feature);
}

export function buildUsageScopeClause(scopeType, scopeId, params) {
  if (scopeType === 'role' && scopeId) {
    params.push(scopeId);
    return 'role = ?';
  }
  if (scopeType === 'user' && scopeId) {
    params.push(scopeId);
    return 'user_id = ?';
  }
  if (scopeType === 'class' && scopeId) {
    params.push(scopeId);
    return 'class_id = ?';
  }
  return '1 = 1';
}

export function buildPolicyUsage(policy, { todayUsed, monthUsed, totalUsed }, thresholdPercent) {
  const dailyUsagePercent = calculateUsagePercent(todayUsed, policy.daily_limit);
  const monthlyUsagePercent = calculateUsagePercent(monthUsed, policy.monthly_limit);
  const totalUsagePercent = calculateUsagePercent(totalUsed, policy.total_limit);
  return {
    todayUsed,
    monthUsed,
    totalUsed,
    dailyRemaining: policy.daily_limit == null ? null : Math.max(0, Number(policy.daily_limit) - todayUsed),
    monthlyRemaining: policy.monthly_limit == null ? null : Math.max(0, Number(policy.monthly_limit) - monthUsed),
    totalRemaining: policy.total_limit == null ? null : Math.max(0, Number(policy.total_limit) - totalUsed),
    dailyUsagePercent,
    monthlyUsagePercent,
    totalUsagePercent,
    status: resolveUsageState([dailyUsagePercent, monthlyUsagePercent, totalUsagePercent], thresholdPercent),
  };
}
