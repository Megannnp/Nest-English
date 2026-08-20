export default function AuthShell({ embedded, theme = "writing", onBack, children }) {
  const subtitleText = theme === "grammar" ? "筑巢语法" : theme === "portal" ? "nest portal" : "筑巢写作";
  const subtitleColor = theme === "grammar" ? "#6c48b8" : theme === "portal" ? "#222222" : "#c8852a";
  const titleColor = theme === "grammar" ? "#2e2840" : theme === "portal" ? "#111111" : "#2a1f14";
  return (
    <div style={{ width: "100%" }}>
      {!embedded && onBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 16,
            border: "none",
            background: "none",
            padding: 0,
            color: "#999",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>←</span>
          返回首页
        </button>
      ) : null}
      {!embedded && theme === "portal" ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 28 }}>
          <img src="/logo-full.svg?v=english-close" alt="nest English" height="36" style={{ display: "block" }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: "#111", letterSpacing: 0, whiteSpace: "nowrap" }}>筑巢英语</span>
        </div>
      ) : !embedded && (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", color: titleColor, marginBottom: 6 }}>nest</div>
          <div style={{ fontSize: 11, color: subtitleColor, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>{subtitleText}</div>
        </div>
      )}
      {children}
    </div>
  );
}
