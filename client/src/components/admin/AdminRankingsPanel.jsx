import { fmtDateTime, fmtNumber } from './adminFormat.js';
import styles from './AdminPage.module.css';
import AdminProgressBar from './AdminProgressBar.jsx';

export default function AdminRankingsPanel({ dashboard, loading }) {
  if (loading) return <div className={styles.loading}>排行加载中…</div>;

  const teachers = dashboard?.rankings?.teachers || [];
  const classes = dashboard?.rankings?.classes || [];
  const maxTeacher = Math.max(1, ...teachers.map((item) => Number(item.writingCount || 0)));
  const maxClass = Math.max(1, ...classes.map((item) => Number(item.writingCount || 0)));

  return (
    <section className={styles.dashboardGrid}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardKicker}>TEACHERS</span>
          <h2 className={styles.cardTitle}>教师活跃度排行</h2>
        </div>
        <div className={styles.rankList}>
          {teachers.length ? teachers.map((item, index) => (
            <div className={styles.rankItem} key={item.id}>
              <span className={styles.rankIndex}>{index + 1}</span>
              <div className={styles.rankMain}>
                <div className={styles.rankTitle}>{item.name}</div>
                <div className={styles.rankMeta}>
                  {fmtNumber(item.classCount)} 个班级 · 最近活跃 {fmtDateTime(item.lastActiveAt)}
                </div>
                <AdminProgressBar value={item.writingCount} max={maxTeacher} />
              </div>
              <strong className={styles.rankValue}>{fmtNumber(item.writingCount)}</strong>
            </div>
          )) : <div className={styles.empty}>暂无教师数据</div>}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardKicker}>CLASSES</span>
          <h2 className={styles.cardTitle}>班级活跃度排行</h2>
        </div>
        <div className={styles.rankList}>
          {classes.length ? classes.map((item, index) => (
            <div className={styles.rankItem} key={item.id}>
              <span className={styles.rankIndex}>{index + 1}</span>
              <div className={styles.rankMain}>
                <div className={styles.rankTitle}>{item.name}</div>
                <div className={styles.rankMeta}>
                  {item.teacherName || '未绑定教师'} · {fmtNumber(item.studentCount)} 名学生
                </div>
                <AdminProgressBar value={item.writingCount} max={maxClass} />
              </div>
              <strong className={styles.rankValue}>{fmtNumber(item.writingCount)}</strong>
            </div>
          )) : <div className={styles.empty}>暂无班级数据</div>}
        </div>
      </div>
    </section>
  );
}
