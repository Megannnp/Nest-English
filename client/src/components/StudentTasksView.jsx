import { THEME } from '../styles/theme.js';
import AppIcon from './shared/AppIcon.jsx';
import { SmallActionButton, SurfaceCard, SurfaceHeader } from './shared/UI.jsx';
import StudentSectionHeader from './student/StudentSectionHeader.jsx';

const MODULE_ENTRIES = [
  { label: '写作', desc: '批改 · 精炼 · 实战', page: 'writing', accent: '#a0522d', hoverBg: '#fdf6f0' },
  { label: '语法', desc: '分析 · 练习 · 精讲', page: 'grammar-analyzer', accent: '#5548a8', hoverBg: '#f5f3ff' },
  { label: '阅读', desc: '思维 · 练习 · 精读', page: 'reading-analyzer', accent: '#1f7a5c', hoverBg: '#f0faf5' },
  { label: '词汇', desc: '分析 · 检测 · 精讲', page: 'vocab-analyzer', accent: '#1a5fa8', hoverBg: '#f0f5fd' },
  { label: '听读', desc: '辨音 · 精听 · 模拟', page: 'listening-basics', accent: '#8a6800', hoverBg: '#fefae8' },
  { label: '口语', desc: '表达 · 转写 · 反馈', page: 'speaking', accent: '#ff7a1a', hoverBg: '#fff4e8' },
  { label: '语音', desc: '音素 · 拼读 · 句子', page: 'phonetics-overview', accent: '#a0307a', hoverBg: '#fdf0f8' },
];

const TASK_STATUS_META = {
  pending: { label: '待完成', tone: 'warning' },
  submitted: { label: '已提交', tone: 'neutral' },
  grading: { label: '批改中', tone: 'neutral' },
  returned: { label: '已生成反馈', tone: 'success' },
  completed: { label: '已完成', tone: 'success' },
  overdue: { label: '已逾期', tone: 'error' },
  closed: { label: '已关闭', tone: 'neutral' },
};

function formatTime(value) {
  if (!value) return '未设置';
  try {
    return new Date(Number(value)).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '未设置';
  }
}

function StatusPill({ status }) {
  const meta = TASK_STATUS_META[status] || TASK_STATUS_META.pending;
  const tones = {
    success: { color: '#1a7a4a', background: '#edfaf3', border: '#b7e4cf' },
    warning: { color: '#b45309', background: '#fff7ed', border: '#f4c28a' },
    error: { color: '#b02020', background: '#fdf0ef', border: '#efc3bf' },
    neutral: { color: THEME.color.textMuted, background: '#faf8f5', border: '#e8e0d5' },
  };
  const tone = tones[meta.tone] || tones.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: tone.color,
        background: tone.background,
        border: `1px solid ${tone.border}`,
      }}
    >
      {meta.label}
    </span>
  );
}

function TaskCardActions({ task, canSubmit, canViewFeedback, isModuleTask, onOpenTask, onViewFeedback, onCompleteModule, completingId }) {
  const isCompleting = completingId === task.id;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {canViewFeedback ? (
        <SmallActionButton tone="soft" onClick={() => onViewFeedback(task)}>
          查看反馈
        </SmallActionButton>
      ) : null}
      {canSubmit && isModuleTask ? (
        <>
          <SmallActionButton tone="subtle" onClick={() => onOpenTask(task)}>
            去练习
          </SmallActionButton>
          <SmallActionButton tone="primary" disabled={isCompleting} onClick={() => onCompleteModule(task)}>
            {isCompleting ? '提交中...' : '标记完成'}
          </SmallActionButton>
        </>
      ) : canSubmit ? (
        <SmallActionButton tone="primary" onClick={() => onOpenTask(task)}>
          {task.status === 'overdue' ? '立即提交' : '去完成'}
        </SmallActionButton>
      ) : null}
      {!canSubmit && !canViewFeedback ? (
        <SmallActionButton tone="subtle" onClick={() => onOpenTask(task)}>
          查看任务
        </SmallActionButton>
      ) : null}
    </div>
  );
}

function getTaskCardModel(task) {
  const meta = task.assignment || {};
  const isGrammarTask = task.taskType === 'grammar';
  const isModuleTask = task.taskType === 'module';
  const quizLabel = {
    single: '单选题',
    fill: '填空题',
    error: '改错题',
  }[meta.quizType] || '语法练习';

  return {
    meta,
    isGrammarTask,
    isModuleTask,
    canSubmit: task.status === 'pending' || (task.status === 'overdue' && meta.allowLate),
    canViewFeedback: !isGrammarTask && !isModuleTask && task.status === 'returned' && task.writingId,
    quizLabel,
  };
}

function ModuleTaskSummary({ meta }) {
  if (!meta.topic) return null;
  return (
    <div style={{ fontSize: 13, color: THEME.color.textMuted, lineHeight: 1.75 }}>
      话题：{meta.topic}
    </div>
  );
}

