import styles from './AdminPage.module.css';

export default function AdminQuestionDeleteModal({ target, onCancel, onConfirm }) {
  if (!target) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button type="button" aria-label="取消删除题目" onClick={onCancel} style={{ position: 'fixed', inset: 0, border: 0, background: 'rgba(0,0,0,0.35)' }} />
      <div className={styles.card} style={{ maxWidth: 420, width: '90%', padding: 24, position: 'relative' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--color-text)' }}>确认删除题目</h3>
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          即将删除「<strong>{target.title}</strong>」
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
          删除后题目将标记为「已删除」并从列表中隐藏。如需暂时下线，建议改用「禁用」。
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button type="button" className={styles.ghostBtn} onClick={onCancel}>取消</button>
          <button type="button" className={styles.primaryBtn} style={{ background: '#8a2d2d', borderColor: '#8a2d2d' }} onClick={() => onConfirm(target)}>确认删除</button>
        </div>
      </div>
    </div>
  );
}
