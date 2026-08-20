import { fmtNumber } from './adminFormat.js';
import styles from './AdminPage.module.css';
import AdminProgressBar from './AdminProgressBar.jsx';

export default function AdminDashboardPanel({
  dashboard,
  loading,
  onRefresh,
  includeTestData,
  onToggleTestData,
}) {
  if (loading) return <div className={styles.loading}>数据加载中…</div>;
  if (!dashboard) {
    return (
      <div className={styles.card}>
        <div className={styles.empty}>暂时没有统计数据</div>
      </div>
    );
  }

  const metrics = [
    {
      label: '用户数',
      value: dashboard.overview?.users,
      hint: `教师 ${fmtNumber(dashboard.overview?.teachers)} · 学生 ${fmtNumber(dashboard.overview?.students)}`,
    },
    { label: '作文数', value: dashboard.overview?.writings, hint: '已提交作文总量' },
    { label: '班级数', value: dashboard.overview?.classes, hint: '已创建班级' },
    { label: 'AI 调用量', value: dashboard.overview?.aiCalls, hint: '批改与分析任务' },
  ];
  const maxSubmissions = Math.max(1, ...dashboard.submissions7d.map((item) => Number(item.count || 0)));
  const maxAi = Math.max(1, ...dashboard.aiUsage.map((item) => Number(item.total || 0)));

  return (
    <>
      <section className={styles.dashboardHero}>
        <div>
          <span className={styles.cardKicker}>ADMIN OVERVIEW</span>
          <h1 className={styles.pageTitle}>数据总览</h1>
          <p className={styles.pageHint}>用户、作文、班级和 AI 使用情况集中在这里。</p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.switchLine}>
            <input
              type="checkbox"
              checked={includeTestData}
              onChange={(e) => onToggleTestData(e.target.checked)}
            />
            显示测试数据
          </label>
          <button type="button" className={styles.ghostBtn} onClick={onRefresh}>刷新数据</button>
        </div>
      </section>

      <section className={styles.metricGrid}>
        {metrics.map((item) => (
          <div key={item.label} className={styles.metricCard}>
            <span className={styles.metricLabel}>{item.label}</span>
            <strong className={styles.metricValue}>{fmtNumber(item.value)}</strong>
            <span className={styles.metricHint}>{item.hint}</span>
          </div>
        ))}
      </section>

      <section className={styles.dashboardGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardKicker}>LAST 7 DAYS</span>
            <h2 className={styles.cardTitle}>近 7 日提交趋势</h2>
          </div>
          <div className={styles.columnChart}>
            {dashboard.submissions7d.map((item) => (
              <div className={styles.columnItem} key={item.date}>
                <div className={styles.columnValue}>{fmtNumber(item.count)}</div>
                <div className={styles.columnTrack}>
                  <span
                    className={styles.columnBar}
                    style={{ height: `${Math.max(6, Math.round((Number(item.count || 0) / maxSubmissions) * 100))}%` }}
                  />
                </div>
                <div className={styles.columnLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardKicker}>AI USAGE</span>
            <h2 className={styles.cardTitle}>AI 各功能使用量</h2>
          </div>
          <div className={styles.barList}>
            {dashboard.aiUsage.length ? dashboard.aiUsage.map((item) => (
              <div className={styles.barItem} key={item.scope}>
                <div className={styles.barMeta}>
                  <span>{item.label}</span>
                  <strong>{fmtNumber(item.total)}</strong>
                </div>
                <AdminProgressBar value={item.total} max={maxAi} />
              </div>
            )) : <div className={styles.empty}>暂无 AI 调用记录</div>}
          </div>
        </div>
      </section>
    </>
  );
}