function TaskDetails({ meta, isGrammarTask, isModuleTask, quizLabel, isMobile }) {
  let thirdLabel = '满分';
  let thirdValue = `${meta.maxScore || 15} 分`;
  if (isGrammarTask) { thirdLabel = '题型'; thirdValue = quizLabel; }
  if (isModuleTask) { thirdLabel = '类型'; thirdValue = meta.moduleLabel || meta.moduleGroup || '专项练习'; }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: THEME.color.textMuted, marginBottom: 4 }}>班级</div>
        <div style={{ fontSize: 14, color: THEME.color.text, fontWeight: 600 }}>{meta.className || '当前班级'}</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: THEME.color.textMuted, marginBottom: 4 }}>截止时间</div>
        <div style={{ fontSize: 14, color: THEME.color.text, fontWeight: 600 }}>{formatTime(meta.dueAt)}</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: THEME.color.textMuted, marginBottom: 4 }}>{thirdLabel}</div>
        <div style={{ fontSize: 14, color: THEME.color.text, fontWeight: 600 }}>{thirdValue}</div>
      </div>
    </div>
  );
}

function GrammarTaskSummary({ meta }) {
  return (
    <div style={{ fontSize: 13, color: THEME.color.textMuted, lineHeight: 1.75 }}>
      {meta.grammarPoint || '语法专项'} · {meta.stage || '通用'} · {meta.difficulty || '常规'}
    </div>
  );
}

function PromptPreview({ promptText }) {
  if (!promptText) return null;
  return (
    <div style={{ fontSize: 13, color: THEME.color.textMuted, lineHeight: 1.75 }}>
      {promptText.length > 120 ? `${promptText.slice(0, 120)}...` : promptText}
    </div>
  );
}

export function TaskCard({ task, onOpenTask, onViewFeedback, onCompleteModule, completingId, isMobile }) {
  const { meta, isGrammarTask, isModuleTask, canSubmit, canViewFeedback, quizLabel } = getTaskCardModel(task);

  return (
    <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
      <SurfaceHeader
        icon={<AppIcon name="clipboard" size={16} />}
        title={meta.title || '未命名任务'}
        badge={<StatusPill status={task.status} />}
        isMobile={isMobile}
      />
      <div style={{ padding: isMobile ? '14px' : '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TaskDetails meta={meta} isGrammarTask={isGrammarTask} isModuleTask={isModuleTask} quizLabel={quizLabel} isMobile={isMobile} />
        {isGrammarTask ? <GrammarTaskSummary meta={meta} /> : null}
        {isModuleTask ? <ModuleTaskSummary meta={meta} /> : null}
        <PromptPreview promptText={meta.promptText} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: THEME.color.textMuted }}>
            {task.submittedAt ? `最近提交：${formatTime(task.submittedAt)}` : '尚未提交'}
          </div>
          <TaskCardActions
            task={task}
            canSubmit={canSubmit}
            canViewFeedback={canViewFeedback}
            isModuleTask={isModuleTask}
            onOpenTask={onOpenTask}
            onViewFeedback={onViewFeedback}
            onCompleteModule={onCompleteModule}
            completingId={completingId}
          />
        </div>
      </div>
    </SurfaceCard>
  );
}

export function MutedInfoState({ isMobile, children }) {
  return (
    <SurfaceCard style={{ padding: isMobile ? '10px 12px' : '12px 14px', background: '#f5f5f5', borderColor: '#e0e0e0', boxShadow: 'none' }}>
      <div style={{ fontSize: 13, color: '#b0b0b0', lineHeight: 1.6 }}>
        {children}
      </div>
    </SurfaceCard>
  );
}

export function EmptyTasksState({ isMobile }) {
  return (
    <MutedInfoState isMobile={isMobile}>
      暂无待完成任务。老师布置的新任务会显示在这里。
    </MutedInfoState>
  );
}

export function ModuleEntrySection({ isMobile, onNavigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <StudentSectionHeader title="继续学习" />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 12 }}>
        {MODULE_ENTRIES.map((mod) => (
          <button
            key={mod.page}
            type="button"
            onClick={() => onNavigate?.(mod.page)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '16px 18px', background: '#fafafa', border: '0.5px solid #e8e8e8', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
            onMouseEnter={(event) => { event.currentTarget.style.background = mod.hoverBg; }}
            onMouseLeave={(event) => { event.currentTarget.style.background = '#fafafa'; }}
          >
            <span style={{ display: 'inline-block', width: 28, height: 28, borderRadius: 8, background: mod.accent, opacity: 0.15, marginBottom: 2 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: THEME.color.text, display: 'block' }}>{mod.label}</span>
            <span style={{ fontSize: 12, color: THEME.color.textMuted, lineHeight: 1.5 }}>{mod.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
