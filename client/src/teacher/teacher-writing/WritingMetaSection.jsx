import {
  StatusBanner,
  SurfaceCard,
  SurfaceHeader,
} from "../../components/shared/UI.jsx";

function SourceContextBanner({
  isMobile, writingContext, currentSequenceIndex, writingSequence,
  progressTotal, progressCurrent, progressPercent, jumpHighlight,
}) {
  if (!writingContext?.sourceLabel) return null;
  return (
    <div style={{ padding: isMobile ? "0 14px 14px" : "0 18px 18px" }}>
      <StatusBanner tone="neutral">
        当前来自「{writingContext.sourceLabel}」队列
        {currentSequenceIndex >= 0 && writingSequence.length > 0 ? `，这是第 ${currentSequenceIndex + 1} / ${writingSequence.length} 篇。` : "。"}
      </StatusBanner>
      {progressTotal > 0 ? (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#8a7d6e" }}>已处理进度</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8b5e1a" }}>
              第 {progressCurrent} / {progressTotal} 篇
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "#f3ece3", overflow: "hidden" }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                borderRadius: 999,
                background: jumpHighlight ? "linear-gradient(90deg, #f4b94b 0%, #d6a44f 100%)" : "linear-gradient(90deg, #e7c67c 0%, #d6a44f 100%)",
                transition: "width 220ms ease, background 220ms ease",
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetaChip({ label, value }) {
  return (
    <div style={{ border: "1px solid #ece6de", borderRadius: 14, padding: "10px 12px", background: "#faf8f5" }}>
      <div style={{ fontSize: 11, color: "#a09080", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#2a1f14", fontWeight: 700, lineHeight: 1.5 }}>{value || "—"}</div>
    </div>
  );
}

export default function WritingMetaSection({
  isMobile,
  writing,
  user,
  feedbackStatusSummary,
  jumpHighlight,
  writingContext,
  currentSequenceIndex,
  writingSequence,
  progressTotal,
  progressCurrent,
  progressPercent,
}) {
  return (
    <SurfaceCard>
      <SurfaceHeader title="作文信息" badge={feedbackStatusSummary} isMobile={isMobile} />
      <div
        style={{
          padding: isMobile ? "14px" : "16px 18px 18px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
          gap: 10,
          borderRadius: 16,
          background: jumpHighlight ? "#fff7ed" : "transparent",
          boxShadow: jumpHighlight ? "0 0 0 2px rgba(214,164,79,0.18) inset" : "none",
          transition: "background 220ms ease, box-shadow 220ms ease",
        }}
      >
        <MetaChip label="学生" value={writing.userName || user?.realName || "—"} />
        <MetaChip label="班级" value={writing.className || "未关联班级"} />
        <MetaChip label="标题" value={writing.writingTitle || "未命名写作"} />
        <MetaChip label="来源" value={writing.source || "self"} />
      </div>
      <SourceContextBanner
        isMobile={isMobile}
        writingContext={writingContext}
        currentSequenceIndex={currentSequenceIndex}
        writingSequence={writingSequence}
        progressTotal={progressTotal}
        progressCurrent={progressCurrent}
        progressPercent={progressPercent}
        jumpHighlight={jumpHighlight}
      />
    </SurfaceCard>
  );
}
