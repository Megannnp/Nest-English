import { getWritingRiskFlags } from "./utils.js";
import { SurfaceCard, SurfaceHeader, SmallActionButton } from "../../components/shared/UI.jsx";

export default function DetailListSection({
  title,
  emptyText,
  items,
  renderItem,
  children,
}) {
  return (
    <SurfaceCard>
      <SurfaceHeader title={title} badge={`${items.length} 项`} />
      <div style={{ padding: "14px 22px 20px" }}>
        {children ? <div style={{ marginBottom: 10 }}>{children}</div> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.length === 0 ? (
          <div style={{ fontSize: 13, color: "#a09080", lineHeight: 1.8, paddingTop: 2 }}>{emptyText}</div>
        ) : items.map(renderItem)}
        </div>
      </div>
    </SurfaceCard>
  );
}

export function RiskFlags({ item }) {
  const { isHighRisk, isOffTopic } = getWritingRiskFlags(item);
  if (!isHighRisk && !isOffTopic) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {isHighRisk ? (
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999, background: "#fff1f2", color: "#b42318", border: "1px solid #fecdd3" }}>
          高风险
        </span>
      ) : null}
      {isOffTopic ? (
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999, background: "#fff7ed", color: "#9a6700", border: "1px solid #fed7aa" }}>
          偏题风险
        </span>
      ) : null}
    </div>
  );
}

export function DraftAssignmentRow({ item, onLoadAssignmentDetail, onPublish }) {
  return (
    <div style={{ border: "1px solid #ece6de", borderRadius: 16, background: "#faf8f5", padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#2a1f14", lineHeight: 1.5 }}>
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: "#8a7d6e", marginTop: 4, lineHeight: 1.7 }}>
          {item.className || "未关联班级"} · 满分 {item.maxScore || 15} 分
        </div>
        <div style={{ fontSize: 12, color: "#a09080", marginTop: 4 }}>
          {item.dueAt ? `截止时间：${new Date(Number(item.dueAt)).toLocaleString("zh-CN")}` : "建议补充截止时间后再发布"}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#fff7ed", color: "#9a6700" }}>
          草稿
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <SmallActionButton tone="primary" onClick={() => onPublish?.(item.id)}>发布任务</SmallActionButton>
          <SmallActionButton onClick={() => onLoadAssignmentDetail(item.id)}>继续编辑</SmallActionButton>
        </div>
      </div>
    </div>
  );
}

export function DueSoonRow({ item, onLoadAssignmentDetail }) {
  return (
    <div style={{ border: "1px solid #fed7aa", borderRadius: 16, background: "#fff7ed", padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#2a1f14", lineHeight: 1.5 }}>
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: "#8a7d6e", marginTop: 4, lineHeight: 1.7 }}>
          {item.className || "未关联班级"} · 已返回 {item.returnedCount}/{item.totalCount} 篇
        </div>
        <div style={{ fontSize: 12, color: "#9a6700", marginTop: 4 }}>
          截止时间：{item.dueAt ? new Date(Number(item.dueAt)).toLocaleString("zh-CN") : "未设置"} · 尚未完成 {item.unfinishedCount} 篇
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#ffedd5", color: "#9a6700" }}>
          即将截止
        </span>
        <SmallActionButton onClick={() => onLoadAssignmentDetail(item.id)}>查看任务</SmallActionButton>
      </div>
    </div>
  );
}
