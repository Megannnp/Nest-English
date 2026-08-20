import { extractStatusFromMessage } from './errors.js';
import { logWarn } from '../../utils/logger.js';

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

function shouldRetryAIError(error) {
  const message = String(error?.message || '');

  // Prefer structured statusCode; fall back to parsing legacy message strings.
  const httpStatus = error?.statusCode ?? extractStatusFromMessage(message);
  if (httpStatus != null) return RETRYABLE_HTTP_STATUSES.has(httpStatus);

  return (
    message.includes('超时') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT')
  );
}

export async function withAIRetry(task, { retries = 1, label = 'AI 请求' } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && shouldRetryAIError(error);
      logWarn('ai_retry_attempt', {
        label,
        attempt: attempt + 1,
        maxAttempts: retries + 1,
        canRetry,
        message: error.message,
      });
      if (!canRetry) break;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError;
}
