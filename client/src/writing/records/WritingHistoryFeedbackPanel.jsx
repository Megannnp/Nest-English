import {
  T,
  pct,
  gradeColor,
  getTaskStatusBadge,
  formatDateTime,
} from './constants.js';
import {
  getAnalysisStatusMessage,
  getPipelineStageMessage,
} from './historyCardState.js';
import AppIcon from '../../components/shared/AppIcon.jsx';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import { useConfirmDialog } from '../../hooks/useConfirmDialog.js';

const QUICK_LABEL_MAP = {
  not_started: '等待反馈',
  running: '基础反馈生成中',
  ready: '基础反馈已生成',
  failed: '基础反馈失败',
};

const DETAILED_LABEL_MAP = {
  not_requested: '可生成详细反馈',
  pending: '详细反馈排队中',
  running: '详细反馈生成中',
  ready: '详细反馈已生成',
  failed: '详细反馈失败',
};

const COMMENT_LABEL_MAP = {
  empty: '教师暂未评价',
  ready: '教师已评价',
};

const SUPPLEMENTAL_LABEL_MAP = {
  not_started: '完整精批未启动',
  pending: '完整精批排队中',
  running: '完整精批补齐中',
  ready: '完整精批已补齐',
  failed: '完整精批补齐失败',
};

function RingScore({ score, max, size = 80 }) {
  const p = pct(score, max);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  const color = gradeColor(p);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e0d5" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: size * 0.12, color: T.textMuted }}>/{max}</div>
      </div>
    </div>
  );
}

function ScorePlaceholder({ max, size = 80 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={(size - 10) / 2} fill="none" stroke="#e8e0d5" strokeWidth={8} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.18, fontWeight: 800, color: T.textMuted, lineHeight: 1 }}>待出分</div>
        <div style={{ fontSize: size * 0.12, color: T.textMuted }}>/{max}</div>
      </div>
    </div>
  );
}

function WritingHistorySummary({ w, isMobile, state }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
      {state.hasScore ? (
        <RingScore score={Number(state.score)} max={state.maxScore} size={isMobile ? 60 : 72} />
      ) : (
        <ScorePlaceholder max={state.maxScore} size={isMobile ? 60 : 72} />
      )}
      <div style={{ flex: 1, fontSize: 13, color: T.text, lineHeight: 1.7, background: T.cardAlt, padding: '10px 12px', borderRadius: 8 }}>
        {w.feedback?.summary || (state.quickFailed ? '基础反馈未成功写回，本次请先重试基础反馈。' : '暂无总评')}
      </div>
    </div>
  );
}

function StatusNotice({ tone }) {
  if (!tone?.message) return null;
  return (
    <div style={{ fontSize: 12, color: tone.color, background: tone.bg, border: `1px solid ${tone.border}`, padding: '8px 10px', borderRadius: 8, marginBottom: 10 }}>
      {tone.message}
    </div>
  );
}

function AnalysisRetryButton({ analysisStatus, retryBlocked, retrying, queueState, onRetry }) {
  if (!(analysisStatus === 'partial' || analysisStatus === 'failed')) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
      <button type="button"
        aria-label={retrying ? '重跑中' : queueState === 'queued' ? '已进入队列' : queueState === 'running' ? '后台生成中' : '重新补全题目分析'}
        onClick={onRetry}
        disabled={retryBlocked}
        style={{
          padding: '6px 12px',
          borderRadius: 18,
          border: `1px solid ${T.border}`,
          background: retryBlocked ? '#efe7dc' : T.cardAlt,
          color: retryBlocked ? T.textMuted : T.primaryDark,
          fontSize: 12,
          cursor: retryBlocked ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >
        {retrying ? '重跑中...' : queueState === 'queued' ? '已进入队列' : queueState === 'running' ? '后台生成中' : '重新补全题目分析'}
      </button>
    </div>
  );
}

function CategoryBadges({ categories }) {
  if (!categories?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      {categories.map((cat, index) => (
        <span key={index} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: T.primaryLight, color: T.primaryDark, border: '1px solid #f0cc80' }}>
          {cat.icon} {cat.name} <span style={{ color: { 优: T.success, 良: T.primary, 中: '#d97706', 差: T.error }[cat.grade] || T.textMuted, fontWeight: 700 }}>{cat.grade}</span>
        </span>
      ))}
    </div>
  );
}

