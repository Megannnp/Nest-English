import AppIcon from "../../components/shared/AppIcon.jsx";
import { SurfaceCard, SurfaceHeader, SmallActionButton, StatusBanner } from "../../components/shared/UI.jsx";

function TodoStatCard({ icon, label, value, hint, actionLabel, onAction, tone = "default" }) {
  const toneMap = {
    default: { bg: "linear-gradient(180deg, #fff 0%, #faf8f5 100%)", color: "#2a1f14", border: "#ece6de", accent: "#d8cfc4" },
    warm: { bg: "linear-gradient(180deg, #fff8ef 0%, #fff4e5 100%)", color: "#9a6700", border: "#fed7aa", accent: "#f5c177" },
    success: { bg: "linear-gradient(180deg, #f6fff9 0%, #eefbf2 100%)", color: "#166534", border: "#bbf7d0", accent: "#7fe3a8" },
  };
  const token = toneMap[tone] || toneMap.default;

  return (
    <div style={{ border: `1px solid ${token.border}`, borderRadius: 22, padding: "20px 18px 18px", background: token.bg, display: "flex", flexDirection: "column", gap: 14, minHeight: 228, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: "0 auto 0 0", width: 4, background: token.accent, opacity: 0.9 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 2, minHeight: 28 }}>
        <span style={{ lineHeight: 1, color: token.color }}><AppIcon name={icon} size={18} /></span>
        <div style={{ fontSize: 14, color: "#7e6d5a", fontWeight: 700, lineHeight: 1.4 }}>{label}</div>
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, color: token.color, lineHeight: 1, letterSpacing: -1.5, marginTop: 2, minHeight: 44 }}>{value}</div>
      <div style={{ fontSize: 14, color: "#7f7264", lineHeight: 1.9, minHeight: 96, paddingRight: 8 }}>{hint}</div>
      <div style={{ marginTop: "auto", paddingTop: 10 }}>
        <SmallActionButton onClick={onAction} disabled={!onAction}>{actionLabel}</SmallActionButton>
      </div>
    </div>
  );
}

export default function TodoOverviewSection({
  todo,
  activeTodoFilter,
  setActiveTodoFilter,
  setManualTodoFilterUntil,
  autoFocusHint,
  isMobile = false,
  pendingGradings: _pendingGradings,
  pendingComments: _pendingComments,
  exceptions: _exceptions,
  dueSoonAssignments: _dueSoonAssignments,
  draftAssignments: _draftAssignments,
  gradingRiskCount = 0,
  gradingOffTopicCount = 0,
  commentRiskCount = 0,
  commentOffTopicCount = 0,
  onOpenTodoScene,
}) {
  return (
    <SurfaceCard>
      <SurfaceHeader
        title="今日待办"
        badge={`${todo.draftCount + todo.pendingGradings + todo.pendingComments + todo.exceptionCount + todo.dueSoonCount} 项`}
      />
      {autoFocusHint ? (
        <StatusBanner tone={activeTodoFilter === "exceptions" ? "warning" : "neutral"} style={{ margin: "14px 18px 0" }}>
          {autoFocusHint}
        </StatusBanner>
      ) : null}
      <div style={{ padding: isMobile ? "14px 14px 16px" : "18px 18px 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <TodoStatCard
            icon="notepad"
            label="待发布任务"
            value={todo.draftCount}
            hint="建议先补齐班级、题目和截止时间，再统一发布给学生。"
            actionLabel="查看清单"
            onAction={() => onOpenTodoScene?.("drafts")}
          />
          <TodoStatCard
            icon="pen-line"
            label="待批改作文"
            value={todo.pendingGradings}
            hint={todo.pendingGradings
              ? `当前队列里有 ${gradingRiskCount} 篇高风险作文${gradingOffTopicCount ? `，其中 ${gradingOffTopicCount} 篇存在偏题风险` : ""}，建议优先处理。`
              : "优先处理学生已提交但尚未完成快速反馈的作文。"}
            actionLabel="查看清单"
            onAction={() => onOpenTodoScene?.("gradings")}
            tone="success"
          />
          <TodoStatCard
            icon="message"
            label="待补教师评价"
            value={todo.pendingComments}
            hint={todo.pendingComments
              ? `当前有 ${commentRiskCount} 篇高风险作文还未补教师评价${commentOffTopicCount ? `，其中 ${commentOffTopicCount} 篇存在偏题风险` : ""}。`
              : "快速反馈已返回，但教师评价尚未补充，适合继续完成教学反馈。"}
            actionLabel="查看清单"
            onAction={() => onOpenTodoScene?.("comments")}
          />
          <TodoStatCard
            icon="alert"
            label="异常待处理"
            value={todo.exceptionCount}
            hint="包括 OCR、题目分析或详细反馈失败，需要人工重试或重放。"
            actionLabel="查看清单"
            onAction={() => onOpenTodoScene?.("exceptions")}
            tone="warm"
          />
          <TodoStatCard
            icon="alarm"
            label="48小时内截止"
            value={todo.dueSoonCount}
            hint="建议优先查看即将截止但尚未完成的任务，及时提醒学生提交。"
            actionLabel="查看清单"
            onAction={() => onOpenTodoScene?.("dueSoon")}
            tone="warm"
          />
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 22,
            paddingTop: 6,
          }}
        >
          {[
            { id: "all", label: "全部待办" },
            { id: "drafts", label: `草稿 ${todo.draftCount}` },
            { id: "gradings", label: `待批改 ${todo.pendingGradings}` },
            { id: "comments", label: `待评价 ${todo.pendingComments}` },
            { id: "exceptions", label: `异常 ${todo.exceptionCount}` },
            { id: "dueSoon", label: `48小时内截止 ${todo.dueSoonCount}` },
          ].map((item) => (
            <button type="button"
              key={item.id}
              onClick={() => {
                setManualTodoFilterUntil(Date.now() + 5 * 60 * 1000);
                setActiveTodoFilter(item.id);
              }}
              style={{
                padding: "9px 18px",
                borderRadius: 999,
                border: activeTodoFilter === item.id ? "1px solid #d6a44f" : "1px solid #ece6de",
                background: activeTodoFilter === item.id ? "#fff7ed" : "#fff",
                color: activeTodoFilter === item.id ? "#8b5e1a" : "#8a7d6e",
                fontSize: 13,
                fontWeight: activeTodoFilter === item.id ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </SurfaceCard>
  );
}
