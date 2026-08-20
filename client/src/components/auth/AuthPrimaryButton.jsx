import { MODULE_COLORS } from "../../styles/moduleColors.js";

function getButtonTheme(theme) {
  if (theme === "grammar") {
    return {
      background: MODULE_COLORS.grammar.gradient,
      disabledBackground: MODULE_COLORS.grammar.disabledBackground,
      shadow: MODULE_COLORS.grammar.shadow,
    };
  }

  if (theme === "reading") {
    return {
      background: MODULE_COLORS.reading.gradient,
      disabledBackground: MODULE_COLORS.reading.disabledBackground,
      shadow: MODULE_COLORS.reading.shadow,
    };
  }

  if (theme === "portal") {
    return {
      background: "linear-gradient(135deg, #2a2724 0%, #171411 55%, #050505 100%)",
      disabledBackground: "#b8b8b8",
      shadow: "0 16px 36px rgba(0, 0, 0, 0.16)",
    };
  }

  return {
    background: MODULE_COLORS.writing.gradient,
    disabledBackground: MODULE_COLORS.writing.disabledBackground,
    shadow: MODULE_COLORS.writing.shadow,
  };
}

export default function AuthPrimaryButton({ children, loading, disabled, onClick, type = "button", theme = "writing" }) {
  const buttonTheme = getButtonTheme(theme);
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      aria-label={loading ? "处理中" : typeof children === "string" ? children : undefined}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        width: "100%",
        padding: "14px",
        borderRadius: "100px",
        border: "none",
        background: isDisabled ? buttonTheme.disabledBackground : buttonTheme.background,
        color: "#fff",
        fontSize: 15,
        fontWeight: 700,
        cursor: isDisabled ? "not-allowed" : "pointer",
        boxShadow: isDisabled ? "none" : buttonTheme.shadow,
        transition: "background 0.2s, box-shadow 0.2s, transform 0.2s",
        letterSpacing: "0.01em",
      }}
    >
      {loading ? "处理中…" : children}
    </button>
  );
}
