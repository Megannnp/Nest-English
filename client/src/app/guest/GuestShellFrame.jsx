export default function GuestShellFrame({
  isMobile,
  children,
  onBackHome,
  showBrand = false,
  compact = false,
}) {
  const padding = compact
    ? (isMobile ? "8px 14px 12px" : "12px 20px 16px")
    : (isMobile ? "12px 14px 18px" : "18px 20px 24px");

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding }}>
        {showBrand ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 10 : 14, gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <img src="/logo-full.svg?v=english-close" alt="nest English" height={isMobile ? 28 : 32} style={{ display: "block" }} />
              <span style={{ marginLeft: -6, fontFamily: '"Helvetica Neue", Arial, sans-serif', fontSize: isMobile ? 13 : 14, fontWeight: 800, lineHeight: 1, color: "#1a1a1a", whiteSpace: "nowrap" }}>
                筑巢英语
              </span>
            </div>
            {onBackHome ? (
              <button
                type="button"
                onClick={onBackHome}
                style={{ padding: "6px", border: "none", background: "transparent", color: "#8a7d6e", cursor: "pointer", fontSize: 12 }}
              >
                ← 返回首页
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
