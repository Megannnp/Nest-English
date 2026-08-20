import { useCallback, useEffect, useState } from 'react';

import { fmtDateTime } from './adminFormat.js';
import styles from './AdminPage.module.css';
import {
  closeAdminPaymentOrder,
  confirmAdminPaymentOrder,
  failAdminPaymentOrder,
  fetchAdminPaymentOrders,
  refundAdminPaymentOrder,
} from '../../api/admin.js';
import { useConfirmDialog } from '../../hooks/useConfirmDialog.js';
import ConfirmDialog from '../shared/ConfirmDialog.jsx';

const STATUS_FILTERS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待确认' },
  { value: 'paid', label: '已支付' },
  { value: 'closed', label: '已关闭' },
  { value: 'failed', label: '失败' },
  { value: 'refunded', label: '已退款' },
];

const STATUS_LABELS = {
  pending: '待支付/待确认',
  paid: '已支付',
  closed: '已关闭',
  failed: '支付失败',
  refunded: '已退款',
};

const STATUS_STYLE = {
  pending: 'pending',
  paid: 'approved',
  closed: 'rejected',
  failed: 'rejected',
  refunded: 'rejected',
};

function fmtMoney(cents) {
  return `¥${(Number(cents || 0) / 100).toFixed(2).replace(/\.00$/, '')}`;
}

function customerLabel(order) {
  return order.userRealName || order.userEmail || order.userPhone || order.userAccountCode || order.userId || '未知用户';
}

function getSummaryStatus(summary, status) {
  return summary?.byStatus?.[status] || { count: 0, amountCents: 0 };
}

function PaymentSummary({ summary }) {
  const pending = getSummaryStatus(summary, 'pending');
  const paid = getSummaryStatus(summary, 'paid');
  const closed = getSummaryStatus(summary, 'closed');
  const refunded = getSummaryStatus(summary, 'refunded');
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <span>待确认金额</span>
        <strong>{fmtMoney(pending.amountCents)}</strong>
        <small>{pending.count} 单待核对</small>
      </div>
      <div className={styles.statCard}>
        <span>已支付金额</span>
        <strong>{fmtMoney(paid.amountCents)}</strong>
        <small>{paid.count} 单已发放</small>
      </div>
      <div className={styles.statCard}>
        <span>关闭订单</span>
        <strong>{closed.count}</strong>
        <small>{fmtMoney(closed.amountCents)}</small>
      </div>
      <div className={styles.statCard}>
        <span>退款订单</span>
        <strong>{refunded.count}</strong>
        <small>{fmtMoney(refunded.amountCents)}</small>
      </div>
    </div>
  );
}

