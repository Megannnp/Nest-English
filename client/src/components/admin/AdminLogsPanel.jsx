import { useCallback, useEffect, useState } from 'react';

import { fmtDateTime, fmtNumber } from './adminFormat.js';
import styles from './AdminPage.module.css';
import { fetchAdminOperationLogs } from '../../api/admin.js';

export default function AdminLogsPanel() {
  const [logs, setLogs] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdminOperationLogs({ page: nextPage, pageSize: pageInfo.pageSize });
      setLogs(res.list || []);
      setPageInfo({
        page: res.page || nextPage,
        pageSize: res.pageSize || pageInfo.pageSize,
        total: res.total || 0,
        totalPages: res.totalPages || 1,
      });
    } catch (err) {
      setError(err.message || '加载日志失败');
    } finally {
      setLoading(false);
    }
  }, [pageInfo.pageSize]);

  useEffect(() => {
    void loadLogs(1);
  }, [loadLogs]);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardKicker}>AUDIT LOGS</span>
        <h2 className={styles.cardTitle}>操作日志</h2>
      </div>
      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loading}>日志加载中…</div> : (
        <>
          <div className={styles.logList}>
            {logs.map((item) => (
              <div className={styles.logItem} key={item.id}>
                <div>
                  <strong>{item.action}</strong>
                  <span>{item.adminName} · {item.targetType || '系统'} {item.targetId || ''}</span>
                </div>
                <time>{fmtDateTime(item.createdAt)}</time>
              </div>
            ))}
            {!logs.length ? <div className={styles.empty}>暂无操作日志</div> : null}
          </div>
          <div className={styles.pagination}>
            <span>共 {fmtNumber(pageInfo.total)} 条，第 {pageInfo.page} / {pageInfo.totalPages} 页</span>
            <div className={styles.pageActions}>
              <button type="button" className={styles.ghostBtn} disabled={pageInfo.page <= 1} onClick={() => void loadLogs(pageInfo.page - 1)}>上一页</button>
              <button type="button" className={styles.ghostBtn} disabled={pageInfo.page >= pageInfo.totalPages} onClick={() => void loadLogs(pageInfo.page + 1)}>下一页</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
