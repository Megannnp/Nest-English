import { ACCOUNT_THEME } from "./accountStyles.js";
import ProductState from "../shared/ProductState.jsx";

export function AccountPageShell({ children, style }) {
  return (
    <div
      style={{
        width: "min(860px, 100%)",
        margin: "0 auto",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatusMessage({ state }) {
  if (!state) return null;
  return (
    <ProductState
      compact
      tone={state.tone || "neutral"}
      title={state.title || "状态更新"}
      description={state.description || ""}
      actionLabel={state.actionLabel || ""}
      onAction={state.onAction || null}
    />
  );
}

export function StatusBadge({ tone = "neutral", children }) {
  const styles = {
    neutral: { color: ACCOUNT_THEME.textMuted, background: "#f5f1eb" },
    success: { color: ACCOUNT_THEME.success, background: ACCOUNT_THEME.successLight },
    pending: { color: "#b06000", background: "#fff8e6" },
  };
  const toneStyle = styles[tone] || styles.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        ...toneStyle,
      }}
    >
      {children}
    </span>
  );
}

export function SectionCard({ title, hint, children, isMobile = false }) {
  return (
    <div
      style={{
        background: ACCOUNT_THEME.card,
        borderRadius: 14,
        border: `1px solid ${ACCOUNT_THEME.border}`,
        padding: isMobile ? 16 : 20,
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 12 : 14,
      }}
    >
      {title || hint ? (
        <div>
          {title ? (
            <div style={{ fontSize: 15, fontWeight: 700, color: ACCOUNT_THEME.text, lineHeight: 1.4 }}>
              {title}
            </div>
          ) : null}
          {hint ? (
            <div style={{ fontSize: 12, color: ACCOUNT_THEME.textMuted, marginTop: 4, lineHeight: 1.7 }}>
              {hint}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function ActionButton({ children, onClick, disabled, tone = "primary", full = false }) {
  const styles = {
    primary: {
      background: disabled ? "#efe7dc" : ACCOUNT_THEME.primary,
      color: disabled ? "#a09080" : "#fff",
      border: "none",
    },
    subtle: {
      background: "#faf6f0",
      color: ACCOUNT_THEME.primaryDark,
      border: `1px solid ${ACCOUNT_THEME.border}`,
    },
  };
  const style = styles[tone] || styles.primary;

  return (
    <button
      type="button"
      aria-label={typeof children === "string" ? children : undefined}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: full ? "100%" : "auto",
        padding: "11px 16px",
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
