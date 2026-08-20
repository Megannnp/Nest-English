import { useCallback, useEffect, useState } from 'react';


import { fmtDateTime, fmtNumber } from './adminFormat.js';
import styles from './AdminPage.module.css';
import {
  fetchAdminUserDetail,
  fetchAdminUsers,
  updateAdminUserStatus,
} from '../../api/admin.js';
import { useConfirmDialog } from '../../hooks/useConfirmDialog.js';
import ConfirmDialog from '../shared/ConfirmDialog.jsx';

function roleLabel(role) {
  if (role === 'teacher') return '教师';
  if (role === 'parent') return '家长';
  if (role === 'student') return '学生';
  return '用户';
}

function UserDetailSummary({ user }) {
  return (
    <div className={styles.detailGrid}>
      <div><span>角色</span><strong>{roleLabel(user.role)}</strong></div>
      <div><span>状态</span><strong>{user.isDisabled ? '已禁用' : '正常'}</strong></div>
      <div><span>账号编号</span><strong>{user.accountCode || '暂无'}</strong></div>
      <div><span>注册时间</span><strong>{fmtDateTime(user.createdAt)}</strong></div>
      <div><span>邮箱</span><strong>{user.email || '暂无'}</strong></div>
      <div><span>手机号</span><strong>{user.phone || '暂无'}</strong></div>
      <div><span>班级</span><strong>{user.className || '暂无'}</strong></div>
      <div><span>作文数</span><strong>{fmtNumber(user.writingCount)}</strong></div>
      {user.role === 'teacher' && (
        <>
          <div><span>管理班级</span><strong>{fmtNumber(user.classCount)}</strong></div>
          <div><span>覆盖学生</span><strong>{fmtNumber(user.teacherStudentCount)}</strong></div>
        </>
      )}
    </div>
  );
}

function DetailLinesSection({ title, items, emptyText, getKey, renderLabel, renderValue }) {
  return (
    <div className={styles.detailSection}>
      <h3>{title}</h3>
      {items?.length ? items.map((item) => (
        <div className={styles.detailLine} key={getKey(item)}>
          <span>{renderLabel(item)}</span>
          <strong>{renderValue(item)}</strong>
        </div>
      )) : <div className={styles.emptySmall}>{emptyText}</div>}
    </div>
  );
}

function UserStatusToggleButton({ user, onToggleStatus }) {
  if (user.isAdmin) return null;

  return (
    <button type="button"
      className={user.isDisabled ? styles.replyBtn : styles.deleteBtn}
      onClick={() => onToggleStatus(user)}
    >
      {user.isDisabled ? '启用用户' : '禁用用户'}
    </button>
  );
}

function UserDetailPanel({ user, loading, onClose, onToggleStatus }) {
  if (!user && !loading) return null;
  return (
    <aside className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div>
          <span className={styles.cardKicker}>USER DETAIL</span>
          <h2 className={styles.cardTitle}>{loading ? '用户详情' : user.realName || user.email}</h2>
        </div>
        <button type="button" className={styles.closeBtn} onClick={onClose}>关闭</button>
      </div>
      {loading ? (
        <div className={styles.loading}>详情加载中…</div>
      ) : (
        <>
          <UserDetailSummary user={user} />
          <DetailLinesSection
            title="AI 使用"
            items={user.aiUsage}
            emptyText="暂无 AI 使用记录"
            getKey={(item) => item.scope}
            renderLabel={(item) => item.label}
            renderValue={(item) => fmtNumber(item.total)}
          />
          <DetailLinesSection
            title="最近作文"
            items={user.recentWritings}
            emptyText="暂无作文记录"
            getKey={(item) => item.id}
            renderLabel={(item) => item.title}
            renderValue={(item) => fmtDateTime(item.createdAt)}
          />
          <UserStatusToggleButton user={user} onToggleStatus={onToggleStatus} />
        </>
      )}
    </aside>
  );
}

