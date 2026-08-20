export default function QuickFeedbackGrammarIssues({ issues, title = "主要问题" }) {
  if (!Array.isArray(issues) || !issues.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#2a1f14" }}>{title}</div>
      {issues.slice(0, 6).map((issue, index) => (
        <div
          key={`${issue}-${index}`}
          style={{ fontSize: 12, color: "#8a7d6e", lineHeight: 1.8, background: "#faf8f5", border: "1px solid #ece6de", borderRadius: 12, padding: "8px 10px" }}
        >
          {issue}
        </div>
      ))}
    </div>
  );
}