function GrammarIssuesPreview({ grammarIssues }) {
  if (!grammarIssues?.length) return null;
  return (
    <div style={{ background: T.errorLight, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.error, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}><AppIcon name="alert" size={12} />语法问题（{grammarIssues.length} 处）</div>
      {grammarIssues.slice(0, 2).map((err, index) => (
        <div key={index} style={{ fontSize: 11, color: T.text, display: 'flex', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ color: T.textMuted, flexShrink: 0 }}>{index + 1}. {err.type}：</span>
          <span style={{ textDecoration: 'line-through', color: T.error }}>{err.original}</span>
          <span style={{ color: T.textMuted }}>→</span>
          <span style={{ color: T.success, fontWeight: 600 }}>{err.corrected}</span>
        </div>
      ))}
    </div>
  );
}

function TeacherCommentBanner({ teacherComment }) {
  if (!teacherComment) return null;
  return <div style={{ fontSize: 12, color: T.primaryDark, background: T.primaryLight, padding: '8px 12px', borderRadius: 8, border: '1px solid #f0cc80', display: 'flex', alignItems: 'flex-start', gap: 6 }}><AppIcon name="teacher" size={13} style={{ flexShrink: 0, marginTop: 1 }} /> <span>教师评语：{teacherComment}</span></div>;
}

function FeedbackStateChips({ feedbackStatus, detailedReady, supplementalRunning, supplementalFailed, supplementalActive }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: '#faf6ef', color: T.primaryDark, border: `1px solid ${T.border}` }}>
        {QUICK_LABEL_MAP[feedbackStatus.quickFeedbackStatus] || '基础反馈状态未知'}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: '#f8fafc', color: T.textSecondary, border: `1px solid ${T.border}` }}>
        {COMMENT_LABEL_MAP[feedbackStatus.teacherCommentStatus] || '教师评价状态未知'}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: supplementalRunning ? '#eef6ff' : supplementalFailed ? '#eff6ff' : '#f5f5f4', color: supplementalRunning || supplementalFailed ? '#1d4ed8' : T.textSecondary, border: `1px solid ${supplementalRunning || supplementalFailed ? '#bfdbfe' : T.border}` }}>
        {SUPPLEMENTAL_LABEL_MAP[feedbackStatus.supplementalFeedbackStatus] || '完整精批状态未知'}
      </span>
      {!supplementalActive && (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: detailedReady ? '#ecfdf3' : '#fff7ed', color: detailedReady ? T.success : '#b45309', border: `1px solid ${detailedReady ? '#bbf7d0' : '#fed7aa'}` }}>
          {DETAILED_LABEL_MAP[feedbackStatus.detailedFeedbackStatus] || '详细反馈状态未知'}
        </span>
      )}
    </div>
  );
}