export default function UserManagementPanel({ includeTestData }) {
  const [users, setUsers] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pageSize: 12, total: 0, totalPages: 1 });
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const { confirmState, requestConfirm, respondConfirm } = useConfirmDialog();

  const loadUsers = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdminUsers({
        page: nextPage,
        pageSize: pageInfo.pageSize,
        role,
        status,
        keyword: keyword.trim(),
        includeTestData,
      });
      setUsers(res.list || []);
      setPageInfo({
        page: res.page || nextPage,
        pageSize: res.pageSize || pageInfo.pageSize,
        total: res.total || 0,
        totalPages: res.totalPages || 1,
      });
    } catch (err) {
      setError(err.message || '加载用户失败');
    } finally {
      setLoading(false);
    }
  }, [includeTestData, keyword, pageInfo.pageSize, role, status]);

  async function openDetail(userId) {
    setDetailLoading(true);
    setError('');
    try {
      const res = await fetchAdminUserDetail(userId);
      setDetail(res);
    } catch (err) {
      setError(err.message || '加载详情失败');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleToggleStatus(user) {
    const nextDisabled = !user.isDisabled;
    if (nextDisabled) {
      const ok = await requestConfirm(`确认禁用「${user.realName || user.email}」？`);
      if (!ok) return;
    }
    setError('');
    try {
      const updated = await updateAdminUserStatus(user.id, nextDisabled);
      setDetail(updated);
      await loadUsers(pageInfo.page);
    } catch (err) {
      setError(err.message || '操作失败');
    }
  }

  useEffect(() => {
    void loadUsers(1);
  }, [loadUsers]);

  const roleFilters = [
    { value: '', label: '全部' },
    { value: 'teacher', label: '教师' },
    { value: 'student', label: '学生' },
    { value: 'parent', label: '家长' },
  ];

  return (
    <>
      <ConfirmDialog state={confirmState} onRespond={respondConfirm} />
      <section className={`${styles.usersLayout} ${detail || detailLoading ? '' : styles.fullUsersLayout}`}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardKicker}>USER MANAGEMENT</span>
          <h2 className={styles.cardTitle}>用户管理</h2>
        </div>
        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        <div className={styles.userToolbar}>
          <div className={styles.dataScopeNote}>
            当前{includeTestData ? '包含测试账号和测试班级' : '已隐藏测试账号和测试班级'}。
          </div>
          <div className={styles.searchBox}>
            <input
              className={styles.input}
              aria-label="搜索用户"
              placeholder="搜索姓名、邮箱、手机号、编号、班级"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void loadUsers(1); }}
            />
            <button type="button" className={styles.primaryBtn} onClick={() => void loadUsers(1)}>搜索</button>
          </div>
          <div className={styles.filterRow}>
            {roleFilters.map((item) => (
              <button type="button"
                key={item.value}
                className={`${styles.filterBtn} ${role === item.value && !status ? styles.filterActive : ''}`}
                onClick={() => { setStatus(''); setRole(item.value); }}
              >
                {item.label}
              </button>
            ))}
            <button type="button"
              className={`${styles.filterBtn} ${status === 'disabled' ? styles.filterActive : ''}`}
              onClick={() => { setRole(''); setStatus('disabled'); }}
            >
              已禁用
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>用户加载中…</div>
        ) : (
          <>
            <div className={styles.userTableWrap}>
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th>用户</th>
                    <th>角色</th>
                    <th>班级</th>
                    <th>作文</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td data-label="用户">
                        <div className={styles.userCellTitle}>{item.realName || item.email}</div>
                        <div className={styles.userCellMeta}>{item.email || item.phone || item.accountCode}</div>
                      </td>
                      <td data-label="角色">{item.roleLabel}</td>
                      <td data-label="班级">{item.className || (item.classCount ? `${item.classCount} 个班级` : '暂无')}</td>
                      <td data-label="作文">{fmtNumber(item.writingCount)}</td>
                      <td data-label="状态">
                        <span className={`${styles.statusBadge} ${item.isDisabled ? styles.rejected : styles.approved}`}>
                          {item.isDisabled ? '已禁用' : '正常'}
                        </span>
                      </td>
                      <td data-label="操作">
                        <div className={styles.tableActions}>
                          <button type="button" className={styles.replyBtn} onClick={() => void openDetail(item.id)}>详情</button>
                          {!item.isAdmin && (
                            <button type="button"
                              className={item.isDisabled ? styles.replyBtn : styles.deleteBtn}
                              onClick={() => void handleToggleStatus(item)}
                            >
                              {item.isDisabled ? '启用' : '禁用'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length && <div className={styles.empty}>没有匹配的用户</div>}
            </div>

            <div className={styles.pagination}>
              <span>共 {fmtNumber(pageInfo.total)} 人，第 {pageInfo.page} / {pageInfo.totalPages} 页</span>
              <div className={styles.pageActions}>
                <button type="button" className={styles.ghostBtn} disabled={pageInfo.page <= 1} onClick={() => void loadUsers(pageInfo.page - 1)}>上一页</button>
                <button type="button" className={styles.ghostBtn} disabled={pageInfo.page >= pageInfo.totalPages} onClick={() => void loadUsers(pageInfo.page + 1)}>下一页</button>
              </div>
            </div>
          </>
        )}
      </div>

      <UserDetailPanel
        user={detail}
        loading={detailLoading}
        onClose={() => setDetail(null)}
        onToggleStatus={handleToggleStatus}
      />
    </section>
    </>
  );
}
