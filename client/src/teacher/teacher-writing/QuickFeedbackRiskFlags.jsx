export default function QuickFeedbackRiskFlags({ isHighRisk, isOffTopic }) {
  if (!isHighRisk && !isOffTopic) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {isHighRisk ? (
        <span style={{ padding: "5px 10px", borderRadius: 999, background: "#fff1f2", color: "#b42318", border: "1px solid #fecdd3", fontSize: 12, fontWeight: 700 }}>
          高风险
        </span>
      ) : null}
      {isOffTopic ? (
        <span style={{ padding: "5px 10px", borderRadius: 999, background: "#fff7ed", color: "#9a6700", border: "1px solid #fed7aa", fontSize: 12, fontWeight: 700 }}>
          偏题风险
        </span>
      ) : null}
    </div>
  );
}

