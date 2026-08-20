import { useEffect, useState } from 'react';

import styles from './AdminPage.module.css';
import { fetchAdminSettings, saveAdminSetting } from '../../api/admin.js';

export default function AdminSettingsPanel() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSettings() {
    setLoading(true);
    setError('');
    try {
      setSettings(await fetchAdminSettings());
    } catch (err) {
      setError(err.message || '加载设置失败');
    } finally {
      setLoading(false);
    }
  }

  function updateSetting(item, patch = {}) {
    const next = { ...item, ...patch };
    setSettings((current) => current.map((setting) => (setting.key === item.key ? next : setting)));
  }

  async function handleSaveSetting(item) {
    setError('');
    try {
      await saveAdminSetting(item);
      await loadSettings();
    } catch (err) {
      setError(err.message || '保存设置失败');
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardKicker}>SETTINGS</span>
        <h2 className={styles.cardTitle}>系统设置</h2>
      </div>
      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loading}>设置加载中…</div> : (
        <div className={styles.settingsList}>
          {settings.map((item) => (
            <div className={styles.settingItem} key={item.key}>
              <div>
                <strong>{item.key}</strong>
                <span>{item.description || '自定义设置'}</span>
              </div>
              <select className={styles.input} value={item.valueType} onChange={(e) => updateSetting(item, { valueType: e.target.value })}>
                <option value="string">文本</option>
                <option value="number">数字</option>
                <option value="boolean">布尔</option>
                <option value="json">JSON</option>
              </select>
              <input className={styles.input} aria-label={`${item.key} 设置值`} value={item.value} onChange={(e) => updateSetting(item, { value: e.target.value })} />
              <button type="button" className={styles.primaryBtn} onClick={() => void handleSaveSetting(item)}>保存</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