export default function AdminPaymentOrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ totalCount: 0, totalAmountCents: 0, byStatus: {} });
  const [status, setStatus] = useState('pending');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const { confirmState, requestConfirm, respondConfirm } = useConfirmDialog();

  const loadOrders = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdminPaymentOrders({
        page: nextPage,
        pageSize: pageInfo.pageSize,
        status,
        keyword: keyword.trim(),
      });
      setOrders(res.list || []);
      setPageInfo({
        page: res.page || nextPage,
        pageSize: res.pageSize || pageInfo.pageSize,
        total: res.total || 0,
        totalPages: res.totalPages || 1,
      });
      setSummary(res.summary || { totalCount: 0, totalAmountCents: 0, byStatus: {} });
    } catch (err) {
      setError(err.message || '加载订单失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, pageInfo.pageSize, status]);

  useEffect(() => {
    void loadOrders(1);
  }, [loadOrders]);

  async function handleConfirm(order) {
    const ok = await requestConfirm(`确认「${customerLabel(order)}」的 ${order.productLabel} 已到账？确认后会立即发放会员或加油包权益。`);
    if (!ok) return;
    setActionId(order.id);
    setError('');
    setActionMessage('');
    try {
      const result = await confirmAdminPaymentOrder(order.id);
      setActionMessage(
        result?.status === 'paid'
          ? '订单已确认，会员或加油包权益已发放。'
          : '订单已过期并自动关闭，未发放权益。'
      );
      await loadOrders(pageInfo.page);
    } catch (err) {
      setError(err.message || '确认订单失败');
    } finally {
      setActionId('');
    }
  }

  async function handleClose(order) {
    const ok = await requestConfirm(`确认关闭订单 ${order.id}？关闭后用户需要重新下单。`);
    if (!ok) return;
    setActionId(order.id);
    setError('');
    setActionMessage('');
    try {
      await closeAdminPaymentOrder(order.id);
      setActionMessage('订单已关闭，用户需要重新下单。');
      await loadOrders(pageInfo.page);
    } catch (err) {
      setError(err.message || '关闭订单失败');
    } finally {
      setActionId('');
    }
  }

  async function handleFail(order) {
    const ok = await requestConfirm(`确认将订单 ${order.id} 标记为异常？该订单不会发放权益，用户需要重新下单或联系客服。`);
    if (!ok) return;
    setActionId(order.id);
    setError('');
    setActionMessage('');
    try {
      await failAdminPaymentOrder(order.id);
      setActionMessage('订单已标记异常，未发放权益。');
      await loadOrders(pageInfo.page);
    } catch (err) {
      setError(err.message || '标记异常失败');
    } finally {
      setActionId('');
    }
  }

  async function handleRefund(order) {
    const ok = await requestConfirm(`确认将订单 ${order.id} 标记为已退款？这只记录人工退款结果，不会自动回收已发放权益。`);
    if (!ok) return;
    setActionId(order.id);
    setError('');
    setActionMessage('');
    try {
      await refundAdminPaymentOrder(order.id);
      setActionMessage('订单已标记退款，请确认线下退款和权益处理已完成。');
      await loadOrders(pageInfo.page);
    } catch (err) {
      setError(err.message || '标记退款失败');
    } finally {
      setActionId('');
    }
  }

  return (
    <>
      <ConfirmDialog state={confirmState} onRespond={respondConfirm} />
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardKicker}>PAYMENT ORDERS</span>
          <h2 className={styles.cardTitle}>订单管理</h2>
        </div>
        {error ? <div className={styles.errorBanner}>{error}</div> : null}
        {actionMessage ? <div className={styles.infoBanner}>{actionMessage}</div> : null}

        <div className={styles.userToolbar}>
          <div className={styles.dataScopeNote}>
            用于人工二维码收款阶段：核对到账后点击确认，系统会自动发放对应会员权益或加油包。
          </div>
          <div className={styles.searchBox}>
            <input
              className={styles.input}
              aria-label="搜索支付订单"
              placeholder="搜索订单号、商品、姓名、邮箱、手机号、账号编号"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void loadOrders(1); }}
            />
            <button type="button" className={styles.primaryBtn} onClick={() => void loadOrders(1)}>搜索</button>
          </div>
          <div className={styles.filterRow}>
            {STATUS_FILTERS.map((item) => (
              <button
                type="button"
                key={item.value}
                className={`${styles.filterBtn} ${status === item.value ? styles.filterActive : ''}`}
                onClick={() => setStatus(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>订单加载中…</div>
        ) : (
          <>
            <PaymentSummary summary={summary} />
            <div className={styles.userTableWrap}>
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th>订单</th>
                    <th>用户</th>
                    <th>商品</th>
                    <th>金额</th>
                    <th>状态</th>
                    <th>时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td data-label="订单">
                        <div className={styles.userCellTitle}>{order.id}</div>
                        <div className={styles.userCellMeta}>{order.paymentMethod === 'manual_qr' ? '人工二维码' : order.paymentMethod}</div>
                      </td>
                      <td data-label="用户">
                        <div className={styles.userCellTitle}>{customerLabel(order)}</div>
                        <div className={styles.userCellMeta}>{order.userEmail || order.userPhone || order.userAccountCode || order.userId}</div>
                      </td>
                      <td data-label="商品">
                        <div className={styles.userCellTitle}>{order.productLabel}</div>
                        <div className={styles.userCellMeta}>{order.productCode}</div>
                      </td>
                      <td data-label="金额">{fmtMoney(order.amountCents)}</td>
                      <td data-label="状态">
                        <span className={`${styles.statusBadge} ${styles[STATUS_STYLE[order.status] || 'rejected']}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td data-label="时间">
                        <div>{fmtDateTime(order.createdAt)}</div>
                        {order.expiresAt ? <div className={styles.userCellMeta}>有效至 {fmtDateTime(order.expiresAt)}</div> : null}
                      </td>
                      <td data-label="操作">
                        <div className={styles.tableActions}>
                          {order.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                className={styles.replyBtn}
                                disabled={actionId === order.id}
                                onClick={() => void handleConfirm(order)}
                              >
                                确认到账
                              </button>
                              <button
                                type="button"
                                className={styles.deleteBtn}
                                disabled={actionId === order.id}
                                onClick={() => void handleFail(order)}
                              >
                                标记异常
                              </button>
                              <button
                                type="button"
                                className={styles.deleteBtn}
                                disabled={actionId === order.id}
                                onClick={() => void handleClose(order)}
                              >
                                关闭
                              </button>
                            </>
                          ) : order.status === 'paid' ? (
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              disabled={actionId === order.id}
                              onClick={() => void handleRefund(order)}
                            >
                              标记退款
                            </button>
                          ) : (
                            <span className={styles.userCellMeta}>无需操作</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!orders.length && <div className={styles.empty}>没有匹配的订单</div>}
            </div>

            <div className={styles.pagination}>
              <span>共 {pageInfo.total} 单，第 {pageInfo.page} / {pageInfo.totalPages} 页</span>
              <div className={styles.pageActions}>
                <button type="button" className={styles.ghostBtn} disabled={pageInfo.page <= 1} onClick={() => void loadOrders(pageInfo.page - 1)}>上一页</button>
                <button type="button" className={styles.ghostBtn} disabled={pageInfo.page >= pageInfo.totalPages} onClick={() => void loadOrders(pageInfo.page + 1)}>下一页</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
