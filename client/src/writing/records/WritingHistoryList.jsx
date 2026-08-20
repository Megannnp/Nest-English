import { T } from './constants.js';
import WritingHistoryCard from './WritingHistoryCard.jsx';

export default function WritingHistoryList({
  writings,
  filtered,
  filter,
  setFilter,
  isMobile,
  retryingId,
  replayingId,
  detailingId,
  quickRetryingId,
  supplementalRetryingId,
  viewingId,
  deletingId,
  taskRefreshKey,
  filterOptions,
  emptyMessage,
  onRetryAnalysis,
  onReplayDeadLetter,
  onViewFullFeedback,
  onRequestDetailedFeedback,
  onRetryQuickFeedback,
  onRetrySupplementalFeedback,
  onDeleteWriting,
  onWriteNextDraft,
}) {
  const options = filterOptions || [
    { id: 'all', label: '全部' },
    { id: 'homework', label: '作业' },
    { id: 'self', label: '自主' },
    { id: 'pending', label: '生成中' },
    { id: 'partial', label: '部分完成' },
    { id: 'failed', label: '待补全' },
  ];

  return (
    <div style={{ padding: `0 ${isMobile ? 12 : 16}px ${isMobile ? 12 : 16}px` }}>
      <div style={{ display: 'flex', gap: 6, margin: '12px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        {options.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: isMobile ? '7px 12px' : '5px 12px',
              borderRadius: 20,
              border: 'none',
              fontSize: 12,
              cursor: 'pointer',
              background: filter === f.id ? T.primary : T.cardAlt,
              color: filter === f.id ? '#fff' : T.textSecondary,
              fontWeight: filter === f.id ? 700 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
        <span style={{ fontSize: 12, color: T.textMuted, lineHeight: isMobile ? '20px' : '28px', marginLeft: isMobile ? 0 : 'auto', width: isMobile ? '100%' : 'auto' }}>
          {filtered.length}/{writings.length} 篇
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
          {writings.length === 0 ? (emptyMessage || '还没有批改记录，前往写作批改页面提交第一篇') : '没有符合条件的记录'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((w, i) => (
            <WritingHistoryCard
              key={w.id || i}
              w={w}
              isMobile={isMobile}
              retrying={retryingId === w.id}
              replaying={replayingId === w.id}
              detailing={detailingId === w.id}
              quickRetrying={quickRetryingId === w.id}
              supplementalRetrying={supplementalRetryingId === w.id}
              viewing={viewingId === w.id}
              deleting={deletingId === w.id}
              onRetryAnalysis={onRetryAnalysis}
              onReplayDeadLetter={onReplayDeadLetter}
              onViewFullFeedback={onViewFullFeedback}
              onRequestDetailedFeedback={onRequestDetailedFeedback}
              onRetryQuickFeedback={onRetryQuickFeedback}
              onRetrySupplementalFeedback={onRetrySupplementalFeedback}
              onDeleteWriting={onDeleteWriting}
              onWriteNextDraft={onWriteNextDraft}
              refreshKey={taskRefreshKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
