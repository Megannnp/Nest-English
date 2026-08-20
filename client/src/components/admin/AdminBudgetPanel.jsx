import { useEffect, useState } from 'react';

import { budgetUsageLabel, fmtNumber } from './adminFormat.js';
import styles from './AdminPage.module.css';
import AdminProgressBar from './AdminProgressBar.jsx';
import { fetchAdminBudget, saveAdminBudgetPolicy } from '../../api/admin.js';

const BUDGET_SCOPE_OPTIONS = [
  { value: 'global', label: '全站' },
  { value: 'role', label: '按角色' },
  { value: 'class', label: '按班级' },
  { value: 'user', label: '按用户' },
];

const BUDGET_FEATURE_OPTIONS = [
  { value: 'all', label: '全部 AI 功能' },
  { value: 'grading', label: '作文批改' },
  { value: 'detailed_feedback', label: '精批补充' },
  { value: 'supplemental_feedback', label: '完整精批补齐' },
  { value: 'question_analysis', label: '题目分析' },
  { value: 'ocr', label: '图片识别' },
  { value: 'tags', label: '标签分析' },
  { value: 'complete', label: '通用生成' },
  { value: 'complete_stream', label: '流式生成' },
];

const BUDGET_STATUS_OPTIONS = [
  { value: 'active', label: '启用' },
  { value: 'paused', label: '暂停' },
];

function createInitialFormState() {
  return {
    name: '',
    scopeType: 'global',
    scopeId: '',
    feature: 'all',
    dailyLimit: '',
    monthlyLimit: '',
    totalLimit: '',
    status: 'active',
    notes: '',
  };
}

function createResetFormState(current) {
  return {
    ...current,
    name: '',
    scopeId: '',
    dailyLimit: '',
    monthlyLimit: '',
    totalLimit: '',
    notes: '',
  };
}

function getMaxBudgetUsage(budget) {
  return Math.max(1, ...(budget?.usageByFeature || []).map((item) => Number(item.total || 0)));
}

function getPolicyStateClassName(baseStyles, status) {
  if (status === 'warning') return baseStyles.policyStateWarning;
  if (status === 'exceeded') return baseStyles.policyStateExceeded;
  return baseStyles.policyStateNormal;
}

function formatPolicyUsageLine(item) {
  if (!item.usage) return null;
  return `今日已用 ${fmtNumber(item.usage.todayUsed)}，剩余 ${item.usage.dailyRemaining ?? '不限'}，占比 ${item.usage.dailyUsagePercent ?? '-'}% · 本月已用 ${fmtNumber(item.usage.monthUsed)}，剩余 ${item.usage.monthlyRemaining ?? '不限'}，占比 ${item.usage.monthlyUsagePercent ?? '-'}%`;
}

function BudgetMetricGrid({ budget }) {
  return (
    <div className={styles.metricGridCompact}>
      <div className={styles.metricMini}><span>今日调用</span><strong>{fmtNumber(budget?.summary?.todayAiCalls)}</strong></div>
      <div className={styles.metricMini}><span>本月调用</span><strong>{fmtNumber(budget?.summary?.monthAiCalls)}</strong></div>
      <div className={styles.metricMini}><span>启用策略</span><strong>{fmtNumber(budget?.summary?.activePolicies)}</strong></div>
      <div className={styles.metricMini}><span>预警策略</span><strong>{fmtNumber(budget?.summary?.alertCount)}</strong></div>
    </div>
  );
}

