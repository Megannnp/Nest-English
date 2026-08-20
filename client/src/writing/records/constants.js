export const T = {
  primary: '#c8852a',
  primaryLight: '#fdf0d8',
  primaryDark: '#8b5e1a',
  border: '#e8e0d5',
  text: '#2a1f14',
  textSecondary: '#8a7d6e',
  textMuted: '#a09080',
  success: '#2d9e6b',
  successLight: '#edfaf3',
  error: '#b02020',
  errorLight: '#fdf0ef',
  card: '#ffffff',
  cardAlt: '#faf8f5',
};

export const pct = (score, max) => (max > 0 ? Math.round((score / max) * 100) : 0);
export const gradeColor = (p) => (p >= 90 ? T.success : p >= 75 ? T.primary : p >= 60 ? '#d97706' : T.error);
export const gradeLabel = (p) => (p >= 90 ? '优秀' : p >= 75 ? '良好' : p >= 60 ? '中等' : '待提高');

export function getAnalysisStatus(writing) {
  const normalized = String(
    writing?.analysisMeta?.status ||
      writing?.feedback?.analysisMeta?.status ||
      writing?.feedback?.questionAnalysis?.status ||
      ''
  )
    .trim()
    .toLowerCase();

  if (['pending', 'partial', 'ready', 'failed'].includes(normalized)) return normalized;
  if (!writing?.feedback) return 'pending';
  return 'ready';
}

function _isRunningOrPending(status) {
  return status === 'pending' || status === 'running';
}

export function getPipelineStage(writing) {
  const fb = writing?.feedbackStatus || {};
  const quickStatus = fb.quickFeedbackStatus || 'not_started';
  const supplementalStatus = fb.supplementalFeedbackStatus || 'not_started';
  const detailedStatus = fb.detailedFeedbackStatus || 'not_requested';
  const analysisStatus = getAnalysisStatus(writing);

  if (quickStatus === 'failed') return 'quick_failed';
  if (quickStatus === 'running') return 'quick_running';
  if (supplementalStatus === 'failed') return 'supplemental_failed';
  if (_isRunningOrPending(supplementalStatus)) return 'supplemental_running';
  if (detailedStatus === 'failed') return 'detail_failed';
  if (_isRunningOrPending(detailedStatus)) return 'detail_running';
  if (analysisStatus === 'failed') return 'analysis_failed';
  if (analysisStatus === 'pending' || analysisStatus === 'partial') return 'analysis_running';
  return 'ready';
}

export function getPipelineBadge(stage) {
  const map = {
    quick_running: { label: '快速反馈生成中', bg: '#fff7ed', color: '#b45309', border: '#f4c28a' },
    quick_failed: { label: '快速反馈失败', bg: T.errorLight, color: T.error, border: '#efc3bf' },
    supplemental_running: { label: '完整精批补齐中', bg: '#eef6ff', color: '#1d4ed8', border: '#bfdbfe' },
    supplemental_failed: { label: '完整精批补齐失败', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    detail_running: { label: '详细反馈补充中', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
    detail_failed: { label: '详细反馈失败', bg: '#fef2f2', color: T.error, border: '#fecaca' },
    analysis_running: { label: '题目分析补充中', bg: '#fef3c7', color: '#92400e', border: '#f0cc80' },
    analysis_failed: { label: '题目分析待补全', bg: '#fff7ed', color: '#b45309', border: '#fed7aa' },
    ready: { label: '当前结果可查看', bg: T.successLight, color: T.success, border: '#b7e4cf' },
  };
  return map[stage] || map.ready;
}

export function getAnalysisBadge(status) {
  const map = {
    pending: { label: '分析生成中', bg: '#fef3c7', color: '#92400e', border: '#f0cc80' },
    partial: { label: '分析部分完成', bg: '#fff7ed', color: '#b45309', border: '#f4c28a' },
    ready: { label: '分析已完成', bg: T.successLight, color: T.success, border: '#b7e4cf' },
    failed: { label: '分析待补全', bg: T.errorLight, color: T.error, border: '#efc3bf' },
  };
  return map[status] || map.pending;
}

export function getQueueStateLabel(queueState) {
  if (queueState === 'queued') return '排队中';
  if (queueState === 'running') return '运行中';
  return '空闲';
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN');
}

export function formatDuration(ms) {
  const value = Number(ms);
  if (!value || value <= 0) return '—';
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}s`;
}

export function getTaskStatusBadge(task) {
  const status = String(task?.status || '').toLowerCase();
  const map = {
    pending: { label: '待执行', bg: '#fef3c7', color: '#92400e', border: '#f0cc80' },
    running: { label: '执行中', bg: '#fff7ed', color: '#b45309', border: '#f4c28a' },
    success: { label: '已完成', bg: T.successLight, color: T.success, border: '#b7e4cf' },
    failed: { label: '失败', bg: T.errorLight, color: T.error, border: '#efc3bf' },
    dead_letter: { label: '死信队列', bg: '#fdf2f8', color: '#9d174d', border: '#f3c6da' },
  };
  return map[status] || map.pending;
}
