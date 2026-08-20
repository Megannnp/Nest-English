export function createQuestionAnalysisTimer() {
  const startedAt = Date.now();
  const stages = [];

  return {
    record(name, durationMs, extra = {}) {
      stages.push({ name, durationMs, ...extra });
    },
    snapshot(extra = {}) {
      return {
        startedAt,
        finishedAt: Date.now(),
        totalDurationMs: Date.now() - startedAt,
        stages,
        ...extra,
      };
    },
  };
}
