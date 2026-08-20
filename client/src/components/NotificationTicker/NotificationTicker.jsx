/**
 * client/src/components/NotificationTicker/NotificationTicker.jsx
 *
 * 用法：在 GuestHomePage 或 App 壳层底部引入：
 *   <NotificationTicker userId={currentUser?.id ?? null} />
 *
 * Props：
 *   userId   {number|null}  已登录用户 ID
 *   isGuest  {boolean}      未登录访客：仍可留言，以本机匿名 ID 关联
 */

import { useState, useEffect, useRef, useCallback } from 'react';


import styles from './NotificationTicker.module.css';
import {
  fetchTickerData,
  fetchAnnouncement,
  fetchMyMessages,
  submitMessage,
  getFileDownloadUrl,
} from '../../api/announcements.js';
import { getOrCreateGuestId } from '../../utils/guestId.js';
import { parseMarkdown } from '../../utils/markdown.js';
import AppIcon from '../shared/AppIcon.jsx';

// ─── 工具 ─────────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const MOBILE_LAUNCHER_WIDTH = 56;
const MOBILE_LAUNCHER_HEIGHT = 56;
const MOBILE_LAUNCHER_MARGIN = 12;
const MOBILE_NAV_CLEARANCE = 148;
const MOBILE_LAUNCHER_EDGE_HIDDEN = 10;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getLauncherCornerPositions() {
  if (typeof window === 'undefined') return [];
  const left = -MOBILE_LAUNCHER_EDGE_HIDDEN;
  const right = window.innerWidth - MOBILE_LAUNCHER_WIDTH + MOBILE_LAUNCHER_EDGE_HIDDEN;
  const top = MOBILE_LAUNCHER_MARGIN;
  const bottom = window.innerHeight - MOBILE_NAV_CLEARANCE - MOBILE_LAUNCHER_HEIGHT;
  return [
    { x: left, y: top, edge: 'left' },
    { x: right, y: top, edge: 'right' },
    { x: left, y: bottom, edge: 'left' },
    { x: right, y: bottom, edge: 'right' },
  ];
}

// ─── 子组件：通知列表行 ──────────────────────────────────────────────────────

function NotifRow({ item, onOpen }) {
  const isOwn = item._type === 'message';
  return (
    <button type="button" className={styles.notifRow} onClick={() => onOpen(item)}>
      <div className={styles.nrTop}>
        <span className={`${styles.nrBadge} ${isOwn ? styles.mine : ''}`}>
          {isOwn ? '我的留言' : '系统公告'}
        </span>
        <span className={styles.nrTitle}>{item.title ?? item.content}</span>
        <span className={styles.nrTime}>{fmtDate(item.created_at)}</span>
      </div>
      <div className={styles.nrPreview}>
        {item.body ?? item.content}
      </div>
      {item.file_name && (
        <span className={styles.nrFile}>📎 {item.file_name}</span>
      )}
      {isOwn && item.reply && (
        <span className={styles.nrHasReply}>已有回复</span>
      )}
    </button>
  );
}

// ─── 子组件：详情视图 ────────────────────────────────────────────────────────

