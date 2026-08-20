import DetailListSection, { RiskFlags } from "./DetailListSection.jsx";
import { getWritingRiskFlags } from "./utils.js";
import AppIcon from "../../components/shared/AppIcon.jsx";
import { SurfaceCard, SurfaceHeader, SmallActionButton, StatusBanner } from "../../components/shared/UI.jsx";

const actionCardStyle = {
  borderRadius: 26,
  border: "1px solid rgba(80, 61, 35, 0.08)",
  boxShadow: "0 18px 40px rgba(95, 70, 35, 0.08)",
};

const WRITING_ACCENT = {
  border: "#d8c4a8",
  text: "#5f3d18",
  soft: "#f4eadc",
};

function QueueFilterBar({ options = [], activeValue = "all", onChange, withMargin = false }) {
  if (!options.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: withMargin ? 10 : 0 }}>
      <button type="button"
        onClick={() => onChange("all")}
        style={{
          padding: "6px 12px",
          borderRadius: 999,
          border: activeValue === "all" ? `1px solid ${WRITING_ACCENT.border}` : "1px solid #ece6de",
          background: activeValue === "all" ? WRITING_ACCENT.soft : "#fff",
          color: activeValue === "all" ? WRITING_ACCENT.text : "#8a7d6e",
          fontSize: 12,
          fontWeight: activeValue === "all" ? 700 : 500,
          cursor: "pointer",
        }}
      >
        全部班级
      </button>
      {options.map((className) => (
        <button type="button"
          key={className}
          onClick={() => onChange(className)}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: activeValue === className ? `1px solid ${WRITING_ACCENT.border}` : "1px solid #ece6de",
            background: activeValue === className ? WRITING_ACCENT.soft : "#fff",
            color: activeValue === className ? WRITING_ACCENT.text : "#8a7d6e",
            fontSize: 12,
            fontWeight: activeValue === className ? 700 : 500,
            cursor: "pointer",
          }}
        >
          {className}
        </button>
      ))}
    </div>
  );
}

function QueueWritingRow({ item, badgeLabel, badgeTone, summaryText, actionLabel, onAction }) {
  return (
    <div style={{ border: "1px solid #ece6de", borderRadius: 16, background: "#faf8f5", padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#2a1f14", lineHeight: 1.5 }}>
          {item.userName} · {item.assignmentTitle}
        </div>
        <div style={{ fontSize: 12, color: "#8a7d6e", marginTop: 4, lineHeight: 1.7 }}>
          {item.className || "未关联班级"} · {item.writingTitle || "未命名写作"}
          {item.totalScore != null ? ` · ${item.totalScore}/${item.maxScore || 15}分` : ""}
        </div>
        <div style={{ fontSize: 12, color: "#a09080", marginTop: 4, lineHeight: 1.7 }}>
          {summaryText}
        </div>
        <RiskFlags item={item} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: badgeTone.background, color: badgeTone.color }}>
          {badgeLabel}
        </span>
        <SmallActionButton onClick={onAction}>{actionLabel}</SmallActionButton>
      </div>
    </div>
  );
}

export function PendingGradingsSection({
  visible,
  classOptions,
  activeClassFilter,
  onChangeClassFilter,
  items,
  onOpenWriting,
}) {
  if (!visible) return null;

  return (
    <DetailListSection
      title="待批改详情"
      emptyText={activeClassFilter === "all"
        ? "当前没有待批改作文。学生提交后会出现在这里。"
        : "当前这个班级没有待批改作文。"}
      items={items}
      renderItem={(item) => {
        const { isOffTopic } = getWritingRiskFlags(item);
        return (
          <QueueWritingRow
            key={item.id}
            item={item}
            badgeLabel={item.taskStatus === "returned" ? "待评价" : "批改中"}
            badgeTone={item.taskStatus === "returned"
              ? { background: WRITING_ACCENT.soft, color: WRITING_ACCENT.text }
              : { background: "#f0fdf4", color: "#166534" }}
            summaryText={item.taskStatus === "returned"
              ? (item.teacherCommentReady ? "教师评价已补充" : `快速反馈已返回${isOffTopic ? "，建议优先处理偏题风险" : "，待补教师评价"}`)
              : "等待快速反馈完成"}
            actionLabel="进入批改"
            onAction={() => onOpenWriting(item, item.taskStatus === "returned" ? "teacher_pending" : "ai_pending", items, "待批改详情")}
          />
        );
      }}
    >
      <QueueFilterBar options={classOptions} activeValue={activeClassFilter} onChange={onChangeClassFilter} />
    </DetailListSection>
  );
}

export function PendingCommentsSection({
  visible,
  classOptions,
  activeClassFilter,
  onChangeClassFilter,
  items,
  onOpenWriting,
}) {
  if (!visible) return null;

  return (
    <DetailListSection
      title="待补教师评价"
      emptyText={activeClassFilter === "all"
        ? "当前没有待补教师评价的作文。快速反馈返回后，这里会提示需要继续完成教学反馈的内容。"
        : "当前这个班级没有待补教师评价的作文。"}
      items={items}
      renderItem={(item) => (
        <QueueWritingRow
          key={item.id}
          item={item}
          badgeLabel="待评价"
          badgeTone={{ background: WRITING_ACCENT.soft, color: WRITING_ACCENT.text }}
          summaryText={item.quickSummary || "快速反馈已返回，建议补充教师评价，帮助学生更明确下一步改进方向。"}
          actionLabel="去评价"
          onAction={() => onOpenWriting(item, "teacher_pending", items, "待补教师评价")}
        />
      )}
    >
      <QueueFilterBar options={classOptions} activeValue={activeClassFilter} onChange={onChangeClassFilter} withMargin />
    </DetailListSection>
  );
}

