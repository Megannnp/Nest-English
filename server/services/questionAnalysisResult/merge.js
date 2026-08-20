export function mergeQuestionAnalysis(base = {}, extra = {}) {
  const merged = { ...base, ...extra };
  const nestedKeys = [
    'storyLine',
    'emotionLine',
    'plotAnalysis',
    'starters',
    'contentAnalysis',
    'scenarioAnalysis',
    'taskAnalysis',
    'formatAnalysis',
    'materialAnalysis',
    'structureAnalysis',
    'commentaryAnalysis',
  ];
  nestedKeys.forEach((key) => {
    if (base?.[key] || extra?.[key]) {
      merged[key] = {
        ...(base?.[key] || {}),
        ...(extra?.[key] || {}),
      };
    }
  });
  return merged;
}