function DetailView({ item, onBack }) {
  const isOwn = item._type === 'message';
  const bodyHtml = !isOwn && item.body ? parseMarkdown(item.body) : '';

  function handleDownload() {
    window.open(getFileDownloadUrl(item.id), '_blank', 'noopener');
  }

  return (
    <div className={styles.detailWrap}>
      <button type="button" className={styles.detailBack} onClick={onBack}>← 返回</button>

      <div className={styles.detailMeta}>
        <span className={`${styles.nrBadge} ${isOwn ? styles.mine : ''}`}>
          {isOwn ? '我的留言' : '系统公告'}
        </span>
        <span className={styles.detailDate}>{fmtDate(item.created_at)}</span>
      </div>

      <div className={styles.detailTitle}>
        {item.title ?? '留言'}
      </div>

      {bodyHtml ? (
        <div
          className={`${styles.detailBody} ${styles.mdContent}`}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : (
        <div className={styles.detailBody}>
          {item.body ?? item.content}
        </div>
      )}

      {/* 附件下载 */}
      {item.file_name && (
        <div className={styles.fileCard}>
          <div className={styles.fileIcon}><AppIcon name="file-text" size={20} /></div>
          <div className={styles.fileInfo}>
            <div className={styles.fileName}>{item.file_name}</div>
            {item.file_size && (
              <div className={styles.fileSize}>{fmtFileSize(item.file_size)}</div>
            )}
          </div>
          <button type="button" className={styles.fileDl} onClick={handleDownload}>下载</button>
        </div>
      )}

      {/* 开发回复（仅留言有） */}
      {isOwn && item.reply && (
        <div className={styles.replyCard}>
          <div className={styles.replyLabel}>开发回复</div>
          <div className={styles.replyBody}>{item.reply}</div>
        </div>
      )}

      {/* 留言状态（审核中） */}
      {isOwn && !item.reply && item.status === 'pending' && (
        <div className={styles.pendingNote}>留言已收到，开发会尽快回复。</div>
      )}
    </div>
  );
}

// ─── 子组件：我的留言时间轴 ──────────────────────────────────────────────────

function MessagesTimeline({ messages }) {
  const [expanded, setExpanded] = useState(null);

  if (!messages.length) return null;

  const hasAnyReply = messages.some(m => m.reply);

  return (
    <div className={styles.msgTimeline}>
      <div className={styles.msgTimelineHeader}>
        我的留言
        {hasAnyReply && <span className={styles.msgTimelineReplyDot} />}
      </div>
      {messages.map(msg => {
        const isExpanded = expanded === msg.id;
        const hasReply = !!msg.reply;
        return (
          <button
            key={msg.id}
            type="button"
            className={styles.msgTimelineItem}
            onClick={() => setExpanded(isExpanded ? null : msg.id)}
          >
            <div className={styles.msgTimelineStem}>
              <div className={`${styles.msgTimelineDot} ${hasReply ? styles.msgTimelineDotReplied : ''}`} />
            </div>
            <div className={styles.msgTimelineBody}>
              <div className={styles.msgTimelineRow}>
                <span className={styles.msgTimelineDate}>{fmtDate(msg.created_at)}</span>
                {hasReply
                  ? <span className={styles.msgBadgeReplied}>已回复</span>
                  : <span className={styles.msgBadgePending}>待回复</span>
                }
                <span className={styles.msgTimelineChevron}>{isExpanded ? '▲' : '▼'}</span>
              </div>
              <div className={styles.msgTimelineText}>{msg.content}</div>
              {isExpanded && (
                <div className={styles.msgTimelineExpanded}>
                  {hasReply ? (
                    <>
                      <div className={styles.msgTimelineReplyLabel}>开发回复</div>
                      <div className={styles.msgTimelineReplyText}>{msg.reply}</div>
                    </>
                  ) : (
                    <div className={styles.msgTimelinePending}>留言已收到，开发会尽快回复。</div>
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function LeaveBar({ inputRef, submitMsg, leaveText, setLeaveText, handleKeyDown, submitting, handleSubmit }) {
  return (
    <div className={styles.leaveBar}>
      <input
        ref={inputRef}
        className={styles.leaveInput}
        type="text"
        placeholder={submitMsg || '提交问题或建议，开发会回复…'}
        value={leaveText}
        maxLength={200}
        onChange={e => setLeaveText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitting}
        aria-label="留言输入框"
      />
      <button type="button"
        className={styles.leaveBtn}
        onClick={handleSubmit}
        disabled={submitting || !leaveText.trim()}
        aria-label="提交留言"
      >
        {submitting ? '…' : submitMsg ? (submitMsg.includes('失败') ? '失败' : '已提交') : '留言'}
      </button>
    </div>
  );
}

function TickerPanelContent({ view, loading, announcements, myMessages, openDetail, activeItem, backToList }) {
  if (view === 'detail') {
    return (
      <div className={styles.rpList}>
        <DetailView item={activeItem} onBack={backToList} />
      </div>
    );
  }

  return (
    <div className={styles.rpList}>
      {loading && <div className={styles.rpEmpty}>加载中…</div>}
      {!loading && announcements.length === 0 && myMessages.length === 0 && (
        <div className={styles.rpEmpty}>暂无公告</div>
      )}
      {!loading && announcements.map(item => (
        <NotifRow key={`ann-${item.id}`} item={{ ...item, _type: 'announcement' }} onOpen={openDetail} />
      ))}
      {!loading && <MessagesTimeline messages={myMessages} />}
    </div>
  );
}

function MobileTickerWindow({
  open,
  panelRef,
  totalCount,
  handleMinimize,
  renderPanelContent,
  inputRef,
  submitMsg,
  leaveText,
  setLeaveText,
  handleKeyDown,
  submitting,
  handleSubmit,
}) {
  if (!open) return null;

  return (
    <div ref={panelRef} className={styles.mobileWindow} aria-label="系统公告悬浮窗">
      <div className={styles.mobileWindowHeader}>
        <div className={styles.mobileWindowTitle}>
          <span className={styles.tickerBadge}>系统公告</span>
          <span className={styles.mobileWindowCount}>{totalCount} 条</span>
        </div>
        <button type="button"
          className={styles.mobileWindowMinimize}
          onClick={handleMinimize}
          aria-label="最小化系统公告"
        >
          最小化
        </button>
      </div>

      <div className={styles.mobileWindowBody}>
        {renderPanelContent()}
      </div>

      <LeaveBar
        inputRef={inputRef}
        submitMsg={submitMsg}
        leaveText={leaveText}
        setLeaveText={setLeaveText}
        handleKeyDown={handleKeyDown}
        submitting={submitting}
        handleSubmit={handleSubmit}
      />
    </div>
  );
}

function MobileTickerLauncher({ minimized, launcherEdge, launcherPosition, handleRestore, handleLauncherPointerDown }) {
  if (!minimized) return null;
  const launcherStyle = launcherPosition.x === null
    ? undefined
    : { left: `${launcherPosition.x}px`, top: `${launcherPosition.y}px` };

  const isAtEdge = launcherEdge === 'left' || launcherEdge === 'right';

  return (
    <button type="button"
      className={`${styles.mobileLauncher} ${launcherEdge === 'left' ? styles.mobileLauncherEdgeLeft : ''} ${launcherEdge === 'right' ? styles.mobileLauncherEdgeRight : ''}`}
      style={launcherStyle}
      onClick={handleRestore}
      onPointerDown={handleLauncherPointerDown}
      aria-label="打开系统公告悬浮窗"
    >
      <span className={`${styles.mobileLauncherFace} ${isAtEdge ? styles.mobileLauncherFaceEdge : styles.mobileLauncherFaceCenter}`}>
        {isAtEdge ? '👀' : '😊'}
      </span>
    </button>
  );
}

function DesktopTickerBar({ loading, doubled, setOpen }) {
  return (
    <div className={styles.tickerBar}>
      <button type="button" className={styles.tickerOpen} aria-label="打开公告与消息面板" onClick={() => setOpen(true)}>
        <span className={styles.tickerLabel}>
          <span className={styles.tickerBadge}>系统公告</span>
        </span>

        <span className={styles.tickerScrollWrap} aria-hidden>
          {!loading && (
            <span className={styles.tickerTrack}>
              {doubled.map((item, i) => (
                <span key={`${item.id}-${i}`} className={styles.tickerItem}>
                  <span className={styles.tickerDot} />
                  {item.title ?? item.content}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>

      <button type="button"
        className={styles.tickerAction}
        onClick={() => setOpen(o => !o)}
        aria-label="留言面板"
      >
        <span className={styles.tickerActionInner}>
          <span className={styles.taIcon} aria-hidden>↗</span>
          留言
        </span>
      </button>
    </div>
  );
}

function DesktopTickerPanel({
  panelRef,
  open,
  totalCount,
  hasUnreadReply,
  closePanel,
  renderPanelContent,
  inputRef,
  submitMsg,
  leaveText,
  setLeaveText,
  handleKeyDown,
  submitting,
  handleSubmit,
}) {
  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={`${styles.rpanel} ${styles.open}`}
      aria-label="公告与消息面板"
    >
      <div className={styles.rpHeader}>
        <div className={styles.rpTitle}>
          公告与消息
          <span className={styles.rpCount}>{totalCount} 条</span>
          {hasUnreadReply && <span className={styles.rpReplyDot} aria-label="有新回复" />}
        </div>
        <button type="button"
          className={styles.rpClose}
          onClick={closePanel}
          aria-label="关闭"
        >
          ✕
        </button>
      </div>

      {renderPanelContent()}

      <LeaveBar
        inputRef={inputRef}
        submitMsg={submitMsg}
        leaveText={leaveText}
        setLeaveText={setLeaveText}
        handleKeyDown={handleKeyDown}
        submitting={submitting}
        handleSubmit={handleSubmit}
      />
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export default function NotificationTicker({ userId = null, isGuest = false, isMobile = false, currentPage = '' }) {
  const isMobileFloating = isMobile && !isGuest;
  const [guestId] = useState(() => (isGuest ? getOrCreateGuestId() : ''));
  const [open, setOpen]           = useState(() => isMobileFloating);
  const [view, setView]           = useState('list'); // 'list' | 'detail'
  const [activeItem, setActive]   = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [launcherPosition, setLauncherPosition] = useState({ x: null, y: null });
  const [launcherEdge, setLauncherEdge] = useState('right');

  const [announcements, setAnnouncements] = useState([]);
  const [myMessages,    setMyMessages]    = useState([]);
  const [loading,       setLoading]       = useState(true);

  const [leaveText,   setLeaveText]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitMsg,   setSubmitMsg]   = useState('');

  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const dragStateRef = useRef(null);
  const launcherMovedRef = useRef(false);
  const pageRef = useRef(currentPage);

  // ── 初始加载 ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchTickerData(guestId);
      if (res?.data) {
        setAnnouncements(res.data.announcements ?? []);
        setMyMessages(res.data.myMessages ?? []);
      }
    } catch (_) {
      // 静默失败：通知栏不应影响主页面
    } finally {
      setLoading(false);
    }
  }, [guestId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isMobileFloating) return;
    setOpen(true);
    setMinimized(false);
  }, [isMobileFloating]);

  useEffect(() => {
    if (!isMobileFloating) {
      pageRef.current = currentPage;
      return;
    }
    if (pageRef.current === currentPage) return;
    pageRef.current = currentPage;
    setOpen(false);
    setMinimized(true);
    backToList();
  }, [currentPage, isMobileFloating]);

  // ── 点击详情时若公告需要完整 body，则懒加载 ──────────────────────────────────

  async function openDetail(item) {
    setActive(item);
    setView('detail');
    // 公告列表页只有摘要，点进去再拉完整内容
    if (item._type === 'announcement' && !item._loaded) {
      try {
        const res = await fetchAnnouncement(item.id);
        if (res?.data) {
          const full = { ...res.data, _type: 'announcement', _loaded: true };
          setActive(full);
          setAnnouncements(prev =>
            prev.map(a => a.id === full.id ? full : a)
          );
        }
      } catch (_) { /* 保持当前已有数据 */ }
    }
  }

  function backToList() {
    setView('list');
    setActive(null);
  }

  // ── 面板打开后刷新我的留言 ───────────────────────────────────────────────────

  useEffect(() => {
    if (open && (userId || guestId)) {
      fetchMyMessages(guestId)
        .then(res => { if (res?.data) setMyMessages(res.data); })
        .catch(() => {});
    }
  }, [open, userId, guestId]);

  // ── 点击面板外关闭 ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (isMobileFloating) return undefined;
    function onPointerDown(e) {
      if (open && panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
        backToList();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isMobileFloating, open]);

  useEffect(() => {
    if (!isMobileFloating || launcherPosition.x !== null || typeof window === 'undefined') return;
    setLauncherPosition({
      x: window.innerWidth - MOBILE_LAUNCHER_WIDTH + MOBILE_LAUNCHER_EDGE_HIDDEN,
      y: window.innerHeight - MOBILE_NAV_CLEARANCE - MOBILE_LAUNCHER_HEIGHT,
    });
    setLauncherEdge('right');
  }, [isMobileFloating, launcherPosition.x]);

  useEffect(() => {
    if (!isMobileFloating) return undefined;

    function handlePointerMove(event) {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      if (
        Math.abs(event.clientX - dragState.startX) > 4 ||
        Math.abs(event.clientY - dragState.startY) > 4
      ) {
        dragState.moved = true;
        launcherMovedRef.current = true;
      }
      const nextX = clamp(
        event.clientX - dragState.offsetX,
        MOBILE_LAUNCHER_MARGIN,
        window.innerWidth - MOBILE_LAUNCHER_WIDTH - MOBILE_LAUNCHER_MARGIN,
      );
      const nextY = clamp(
        event.clientY - dragState.offsetY,
        MOBILE_LAUNCHER_MARGIN,
        window.innerHeight - MOBILE_LAUNCHER_HEIGHT - MOBILE_NAV_CLEARANCE,
      );
      setLauncherPosition({ x: nextX, y: nextY });
    }

    function handlePointerUp() {
      const currentPosition = launcherPosition;
      const candidates = getLauncherCornerPositions();
      if (currentPosition.x !== null && candidates.length > 0) {
        const nearest = candidates.reduce((best, point) => {
          if (!best) return point;
          const bestDistance = Math.hypot(best.x - currentPosition.x, best.y - currentPosition.y);
          const nextDistance = Math.hypot(point.x - currentPosition.x, point.y - currentPosition.y);
          return nextDistance < bestDistance ? point : best;
        }, null);
        if (nearest) {
          setLauncherPosition({ x: nearest.x, y: nearest.y });
          setLauncherEdge(nearest.edge || 'right');
        }
      }
      dragStateRef.current = null;
      window.setTimeout(() => {
        launcherMovedRef.current = false;
      }, 0);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isMobileFloating, launcherPosition]);

  // ── 提交留言 ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!leaveText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitMessage(leaveText.trim(), guestId);
      setLeaveText('');
      setSubmitMsg('已收到，开发会尽快回复！');
      // 刷新我的留言
      const res = await fetchMyMessages(guestId);
      if (res?.data) setMyMessages(res.data);
    } catch (_) {
      setSubmitMsg('提交失败，请稍后再试。');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitMsg(''), 3000);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // ── 字幕内容：公告标题轮播 ───────────────────────────────────────────────────

  const tickerItems = announcements.length
    ? announcements
    : [{ id: 0, title: '暂无公告', body: '' }];

  // 拼双份实现无缝滚动
  const doubled = [...tickerItems, ...tickerItems];

  const totalCount = announcements.length + myMessages.length;
  const hasUnreadReply = myMessages.some(m => m.reply);

  function handleMinimize() {
    setMinimized(true);
    setOpen(false);
  }

  function handleRestore() {
    setMinimized(false);
    setOpen(true);
  }

  function handleLauncherPointerDown(event) {
    if (!isMobileFloating) return;
    setLauncherEdge('');
    dragStateRef.current = {
      offsetX: event.clientX - (launcherPosition.x ?? 0),
      offsetY: event.clientY - (launcherPosition.y ?? 0),
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    launcherMovedRef.current = false;
  }

  const renderPanelContent = () => (
    <TickerPanelContent
      view={view}
      loading={loading}
      announcements={announcements}
      myMessages={myMessages}
      openDetail={openDetail}
      activeItem={activeItem}
      backToList={backToList}
    />
  );

  if (isMobileFloating) {
    return (
      <div className={styles.mobileRoot}>
        <MobileTickerWindow
          open={open}
          panelRef={panelRef}
          totalCount={totalCount}
          handleMinimize={handleMinimize}
          renderPanelContent={renderPanelContent}
          inputRef={inputRef}
          submitMsg={submitMsg}
          leaveText={leaveText}
          setLeaveText={setLeaveText}
          handleKeyDown={handleKeyDown}
          submitting={submitting}
          handleSubmit={handleSubmit}
        />

        <MobileTickerLauncher
          minimized={minimized}
          launcherEdge={launcherEdge}
          launcherPosition={launcherPosition}
          handleRestore={() => {
            if (launcherMovedRef.current) return;
            handleRestore();
          }}
          handleLauncherPointerDown={handleLauncherPointerDown}
        />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <DesktopTickerBar loading={loading} doubled={doubled} setOpen={setOpen} />

      <DesktopTickerPanel
        panelRef={panelRef}
        open={open}
        totalCount={totalCount}
        hasUnreadReply={hasUnreadReply}
        closePanel={() => { setOpen(false); backToList(); }}
        renderPanelContent={renderPanelContent}
        inputRef={inputRef}
        submitMsg={submitMsg}
        leaveText={leaveText}
        setLeaveText={setLeaveText}
        handleKeyDown={handleKeyDown}
        submitting={submitting}
        handleSubmit={handleSubmit}
      />
    </div>
  );
}