export function ExceptionsSection({ visible, items, onOpenWriting }) {
  if (!visible) return null;

  return (
    <DetailListSection
      title="异常详情"
      emptyText="当前没有异常任务。OCR、精批或题目分析失败时会显示在这里。"
      items={items}
      renderItem={(item) => (
        <div key={item.id} style={{ border: "1px solid #fed7aa", borderRadius: 16, background: "#fff7ed", padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2a1f14", lineHeight: 1.5 }}>
              {item.userName} · {item.assignmentTitle}
            </div>
            <div style={{ fontSize: 12, color: "#8a7d6e", marginTop: 4, lineHeight: 1.7 }}>
              {item.className || "未关联班级"} · {item.taskType}
            </div>
            <div style={{ fontSize: 12, color: "#9a6700", marginTop: 6, lineHeight: 1.7 }}>
              {item.errorMessage}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#ffedd5", color: "#9a6700" }}>
              需处理
            </span>
            <SmallActionButton onClick={() => onOpenWriting(item, "all", items, "异常详情")}>去处理</SmallActionButton>
          </div>
        </div>
      )}
    />
  );
}

export function UploadEntrySection({ isMobile = false, onNavigate }) {
  const cards = [
    {
      title: "批量批改",
      action: "进入批量批改",
      eyebrow: "整批处理",
      target: "batch-grading",
      tone: { accent: "#4b9a68", icon: "layers" },
    },
    {
      title: "代学生上传",
      action: "进入代传",
      eyebrow: "补录入口",
      target: "substitute-upload",
      tone: { accent: "#d48b63", icon: "pen-line" },
    },
  ];

  return (
    <SurfaceCard
      style={{
        ...actionCardStyle,
        background: "linear-gradient(180deg, #fffdfa 0%, #fff 100%)",
        overflow: "hidden",
      }}
    >
      <SurfaceHeader title="AI智能批改" />
      <div style={{ padding: isMobile ? "16px 14px 18px" : "18px 20px 22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 18, alignItems: "stretch" }}>
          {cards.map((item) => (
            <div
              key={item.title}
              style={{
                border: "1px solid rgba(99, 74, 39, 0.1)",
                borderRadius: 22,
                padding: isMobile ? "16px 14px 14px" : "18px 16px 16px",
                background: "linear-gradient(180deg, #fffdfa 0%, #fff 100%)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                minHeight: isMobile ? "auto" : 182,
                position: "relative",
                overflow: "hidden",
                textAlign: "left",
                boxShadow: "0 16px 34px rgba(99, 74, 39, 0.08)",
                transition: "transform 160ms ease, box-shadow 160ms ease",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.1, color: item.tone.accent, textTransform: "uppercase" }}>
                {item.eyebrow}
              </div>
              <div style={{ fontSize: 20, lineHeight: 1, paddingLeft: 2, marginBottom: 2 }}>
                <AppIcon name={item.tone.icon} size={22} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#3a2f24", lineHeight: 1.3 }}>{item.title}</div>
              <div style={{ paddingTop: 8, marginTop: "auto" }}>
                <SmallActionButton
                  tone="soft"
                  onClick={(event) => {
                    event.stopPropagation();
                    onNavigate?.(item.target);
                  }}
                  style={{ padding: "8px 14px", borderRadius: 999 }}
                >
                  {item.action}
                </SmallActionButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SurfaceCard>
  );
}

export function RecentAssignmentsSection({
  loading,
  assignments,
  selectedAssignmentId,
  onLoadAssignmentDetail,
  onPublish,
  onClose,
  onArchive,
  onExport,
}) {
  return (
    <SurfaceCard
      style={{
        ...actionCardStyle,
        background: "linear-gradient(180deg, #fffdfa 0%, #fff 100%)",
      }}
    >
      <SurfaceHeader title="最近任务" badge={loading ? "加载中" : `${assignments.length} 项`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 20px 20px" }}>
        {!loading && assignments.length === 0 ? (
          <StatusBanner tone="neutral" style={{ borderRadius: 18, padding: "14px 16px", background: "#fcfaf7" }}>
            还没有写作任务。右侧已经是完整的新建面板，填好班级和题目就能直接创建。
          </StatusBanner>
        ) : null}

        {assignments.slice(0, 5).map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            selected={selectedAssignmentId === assignment.id}
            onSelect={() => onLoadAssignmentDetail(assignment.id)}
            onPublish={() => onPublish(assignment.id)}
            onClose={() => onClose(assignment.id)}
            onArchive={() => onArchive(assignment.id)}
            onExport={(type) => onExport(assignment.id, type)}
          />
        ))}
      </div>
    </SurfaceCard>
  );
}
