import { UI_THEME } from "./uiTheme.js";
import { GRADES, SURFACE_SPACING } from "../../constants/index.jsx";

export function GradeBadge({ grade, size = "sm" }) {
  const config = GRADES[grade] || GRADES["中"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: size === "lg" ? "6px 20px" : "2px 10px",
        borderRadius: 20,
        fontSize: size === "lg" ? 18 : 12,
        fontWeight: 700,
        color: config.color,
        background: config.bg,
        border: `1.5px solid ${config.border}`,
        letterSpacing: size === "lg" ? 2 : 1,
      }}
    >
      {grade}
    </span>
  );
}

export function BackHomeButton({ onClick, isMobile = false, label = "返回首页", style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: UI_THEME.fontFamily,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: isMobile ? 38 : 42,
        minWidth: isMobile ? 104 : 116,
        padding: isMobile ? "0 12px" : "0 16px",
        borderRadius: 999,
        border: `1px solid ${UI_THEME.lineStrong}`,
        background: "rgba(255,255,255,0.88)",
        color: UI_THEME.primaryDark,
        fontSize: isMobile ? 12 : 13,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 10px 24px rgba(64, 46, 23, 0.06)",
        backdropFilter: "blur(10px)",
        ...style,
      }}
    >
      <span style={{ fontSize: isMobile ? 14 : 15, lineHeight: 1 }}>←</span>
      <span>{label}</span>
    </button>
  );
}

export function SecLbl({ children, style }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#c8852a",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginBottom: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SurfaceCard({ children, style }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(255,253,249,0.98) 0%, rgba(255,255,255,0.96) 100%)",
        border: `1px solid ${UI_THEME.line}`,
        borderRadius: 28,
        boxShadow: UI_THEME.shadow,
        backdropFilter: "blur(18px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SurfaceHeader({ icon, title, badge, action, isMobile = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: isMobile ? "18px 16px 0" : "20px 22px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {icon ? <span style={{ fontSize: 16 }}>{icon}</span> : null}
        <span
          style={{
            fontFamily: UI_THEME.fontFamily,
            fontSize: isMobile ? 16 : 19,
            fontWeight: 800,
            color: UI_THEME.text,
            minWidth: 0,
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </span>
        {badge ? (
          <span
            style={{
              fontFamily: UI_THEME.fontFamily,
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 999,
              background: UI_THEME.primarySoft,
              color: UI_THEME.primaryDark,
              fontWeight: 700,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      {action || null}
    </div>
  );
}

export function StatusBanner({ tone = "neutral", children, style }) {
  const tones = {
    neutral: { color: UI_THEME.textSecondary, background: UI_THEME.panelAlt, border: "rgba(95, 71, 39, 0.08)" },
    success: { color: UI_THEME.success, background: UI_THEME.successSoft, border: "rgba(44, 157, 105, 0.18)" },
    warning: { color: UI_THEME.warning, background: UI_THEME.warningSoft, border: "rgba(183, 106, 16, 0.18)" },
    error: { color: UI_THEME.error, background: UI_THEME.errorSoft, border: "rgba(181, 71, 71, 0.18)" },
  };
  const toneStyle = tones[tone] || tones.neutral;

  return (
    <div
      style={{
        fontSize: 12,
        lineHeight: 1.75,
        fontFamily: UI_THEME.fontFamily,
        color: toneStyle.color,
        background: toneStyle.background,
        border: `1px solid ${toneStyle.border}`,
        borderRadius: 18,
        padding: "12px 15px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SmallActionButton({ children, tone = "subtle", disabled = false, style, "aria-label": ariaLabel, ...props }) {
  const tones = {
    subtle: {
      background: "rgba(255,255,255,0.92)",
      color: UI_THEME.primaryDark,
      border: `1px solid ${UI_THEME.line}`,
    },
    primary: {
      background: "linear-gradient(135deg, #d89a3a 0%, #c67f23 100%)",
      color: "#fff",
      border: "1px solid rgba(198,127,35,0.88)",
    },
    soft: {
      background: UI_THEME.primarySoft,
      color: UI_THEME.primaryDark,
      border: "1px solid rgba(216,154,58,0.22)",
    },
  };
  const toneStyle = tones[tone] || tones.subtle;

  return (
    <button
      type="button"
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
      disabled={disabled}
      style={{
        fontFamily: UI_THEME.fontFamily,
        padding: "9px 15px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        boxShadow:
          tone === "primary"
            ? "0 14px 28px rgba(198, 127, 35, 0.22)"
            : "0 8px 18px rgba(64, 46, 23, 0.04)",
        ...toneStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function ActionPanel({ children, isMobile = false, style }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        flexWrap: "wrap",
        paddingTop: isMobile ? 8 : 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PageHeader({ titleZh, subtitle, isMobile, children, actions }) {
  return (
    <div
      style={{
        marginBottom: isMobile
          ? SURFACE_SPACING.headerToFirstSurfaceMobile
          : SURFACE_SPACING.headerToFirstSurface,
        minHeight: isMobile ? 54 : 64,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: isMobile ? 10 : 14,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minHeight: isMobile ? 54 : 64,
        }}
      >
        <h2
          style={{
            fontSize: isMobile ? 22 : 28,
            fontWeight: 800,
            color: UI_THEME.text,
            margin: "0 0 6px",
            fontFamily: UI_THEME.fontFamily,
            letterSpacing: "-0.06em",
            lineHeight: 1.08,
          }}
        >
          {titleZh}
        </h2>
        {subtitle ? (
          <p
            style={{
              fontFamily: UI_THEME.fontFamily,
              fontSize: isMobile ? 12 : 13,
              color: UI_THEME.textMuted,
              margin: 0,
              lineHeight: 1.7,
              maxWidth: 760,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions || children ? (
        <div style={{ minHeight: isMobile ? 54 : 64, display: "flex", alignItems: "center" }}>
          {actions || children}
        </div>
      ) : null}
    </div>
  );
}

export function MetricCard({ label, value, helper, style }) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.78)",
        border: `1px solid ${UI_THEME.line}`,
        backdropFilter: "blur(10px)",
        boxShadow: "0 12px 28px rgba(74, 52, 24, 0.06)",
        ...style,
      }}
    >
      <div style={{ fontFamily: UI_THEME.fontFamily, fontSize: 12, color: UI_THEME.textMuted, marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: UI_THEME.fontFamily,
          fontSize: 30,
          fontWeight: 800,
          color: UI_THEME.text,
          lineHeight: 1,
          letterSpacing: "-0.05em",
        }}
      >
        {value}
      </div>
      {helper ? (
        <div style={{ fontFamily: UI_THEME.fontFamily, marginTop: 8, fontSize: 12, color: UI_THEME.textMuted, lineHeight: 1.7 }}>
          {helper}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyStateCard({ title, description, action = null, style }) {
  return (
    <div
      style={{
        padding: "22px 20px",
        borderRadius: 22,
        border: `1px dashed ${UI_THEME.lineStrong}`,
        background: "linear-gradient(180deg, #fffdfa 0%, #faf7f1 100%)",
        color: UI_THEME.textSecondary,
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: UI_THEME.fontFamily,
          fontSize: 18,
          fontWeight: 800,
          color: UI_THEME.text,
          lineHeight: 1.3,
          letterSpacing: "-0.03em",
        }}
      >
        {title}
      </div>
      {description ? (
        <div style={{ fontFamily: UI_THEME.fontFamily, marginTop: 8, fontSize: 13, lineHeight: 1.8 }}>
          {description}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}
