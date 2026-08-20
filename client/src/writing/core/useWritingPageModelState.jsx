function getGenerationProgress(value) {
  return Number(value?.generation?.progress || 0);
}

function shouldKeepActiveFeedback(currentValue, savedValue) {
  if (!savedValue) return Boolean(currentValue?.generation?.active);
  if (!(currentValue?.generation?.active && savedValue?.generation?.active)) return false;
  return getGenerationProgress(savedValue) < getGenerationProgress(currentValue);
}

export function resolveNextFeedback(currentValue, savedValue) {
  if (shouldKeepActiveFeedback(currentValue, savedValue)) return currentValue;
  return savedValue || null;
}

export function countWritingWords(text) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function resolveWritingMaxScore(maxOpt, customMax) {
  return maxOpt === "custom" ? (parseInt(customMax, 10) || 0) : parseInt(maxOpt, 10);
}

export function buildVisibleSourceTag({ guestMode, source }) {
  if (guestMode || !source || source === "teacher") {
    return null;
  }

  const isHomework = source === "homework";

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 12px",
        borderRadius: 20,
        background: isHomework ? "#fdf0d8" : "#f5f1eb",
        color: isHomework ? "#8b5e1a" : "#6a5a48",
        border: `1px solid ${isHomework ? "#f0cc80" : "#e8e0d5"}`,
        cursor: "default",
        opacity: 0.96,
      }}
    >
      {isHomework ? "任务模式" : "自由写作模式"}
    </span>
  );
}

export function buildWritingPageModelDerivedState({
  guestMode,
  source,
  taskContext,
  activeTaskContext,
  text,
  maxOpt,
  customMax,
}) {
  const currentTaskContext = taskContext || activeTaskContext;

  return {
    currentTaskContext,
    isTaskMode: Boolean(currentTaskContext),
    words: countWritingWords(text),
    max: resolveWritingMaxScore(maxOpt, customMax),
    visibleSourceTag: buildVisibleSourceTag({ guestMode, source }),
  };
}
