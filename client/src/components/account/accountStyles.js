export const ACCOUNT_THEME = {
  primary: "#1a1a1a",
  primaryLight: "#f5f5f5",
  primaryDark: "#000000",
  border: "#e8e8e8",
  text: "#1a1a1a",
  textSecondary: "#555555",
  textMuted: "#888888",
  success: "#2d9e6b",
  successLight: "#edfaf3",
  error: "#b02020",
  errorLight: "#fdf0ef",
  card: "#ffffff",
};

export const accountInputStyle = (extra = {}) => ({
  width: "100%",
  padding: "11px 14px",
  border: `1px solid ${ACCOUNT_THEME.border}`,
  borderRadius: 10,
  outline: "none",
  fontSize: 15,
  color: ACCOUNT_THEME.text,
  fontFamily: "sans-serif",
  background: "#fafafa",
  boxSizing: "border-box",
  ...extra,
});
