function MetaChip({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #ece6de",
        borderRadius: 14,
        background: "#faf8f5",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 11, color: "#8a7d6e", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#2a1f14" }}>{value}</div>
    </div>
  );
}

export default function QuickFeedbackMetrics({ result }) {
  const mainProblemsCount = Array.isArray(result.mainProblems) ? result.mainProblems.length : 0;
  const nextActionsCount = Array.isArray(result.nextActions) ? result.nextActions.length : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
      <MetaChip label="总分" value={result.totalScore != null ? `${result.totalScore}/${result.maxScore || "—"}` : "—"} />
      <MetaChip label="等级" value={result.tier || "待判定"} />
      <MetaChip label="核心问题" value={`${mainProblemsCount || (Array.isArray(result.weaknesses) ? result.weaknesses.length : 0)} 项`} />
      <MetaChip label="修改动作" value={`${nextActionsCount || (Array.isArray(result.improvements) ? result.improvements.length : 0)} 条`} />
    </div>
  );
}
