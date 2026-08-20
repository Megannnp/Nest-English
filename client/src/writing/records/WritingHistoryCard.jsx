import { useEffect, useState } from 'react';

import {
  T,
  gradeColor,
  gradeLabel,
} from './constants.js';
import { buildHistoryCardState } from './historyCardState.js';
import {
  WritingHistoryFeedbackSections,
  WritingHistoryPendingSection,
} from './WritingHistoryFeedbackPanel.jsx';
import { writingsAPI } from '../../api/index.js';
import AppIcon from '../../components/shared/AppIcon.jsx';

function HistoryCardMobileRow({ state }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {state.scorePercent !== null && (
        <span style={{ fontSize: 11, fontWeight: 700, color: gradeColor(state.scorePercent), padding: '2px 8px', borderRadius: 12, background: '#faf6ef' }}>
          {state.score}/{state.maxScore} · {gradeLabel(state.scorePercent)}
        </span>
      )}
      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: state.pipelineBadge.bg, color: state.pipelineBadge.color, border: `1px solid ${state.pipelineBadge.border}` }}>
        {state.pipelineBadge.label}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: state.analysisBadge.bg, color: state.analysisBadge.color, border: `1px solid ${state.analysisBadge.border}` }}>
        {state.analysisBadge.label}
      </span>
    </div>
  );
}

function HistoryCardDesktopScore({ state }) {
  if (state.scorePercent === null) return null;
  return (
    <div style={{ textAlign: 'center', flexShrink: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: gradeColor(state.scorePercent) }}>
        {state.score}<span style={{ fontSize: 10, color: T.textMuted }}>/{state.maxScore}</span>
      </div>
      <div style={{ fontSize: 10, color: gradeColor(state.scorePercent), fontWeight: 600 }}>{gradeLabel(state.scorePercent)}</div>
    </div>
  );
}

function HistoryCardHeader({ w, isMobile, open, state, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ width: '100%', border: 0, padding: isMobile ? '12px 14px' : '14px 18px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 10, cursor: 'pointer', background: open ? T.cardAlt : T.card, textAlign: 'left' }}
    >
      <span style={{ flexShrink: 0, marginTop: isMobile ? 1 : 0, color: T.primaryDark }}><AppIcon name={state.isHomework ? 'clipboard' : 'pen-line'} size={18} /></span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 2 }}>
        <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap', lineHeight: 1.4 }}>
          {w.writingTitle || '未命名写作'}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
          {state.isHomework ? '作业' : '自主'} · {new Date(w.createdAt).toLocaleDateString('zh-CN')}
        </div>
        {isMobile && <HistoryCardMobileRow state={state} />}
      </div>
      <HistoryCardDesktopScore state={state} />
      {!isMobile && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, flexShrink: 0, background: state.analysisBadge.bg, color: state.analysisBadge.color, border: `1px solid ${state.analysisBadge.border}` }}>{state.analysisBadge.label}</span>}
      {!isMobile && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, flexShrink: 0, background: state.pipelineBadge.bg, color: state.pipelineBadge.color, border: `1px solid ${state.pipelineBadge.border}` }}>{state.pipelineBadge.label}</span>}
      <span style={{ color: T.textMuted, fontSize: 11 }}>{open ? '▲' : '▼'}</span>
    </button>
  );
}

export default function WritingHistoryCard({
  w,
  isMobile,
  retrying,
  replaying,
  detailing,
  quickRetrying,
  supplementalRetrying,
  viewing,
  deleting,
  onRetryAnalysis,
  onReplayDeadLetter,
  onViewFullFeedback,
  onRequestDetailedFeedback,
  onRetryQuickFeedback,
  onRetrySupplementalFeedback,
  onDeleteWriting,
  onWriteNextDraft,
  refreshKey,
}) {
  const [open, setOpen] = useState(false);
  const [taskState, setTaskState] = useState(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [detailWriting, setDetailWriting] = useState(null);
  const state = buildHistoryCardState(w, retrying);

  useEffect(() => {
    let cancelled = false;
    if (!open) return undefined;

    if (state.hasAI) {
      setTaskLoading(true);
      writingsAPI.getTasks(w.id)
        .then((result) => {
          if (!cancelled) setTaskState(result?.questionAnalysisTask || null);
        })
        .catch(() => {
          if (!cancelled) setTaskState(null);
        })
        .finally(() => {
          if (!cancelled) setTaskLoading(false);
        });
    }

    writingsAPI.get(w.id)
      .then((result) => {
        if (!cancelled) setDetailWriting(result);
      })
      .catch(() => {
        if (!cancelled) setDetailWriting(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, state.hasAI, w.id, refreshKey]);

  const writingForDisplay = detailWriting || w;

  return (
    <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${state.hasAI ? '#a7f3d0' : T.border}`, overflow: 'hidden' }}>
      <HistoryCardHeader w={w} isMobile={isMobile} open={open} state={state} onToggle={() => setOpen((value) => !value)} />

      {open && (
        <div style={{ padding: isMobile ? '12px 14px' : '16px 18px', borderTop: `1px solid ${T.border}` }}>
          {state.canExpandFeedback ? (
            <WritingHistoryFeedbackSections
              writing={writingForDisplay}
              isMobile={isMobile}
              state={state}
              taskState={taskState}
              taskLoading={taskLoading}
              replaying={replaying}
              retrying={retrying}
              quickRetrying={quickRetrying}
              supplementalRetrying={supplementalRetrying}
              detailing={detailing}
              viewing={viewing}
              deleting={deleting}
              onReplayDeadLetter={onReplayDeadLetter}
              onRetryAnalysis={onRetryAnalysis}
              onDeleteWriting={onDeleteWriting}
              onRetryQuickFeedback={onRetryQuickFeedback}
              onRetrySupplementalFeedback={onRetrySupplementalFeedback}
              onRequestDetailedFeedback={onRequestDetailedFeedback}
              onViewFullFeedback={onViewFullFeedback}
              onWriteNextDraft={onWriteNextDraft}
            />
          ) : (
            <WritingHistoryPendingSection />
          )}
        </div>
      )}
    </div>
  );
}
