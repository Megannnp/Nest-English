import { useEffect, useState } from 'react';

import styles from './AdminPage.module.css';
import {
  fetchAdminIntegrations,
  saveAdminIntegration,
  updateAdminIntegrationStatus,
} from '../../api/admin.js';

export default function AdminIntegrationsPanel() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    provider: '',
    displayName: '',
    accountIdentifier: '',
    secretRef: '',
    status: 'active',
    notes: '',
  });

  async function loadIntegrations() {
    setLoading(true);
    setError('');
    try {
      setList(await fetchAdminIntegrations());
    } catch (err) {
      setError(err.message || '加载集成失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setError('');
    try {
      await saveAdminIntegration(form);
      setForm({
        provider: '',
        displayName: '',
        accountIdentifier: '',
        secretRef: '',
        status: 'active',
        notes: '',
      });
      await loadIntegrations();
    } catch (err) {
      setError(err.message || '保存集成失败');
    }
  }

  async function toggleStatus(item) {
    setError('');
    try {
      await updateAdminIntegrationStatus(item.id, item.status === 'active' ? 'paused' : 'active');
      await loadIntegrations();
    } catch (err) {
      setError(err.message || '操作失败');
    }
  }

  useEffect(() => {
    void loadIntegrations();
  }, []);

  return (
    <section className={styles.dashboardGrid}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardKicker}>INTEGRATIONS</span>
          <h2 className={styles.cardTitle}>账号与集成</h2>
        </div>
        {error ? <div className={styles.errorBanner}>{error}</div> : null}
        <div className={styles.formGrid}>
          <input className={styles.input} aria-label="服务类型" placeholder="服务类型，如 OpenAI / OSS / 学校平台" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          <input className={styles.input} aria-label="账号名称" placeholder="账号名称" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <input className={styles.input} aria-label="账号标识" placeholder="账号标识，如邮箱、应用 ID" value={form.accountIdentifier} onChange={(e) => setForm({ ...form, accountIdentifier: e.target.value })} />
          <input className={styles.input} aria-label="密钥引用" placeholder="密钥引用，如环境变量名，不填明文密钥" value={form.secretRef} onChange={(e) => setForm({ ...form, secretRef: e.target.value })} />
          <select className={styles.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">启用</option>
            <option value="paused">暂停</option>
          </select>
        </div>
        <textarea className={styles.textarea} aria-label="备注" placeholder="备注" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="button" className={styles.primaryBtn} onClick={handleSave}>保存集成账号</button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardKicker}>ACCOUNTS</span>
          <h2 className={styles.cardTitle}>已配置账号</h2>
        </div>
        {loading ? <div className={styles.loading}>集成加载中…</div> : (
          <div className={styles.policyList}>
            {list.map((item) => (
              <div className={styles.policyItem} key={item.id}>
                <div>
                  <strong>{item.displayName}</strong>
                  <span>{item.provider} · {item.accountIdentifier || '未填写账号标识'}</span>
                  <small>密钥引用：{item.secretRef || '未配置'}</small>
                </div>
                <button type="button" className={styles.ghostBtn} onClick={() => void toggleStatus(item)}>
                  {item.status === 'active' ? '暂停' : '启用'}
                </button>
              </div>
            ))}
            {!list.length ? <div className={styles.empty}>暂无集成账号</div> : null}
          </div>
        )}
      </div>
    </section>
  );
}