function DeleteWritingButton({ w, deleting, onDeleteWriting, isHomework }) {
  const { confirmState, requestConfirm, respondConfirm } = useConfirmDialog();
  if (isHomework) return null;
  return (
    <>
      <ConfirmDialog state={confirmState} onRespond={respondConfirm} />
      <button type="button"
        onClick={async () => {
          const ok = await requestConfirm('确认删除这条自由练习记录？删除后无法恢复。');
          if (ok) onDeleteWriting?.(w.id);
        }}
        disabled={deleting}
        style={{
          padding: '6px 12px',
          borderRadius: 18,
          border: `1px solid ${deleting ? '#efc3bf' : '#f2b8b5'}`,
          background: deleting ? '#f8e1df' : '#fff5f5',
          color: deleting ? T.textMuted : T.error,
          fontSize: 12,
          cursor: deleting ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >
        {deleting ? '删除中...' : '删除记录'}
      </button>
    </>
  );
}

function RetryQuickFeedbackButton({ w, quickFailed, quickRetrying, onRetryQuickFeedback }) {
  if (!quickFailed) return null;
  return (
    <button type="button"
      onClick={() => onRetryQuickFeedback?.(w.id)}
      disabled={quickRetrying}
      style={{
        padding: '6px 12px',
        borderRadius: 18,
        border: `1px solid ${T.border}`,
        background: quickRetrying ? '#efe7dc' : '#fffaf5',
        color: quickRetrying ? T.textMuted : T.primaryDark,
        fontSize: 12,
        cursor: quickRetrying ? 'not-allowed' : 'pointer',
        fontWeight: 700,
      }}
    >
      {quickRetrying ? '重试中...' : '重试基础反馈'}
    </button>
  );
}

function RetrySupplementalFeedbackButton({ w, supplementalFailed, supplementalRetrying, onRetrySupplementalFeedback }) {
  if (!supplementalFailed) return null;
  return (
    <button type="button"
      onClick={() => onRetrySupplementalFeedback?.(w.id)}
      disabled={supplementalRetrying}
      style={{
        padding: '6px 12px',
        borderRadius: 18,
        border: `1px solid ${T.border}`,
        background: supplementalRetrying ? '#dbeafe' : '#eef6ff',
        color: supplementalRetrying ? T.textMuted : '#1d4ed8',
        fontSize: 12,
        cursor: supplementalRetrying ? 'not-allowed' : 'pointer',
        fontWeight: 700,
      }}
    >
      {supplementalRetrying ? '补齐重试中...' : '重试完整精批补齐'}
    </button>
  );
}

function RequestDetailedFeedbackButton({ w, canRequestDetailed, detailing, onRequestDetailedFeedback }) {
  if (!canRequestDetailed) return null;
  return (
    <button type="button"
      onClick={() => onRequestDetailedFeedback?.(w.id)}
      disabled={detailing}
      style={{
        padding: '6px 12px',
        borderRadius: 18,
        border: `1px solid ${T.border}`,
        background: detailing ? '#efe7dc' : '#fffaf5',
        color: detailing ? T.textMuted : T.primaryDark,
        fontSize: 12,
        cursor: detailing ? 'not-allowed' : 'pointer',
        fontWeight: 700,
      }}
    >
      {detailing ? '生成中...' : '生成详细反馈'}
    </button>
  );
}

function ViewFeedbackButton({ w, viewing, detailedReady, onViewFullFeedback }) {
  return (
    <button type="button"
      onClick={() => onViewFullFeedback?.(w.id)}
      disabled={viewing}
      style={{
        padding: '6px 12px',
        borderRadius: 18,
        border: `1px solid ${T.border}`,
        background: viewing ? '#efe7dc' : '#fff',
        color: viewing ? T.textMuted : T.primaryDark,
        fontSize: 12,
        cursor: viewing ? 'not-allowed' : 'pointer',
        fontWeight: 700,
      }}
    >
      {viewing ? '加载中...' : detailedReady ? '查看详细反馈' : '查看完整反馈'}
    </button>
  );
}

function FeedbackActionButtons({
  w,
  isHomework,
  deleting,
  quickFailed,
  quickRetrying,
  supplementalFailed,
  supplementalRetrying,
  canRequestDetailed,
  canViewFeedback,
  detailing,
  viewing,
  detailedReady,
  onDeleteWriting,
  onRetryQuickFeedback,
  onRetrySupplementalFeedback,
  onRequestDetailedFeedback,
  onViewFullFeedback,
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <DeleteWritingButton w={w} deleting={deleting} onDeleteWriting={onDeleteWriting} isHomework={isHomework} />
        <RetryQuickFeedbackButton w={w} quickFailed={quickFailed} quickRetrying={quickRetrying} onRetryQuickFeedback={onRetryQuickFeedback} />
        <RetrySupplementalFeedbackButton w={w} supplementalFailed={supplementalFailed} supplementalRetrying={supplementalRetrying} onRetrySupplementalFeedback={onRetrySupplementalFeedback} />
        <RequestDetailedFeedbackButton w={w} canRequestDetailed={canRequestDetailed} detailing={detailing} onRequestDetailedFeedback={onRequestDetailedFeedback} />
        {canViewFeedback ? <ViewFeedbackButton w={w} viewing={viewing} detailedReady={detailedReady} onViewFullFeedback={onViewFullFeedback} /> : null}
      </div>
    </div>
  );
}

function QuestionAnalysisTaskPanel({ task, loading = false, replaying = false, onReplay }) {
  if (loading) {
    return (
      <div style={{ background: '#fffaf5', borderRadius: 10, border: `1px solid ${T.border}`, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: T.textMuted }}>
        正在读取后台任务状态...
      </div>
    );
  }

  if (!task) return null;
  const badge = getTaskStatusBadge(task);
  const replayButton = replaying
    ? { label: '重放中', text: '重放中...' }
    : { label: '重放死信任务', text: '重放死信任务' };

  return (
    <div style={{ background: '#fffaf5', borderRadius: 10, border: `1px solid ${T.border}`, padding: '10px 12px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.primaryDark, display: 'flex', alignItems: 'center', gap: 5 }}><AppIcon name="construction" size={13} /> 后台任务管理</div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.label}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: task.errorMessage ? 8 : 10 }}>
        <div style={{ fontSize: 11, color: T.textSecondary }}>队列：<span style={{ color: T.text, fontWeight: 700 }}>{task.queueName || '—'}</span></div>
        <div style={{ fontSize: 11, color: T.textSecondary }}>尝试次数：<span style={{ color: T.text, fontWeight: 700 }}>{task.attempts ?? 0}</span></div>
        <div style={{ fontSize: 11, color: T.textSecondary }}>最近心跳：<span style={{ color: T.text, fontWeight: 700 }}>{formatDateTime(task.lastHeartbeatAt)}</span></div>
        <div style={{ fontSize: 11, color: T.textSecondary }}>下次重试：<span style={{ color: T.text, fontWeight: 700 }}>{formatDateTime(task.nextRunAt)}</span></div>
        <div style={{ fontSize: 11, color: T.textSecondary }}>死信时间：<span style={{ color: T.text, fontWeight: 700 }}>{formatDateTime(task.deadLetteredAt)}</span></div>
      </div>
      {task.errorMessage && <div style={{ fontSize: 11, color: T.error, lineHeight: 1.6, marginBottom: task.canReplay ? 10 : 0 }}>最近错误：{task.errorMessage}</div>}
      {task.canReplay && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button"
            aria-label={replayButton.label}
            onClick={onReplay}
            disabled={replaying}
            style={{
              padding: '6px 12px',
              borderRadius: 18,
              border: `1px solid ${T.border}`,
              background: replaying ? '#efe7dc' : '#fff',
              color: replaying ? T.textMuted : T.primaryDark,
              fontSize: 12,
              cursor: replaying ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            {replayButton.text}
          </button>
        </div>
      )}
    </div>
  );
}

function VersionHistoryBar({ writing, onWriteNextDraft }) {
  const versions = writing.versions;
  if (!versions || versions.length <= 1) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => onWriteNextDraft?.(writing)}
          style={{
            padding: '5px 12px',
            borderRadius: 18,
            border: `1px solid ${T.border}`,
            background: '#fffaf5',
            color: T.primaryDark,
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          ✍️ 写下一稿
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.primaryDark, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>版本历史（共 {versions.length} 稿）</span>
        <button
          type="button"
          onClick={() => onWriteNextDraft?.(writing)}
          style={{
            padding: '4px 10px',
            borderRadius: 18,
            border: `1px solid ${T.border}`,
            background: '#fffaf5',
            color: T.primaryDark,
            fontSize: 11,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          ✍️ 写下一稿
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {versions.map((v) => (
          <span
            key={v.id}
            style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 10,
              background: v.isCurrent ? T.primaryDark : '#f5f5f4',
              color: v.isCurrent ? '#fff' : T.textSecondary,
              border: `1px solid ${v.isCurrent ? T.primaryDark : T.border}`,
              fontWeight: v.isCurrent ? 700 : 400,
            }}
          >
            第{v.versionNo}稿 · {new Date(v.createdAt).toLocaleDateString('zh-CN')}
            {v.wordCount ? ` · ${v.wordCount}字` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WritingHistoryFeedbackSections({
  writing,
  isMobile,
  state,
  taskState,
  taskLoading,
  replaying,
  retrying,
  quickRetrying,
  supplementalRetrying,
  detailing,
  viewing,
  deleting,
  onReplayDeadLetter,
  onRetryAnalysis,
  onDeleteWriting,
  onRetryQuickFeedback,
  onRetrySupplementalFeedback,
  onRequestDetailedFeedback,
  onViewFullFeedback,
  onWriteNextDraft,
}) {
  return (
    <>
      <VersionHistoryBar writing={writing} onWriteNextDraft={onWriteNextDraft} />
      <WritingHistorySummary w={writing} isMobile={isMobile} state={state} />
      {state.analysisStatus !== 'ready' ? (
        <StatusNotice tone={{ ...state.analysisBadge, message: getAnalysisStatusMessage(state.analysisStatus) }} />
      ) : null}
      {state.pipelineStage !== 'ready' ? (
        <StatusNotice tone={{ ...state.pipelineBadge, message: getPipelineStageMessage(state.pipelineStage) }} />
      ) : null}
      <QuestionAnalysisTaskPanel task={taskState} loading={taskLoading} replaying={replaying} onReplay={() => onReplayDeadLetter?.(writing.id)} />
      <AnalysisRetryButton
        analysisStatus={state.analysisStatus}
        retryBlocked={state.retryBlocked}
        retrying={retrying}
        queueState={state.queueState}
        onRetry={() => onRetryAnalysis?.(writing.id)}
      />
      <CategoryBadges categories={writing.feedback?.categories} />
      <GrammarIssuesPreview grammarIssues={writing.feedback?.grammarIssues} />
      <TeacherCommentBanner teacherComment={writing.teacherComment} />
      <FeedbackStateChips
        feedbackStatus={state.feedbackStatus}
        detailedReady={state.detailedReady}
        supplementalRunning={state.supplementalRunning}
        supplementalFailed={state.supplementalFailed}
        supplementalActive={state.supplementalActive}
      />
      <FeedbackActionButtons
        w={writing}
        isHomework={state.isHomework}
        deleting={deleting}
        quickFailed={state.quickFailed}
        quickRetrying={quickRetrying}
        supplementalFailed={state.supplementalFailed}
        supplementalRetrying={supplementalRetrying}
        canRequestDetailed={state.canRequestDetailed}
        canViewFeedback={state.canViewFeedback}
        detailing={detailing}
        viewing={viewing}
        detailedReady={state.detailedReady}
        onDeleteWriting={onDeleteWriting}
        onRetryQuickFeedback={onRetryQuickFeedback}
        onRetrySupplementalFeedback={onRetrySupplementalFeedback}
        onRequestDetailedFeedback={onRequestDetailedFeedback}
        onViewFullFeedback={onViewFullFeedback}
      />
    </>
  );
}

export function WritingHistoryPendingSection() {
  return (
    <div style={{ textAlign: 'center', padding: '20px', color: T.textMuted, fontSize: 13 }}>
      等待反馈生成中...
    </div>
  );
}
