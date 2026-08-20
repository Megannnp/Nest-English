import { SmallActionButton } from "./UI.jsx";
import { THEME } from "../../styles/theme.js";

const toneMap = {
  neutral: {
    border: "rgba(95, 71, 39, 0.14)",
    background: "linear-gradient(180deg, #fffdfa 0%, #faf7f1 100%)",
    title: THEME.color.text,
    text: THEME.color.textSecondary,
  },
  loading: {
    border: "rgba(216, 154, 58, 0.2)",
    background: "linear-gradient(180deg, #fff9ef 0%, #fffdfa 100%)",
    title: THEME.color.primaryStrong,
    text: THEME.color.textSecondary,
  },
  warning: {
    border: "rgba(183, 106, 16, 0.22)",
    background: THEME.color.warningSoft,
    title: THEME.color.warning,
    text: THEME.color.textSecondary,
  },
  error: {
    border: "rgba(181, 71, 71, 0.22)",
    background: THEME.color.errorSoft,
    title: THEME.color.error,
    text: THEME.color.textSecondary,
  },
  success: {
    border: "rgba(44, 157, 105, 0.2)",
    background: THEME.color.successSoft,
    title: THEME.color.success,
    text: THEME.color.textSecondary,
  },
};

function getProductStateTone(tone) {
  return toneMap[tone] || toneMap.neutral;
}

function getProductStateAccessibility(tone) {
  return {
    role: tone === "error" ? "alert" : "status",
    ariaLive: tone === "loading" || tone === "error" ? "polite" : undefined,
  };
}

function getProductStateActionTone(tone) {
  return tone === "error" ? "soft" : "primary";
}

function ProductStateDescription({ compact, description, textColor }) {
  if (!description) {
    return null;
  }

  return (
    <div style={{ fontFamily: THEME.typography.sans, fontSize: compact ? 12 : 13, lineHeight: 1.8, color: textColor }}>
      {description}
    </div>
  );
}

function ProductStateAction({ compact, actionLabel, onAction, tone }) {
  if (!(actionLabel && onAction)) {
    return null;
  }

  return (
    <div style={{ marginTop: compact ? 4 : 6 }}>
      <SmallActionButton tone={getProductStateActionTone(tone)} onClick={onAction}>
        {actionLabel}
      </SmallActionButton>
    </div>
  );
}

export default function ProductState({
  title,
  description,
  actionLabel = "",
  onAction = null,
  tone = "neutral",
  compact = false,
  align = "left",
  style,
}) {
  const toneStyle = getProductStateTone(tone);
  const accessibility = getProductStateAccessibility(tone);

  return (
    <div
      role={accessibility.role}
      aria-live={accessibility.ariaLive}
      style={{
        padding: compact ? "14px 16px" : "20px 18px",
        borderRadius: compact ? 16 : 22,
        border: `1px solid ${toneStyle.border}`,
        background: toneStyle.background,
        textAlign: align,
        color: toneStyle.text,
        display: "grid",
        gap: compact ? 6 : 10,
        ...style,
      }}
    >
      <div style={{ fontFamily: THEME.typography.sans, fontSize: compact ? 14 : 16, fontWeight: 800, color: toneStyle.title, lineHeight: 1.4 }}>
        {title}
      </div>
      <ProductStateDescription compact={compact} description={description} textColor={toneStyle.text} />
      <ProductStateAction compact={compact} actionLabel={actionLabel} onAction={onAction} tone={tone} />
    </div>
  );
}
