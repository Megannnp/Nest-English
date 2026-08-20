import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AnnouncementList,
  MessageList,
  PublishForm,
} from './AdminCommunicationPanels.jsx';
import styles from './AdminPage.module.css';
import AdminStandalonePage from './AdminStandalonePage.jsx';
import { fetchAdminAnnouncements, fetchAdminMessages } from '../../api/admin.js';

/**
 * Merged "消息中心" page — combines user messages (inbox) and system
 * announcements (outbox) into a single standalone page accessible from
 * the top bar Row 1.
 */
export default function AdminMessageCenterPage() {
  const [subTab, setSubTab] = useState('messages');
  const [messages, setMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [msgFilter, setMsgFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetchAdminMessages(msgFilter);
      setMessages(Array.isArray(res) ? res : (res?.list ?? []));
    } catch {
      setMessages([]);
    }
  }, [msgFilter]);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await fetchAdminAnnouncements();
      setAnnouncements(Array.isArray(res) ? res : (res?.data ?? []));
    } catch {
      setAnnouncements([]);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadMessages(), loadAnnouncements()]).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    void loadMessages();
  }, [loadMessages]);

  const pendingCount = messages.filter((m) => m.status === 'pending').length;

  if (loading) {
    return (
      <AdminStandalonePage title="消息中心">
        <div className={styles.loading}>加载中…</div>
      </AdminStandalonePage>
    );
  }

  return (
    <AdminStandalonePage title="消息中心">
      {/* Sub-tab toggle */}
      <div className={styles.subTabBar}>
        <button
          type="button"
          className={`${styles.subTab} ${subTab === 'messages' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('messages')}
        >
          用户留言
          {pendingCount > 0 && <span className={styles.subTabBadge}>{pendingCount}</span>}
        </button>
        <button
          type="button"
          className={`${styles.subTab} ${subTab === 'announcements' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('announcements')}
        >
          系统公告
        </button>
      </div>

      {subTab === 'messages' ? (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardKicker}>用户留言</span>
            <h2 className={styles.cardTitle}>留言列表</h2>
          </div>
          <div className={styles.filterRow}>
            {['', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                type="button"
                key={status}
                className={`${styles.filterBtn} ${msgFilter === status ? styles.filterActive : ''}`}
                onClick={() => setMsgFilter(status)}
              >
                {status === '' ? '全部' : status === 'pending' ? '待处理' : status === 'approved' ? '已回复' : '已拒绝'}
              </button>
            ))}
          </div>
          <MessageList list={messages} onUpdate={loadMessages} />
        </div>
      ) : (
        <>
          <PublishForm onPublished={loadAnnouncements} />
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardKicker}>已发布公告</span>
              <h2 className={styles.cardTitle}>全部公告列表</h2>
            </div>
            <AnnouncementList list={announcements} onDelete={loadAnnouncements} />
          </div>
        </>
      )}
    </AdminStandalonePage>
  );
}