function BudgetFormFields({ form, setForm }) {
  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <>
      <div className={styles.formGrid}>
        <input className={styles.input} aria-label="策略名称" placeholder="策略名称" value={form.name} onChange={updateField('name')} />
        <select className={styles.input} value={form.scopeType} onChange={updateField('scopeType')}>
          {BUDGET_SCOPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input className={styles.input} aria-label="范围 ID" placeholder="范围 ID（可选）" value={form.scopeId} onChange={updateField('scopeId')} />
        <select className={styles.input} value={form.feature} onChange={updateField('feature')}>
          {BUDGET_FEATURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input className={styles.input} aria-label="每日额度" placeholder="每日额度" value={form.dailyLimit} onChange={updateField('dailyLimit')} />
        <input className={styles.input} aria-label="每月额度" placeholder="每月额度" value={form.monthlyLimit} onChange={updateField('monthlyLimit')} />
        <input className={styles.input} aria-label="总额度" placeholder="总额度" value={form.totalLimit} onChange={updateField('totalLimit')} />
        <select className={styles.input} value={form.status} onChange={updateField('status')}>
          {BUDGET_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <textarea className={styles.textarea} aria-label="备注" placeholder="备注" rows={3} value={form.notes} onChange={updateField('notes')} />
    </>
  );
}

function BudgetUsageBars({ budget, maxUsage }) {
  const items = budget?.usageByFeature || [];
  if (!items.length) return <div className={styles.empty}>暂无 AI 使用记录</div>;

  return (
    <>
      {items.map((item) => (
        <div className={styles.barItem} key={item.feature}>
          <div className={styles.barMeta}><span>{item.label || item.feature}</span><strong>{fmtNumber(item.total)}</strong></div>
          <AdminProgressBar value={item.total} max={maxUsage} />
        </div>
      ))}
    </>
  );
}

function BudgetAlerts({ alerts }) {
  if (!alerts?.length) return null;

  return (
    <div className={styles.policyList}>
      {alerts.map((item) => (
        <div className={`${styles.policyItem} ${getPolicyStateClassName(styles, item.status === 'warning' ? 'warning' : 'exceeded')}`} key={item.id}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.scopeLabel} · {item.featureLabel}</span>
          </div>
          <small>{budgetUsageLabel(item.status)}</small>
        </div>
      ))}
    </div>
  );
}

function BudgetPolicyItem({ item }) {
  const usageLine = formatPolicyUsageLine(item);

  return (
    <div className={`${styles.policyItem} ${getPolicyStateClassName(styles, item.usage?.status)}`} key={item.id}>
      <div>
        <strong>{item.name}</strong>
        <span>{item.display?.scopeLabel || item.scopeType} · {item.display?.featureLabel || item.feature} · {item.status === 'active' ? '启用' : '暂停'}</span>
        {usageLine ? <span>{usageLine}</span> : null}
      </div>
      <small>
        {budgetUsageLabel(item.usage?.status)} · 日 {item.dailyLimit ?? '不限'} / 月 {item.monthlyLimit ?? '不限'} / 总 {item.totalLimit ?? '不限'}
      </small>
    </div>
  );
}

function BudgetPolicyList({ policies }) {
  if (!policies?.length) return <div className={styles.emptySmall}>暂无预算策略</div>;

  return (
    <>
      {policies.map((item) => <BudgetPolicyItem key={item.id} item={item} />)}
    </>
  );
}

export default function AdminBudgetPanel() {
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(createInitialFormState);
  const maxUsage = getMaxBudgetUsage(budget);

  async function loadBudget() {
    setLoading(true);
    setError('');
    try {
      setBudget(await fetchAdminBudget());
    } catch (err) {
      setError(err.message || '加载预算失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setError('');
    try {
      await saveAdminBudgetPolicy(form);
      setForm(createResetFormState);
      await loadBudget();
    } catch (err) {
      setError(err.message || '保存预算失败');
    }
  }

  useEffect(() => {
    void loadBudget();
  }, []);

  if (loading) return <div className={styles.loading}>预算加载中…</div>;

  return (
    <section className={styles.dashboardGrid}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardKicker}>AI BUDGET</span>
          <h2 className={styles.cardTitle}>预算管理</h2>
        </div>
        {error ? <div className={styles.errorBanner}>{error}</div> : null}
        <BudgetMetricGrid budget={budget} />
        <div className={styles.dataScopeNote}>
          当前预警阈值 {budget?.summary?.alertThreshold ?? 80}% 。达到阈值会在这里高亮，真正超额的请求会被后端直接拦截。
        </div>
        <BudgetFormFields form={form} setForm={setForm} />
        <button type="button" className={styles.primaryBtn} onClick={handleSave}>保存预算策略</button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardKicker}>USAGE</span>
          <h2 className={styles.cardTitle}>使用量与策略</h2>
        </div>
        <div className={styles.barList}>
          <BudgetUsageBars budget={budget} maxUsage={maxUsage} />
        </div>
        <BudgetAlerts alerts={budget?.alerts} />
        <div className={styles.policyList}>
          <BudgetPolicyList policies={budget?.policies} />
        </div>
      </div>
    </section>
  );
}
