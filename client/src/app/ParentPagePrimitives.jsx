import { THEME } from "../styles/theme.js";

export const PARENT_COLOR = {
  page: THEME.color.neutralPage,
  surface: THEME.color.neutralSurface,
  surfaceMuted: THEME.color.neutralSurfaceMuted,
  text: THEME.color.neutralText,
  textSecondary: THEME.color.neutralTextSecondary,
  textMuted: THEME.color.neutralTextMuted,
  border: THEME.color.neutralBorder,
  borderStrong: THEME.color.neutralBorderStrong,
  inverse: THEME.color.neutralInverse,
};

export const parentShadow = "none";

export const PARENT_MODULES = [
  { key: "writing", label: "作文", valueKeys: ["totalWritings", "total"] },
  { key: "grammar", label: "语法", valueKeys: ["sessions", "totalQuestions", "total"] },
  { key: "reading", label: "阅读", valueKeys: ["sessions", "totalQuestions", "total"] },
  { key: "vocabulary", label: "词汇", valueKeys: ["sessions", "total"] },
  { key: "listening", label: "听力", valueKeys: ["sessions", "total"] },
  { key: "phonetics", label: "音标", valueKeys: ["sessions", "total"] },
];

export const MODULE_LABELS = {
  writing: "作文",
  grammar: "语法",
  reading: "阅读",
  vocabulary: "词汇",
  vocab: "词汇",
  listening: "听力",
  phonetics: "音标",
  speaking: "口语",
  camp: "营地课程",
  module: "模块",
};

export function ParentSurface({ children, style }) {
  return (
    <div
      style={{
        background: PARENT_COLOR.surface,
        border: `1px solid ${PARENT_COLOR.border}`,
        borderRadius: 8,
        boxShadow: parentShadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ParentButton({ children, active = false, disabled = false, style, ...props }) {
  return (
    <button
      type="button"
      aria-label={typeof children === "string" ? children : undefined}
      disabled={disabled}
      style={{
        border: `1px solid ${active ? PARENT_COLOR.text : PARENT_COLOR.borderStrong}`,
        borderRadius: 8,
        background: active ? PARENT_COLOR.text : PARENT_COLOR.surface,
        color: active ? PARENT_COLOR.inverse : PARENT_COLOR.text,
        cursor: disabled ? "not-allowed" : "pointer",
        font: "inherit",
        fontSize: 13,
        fontWeight: 700,
        opacity: disabled ? 0.55 : 1,
        padding: "9px 14px",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function ParentNotice({ children }) {
  return (
    <ParentSurface style={{ padding: "12px 14px", background: PARENT_COLOR.surfaceMuted }}>
      <span style={{ color: PARENT_COLOR.textSecondary, fontSize: 13, lineHeight: 1.7 }}>{children}</span>
    </ParentSurface>
  );
}

export function ParentPanelHeader({ title, isMobile = false }) {
  return (
    <div style={{ padding: isMobile ? "16px 16px 0" : "18px 20px 0" }}>
      <h2 style={{ margin: 0, color: PARENT_COLOR.text, fontSize: isMobile ? 17 : 19, fontWeight: 800 }}>{title}</h2>
    </div>
  );
}
