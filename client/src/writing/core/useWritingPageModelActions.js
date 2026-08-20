export function shouldTriggerPromptAnalysis(e) {
  return e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
}

export function canAnalyzePromptText(promptText, text) {
  return (String(promptText || '').trim().length > 10 || String(text || '').trim().length > 10);
}

export function createPromptKeyDownHandler({ promptText, text, analyzeTags }) {
  return (e) => {
    if (!shouldTriggerPromptAnalysis(e)) return;
    e.preventDefault();
    if (canAnalyzePromptText(promptText, text)) {
      analyzeTags(true);
    }
  };
}
