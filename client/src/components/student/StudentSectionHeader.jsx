export default function StudentSectionHeader({
  title,
  subtitle = "",
  badge = "",
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#2a1f14" }}>{title}</div>
        {subtitle ? (
          <div style={{ marginTop: 4, fontSize: 12, color: "#8a7d6e", lineHeight: 1.7 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {badge ? (
        <span style={{ padding: "4px 10px", borderRadius: 999, background: "#faf8f5", border: "1px solid #ece6de", color: "#8a7d6e", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
          {badge}
        </span>
      ) : null}
    </div>
  );
}
