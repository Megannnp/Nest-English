function HighlightCard({ title, content }) {
  return (
    <div style={{ border: "1px solid #ece6de", borderRadius: 14, background: "#faf8f5", padding: "10px 12px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#2a1f14", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#8a7d6e", lineHeight: 1.7 }}>{content}</div>
    </div>
  );
}

export default function QuickFeedbackHighlights({ highlights }) {
  if (!highlights) return null;

  const contentText = (highlights.content || []).slice(0, 3).join("；") || "暂未提取明显内容亮点";
  const vocabularyText = (highlights.vocabulary || []).slice(0, 2).map((item) => item.word || item).join("；") || "暂未提取明显表达亮点";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
      <HighlightCard title="内容亮点" content={contentText} />
      <HighlightCard title="表达亮点" content={vocabularyText} />
    </div>
  );
}

