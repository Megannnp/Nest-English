import { useState } from 'react';

import styles from './AdminPage.module.css';
import { generateAdminAudio } from '../../api/admin.js';

const EMPTY_FORM = {
  text: '',
  speed: '1',
};

export default function AdminAudioGeneratorPanel() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await generateAdminAudio({
        englishText: form.text,
        speed: Number(form.speed) || 1,
      });
      setItems(result?.items || []);
      setNotice('音频已生成');
    } catch (err) {
      setError(err.message || '音频生成失败');
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl(url) {
    const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
    await navigator.clipboard.writeText(fullUrl);
    setNotice('音频 URL 已复制');
  }

  return (
    <section className={styles.dashboardGrid}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardKicker}>AUDIO</span>
          <h2 className={styles.cardTitle}>语音生成</h2>
        </div>
        {error ? <div className={styles.errorBanner}>{error}</div> : null}
        {notice ? <div className={styles.infoBanner}>{notice}</div> : null}
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="admin-audio-text">朗读文段</label>
          <textarea
            id="admin-audio-text"
            className={styles.textarea}
            rows={10}
            value={form.text}
            onChange={(event) => updateForm('text', event.target.value)}
            placeholder="输入中英文和音标夹杂的文段，可用 [pause] / [pause:1.5s] 添加停顿"
          />
        </div>
        <label className={styles.formGroup} htmlFor="admin-audio-speed">
          <span className={styles.label}>语速</span>
          <select
            id="admin-audio-speed"
            className={styles.input}
            value={form.speed}
            onChange={(event) => updateForm('speed', event.target.value)}
          >
            <option value="0.75">慢速</option>
            <option value="1">正常</option>
            <option value="1.2">快速</option>
          </select>
        </label>
        <button type="button" className={styles.primaryBtn} aria-label={loading ? '生成中' : '生成音频'} onClick={handleGenerate} disabled={loading}>
          {loading ? '生成中…' : '生成音频'}
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardKicker}>RESULTS</span>
          <h2 className={styles.cardTitle}>生成结果</h2>
        </div>
        <div className={styles.policyList}>
          {items.map((item) => (
            <div className={styles.policyItem} key={item.type}>
              <div>
                <strong>{item.label}</strong>
                <span>{item.url}</span>
                <audio controls src={item.previewUrl || item.url} style={{ width: '100%', marginTop: 8 }} />
              </div>
              <div className={styles.audioActions}>
                <button type="button" className={styles.ghostBtn} onClick={() => void copyUrl(item.url)}>
                  复制 URL
                </button>
                <a className={styles.ghostBtn} href={item.url} download={`${item.type}.mp3`}>
                  下载 MP3
                </a>
              </div>
            </div>
          ))}
          {!items.length ? <div className={styles.empty}>生成后可在这里预听并复制 URL。</div> : null}
        </div>
      </div>
    </section>
  );
}
