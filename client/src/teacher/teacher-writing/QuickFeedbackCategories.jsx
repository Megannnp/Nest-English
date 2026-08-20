export default function QuickFeedbackCategories({ categories }) {
  if (!Array.isArray(categories) || !categories.length) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {categories.map((item, index) => (
        <div
          key={`${item.name || "category"}-${index}`}
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
          <div style={{ fontSize: 12, fontWeight: 800, color: "#8b5e1a" }}>
            {item.icon ? `${item.icon} ` : null}{item.name || "维度"} · {item.grade || "待定"}
          </div>
          {item.comment ? (
            <div style={{ fontSize: 12, color: "#2a1f14", lineHeight: 1.7 }}>{item.comment}</div>
          ) : null}
          {Array.isArray(item.suggestions) && item.suggestions.length ? (
            <div style={{ fontSize: 11, color: "#8a7d6e", lineHeight: 1.7 }}>
              {item.suggestions.slice(0, 2).join("；")}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

