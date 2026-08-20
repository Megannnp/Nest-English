import styles from './AdminPage.module.css';

export default function AdminProgressBar({ value, max }) {
  const width = max > 0 ? Math.max(4, Math.round((Number(value || 0) / max) * 100)) : 0;
  return (
    <div className={styles.progressTrack}>
      <span className={styles.progressFill} style={{ width: `${width}%` }} />
    </div>
  );
}
