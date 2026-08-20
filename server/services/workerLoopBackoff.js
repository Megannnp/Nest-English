export function createWorkerLoopBackoff({
  baseDelayMs = 1000,
  maxDelayMs = 30000,
  multiplier = 2,
  now = () => Date.now(),
} = {}) {
  let failureCount = 0;
  let blockedUntil = 0;

  function getCurrentDelayMs() {
    if (failureCount <= 0) return 0;
    return Math.min(
      maxDelayMs,
      Math.round(baseDelayMs * (multiplier ** Math.max(0, failureCount - 1)))
    );
  }

  return {
    shouldSkip() {
      return now() < blockedUntil;
    },
    getRetryAfterMs() {
      return Math.max(0, blockedUntil - now());
    },
    recordFailure() {
      failureCount += 1;
      blockedUntil = now() + getCurrentDelayMs();
      return this.getRetryAfterMs();
    },
    recordSuccess() {
      failureCount = 0;
      blockedUntil = 0;
    },
    getFailureCount() {
      return failureCount;
    },
  };
}
