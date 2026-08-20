const MAX_FEEDBACK_JSON_LENGTH = 1024 * 1024;

export function safeJsonParse(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function serializeFeedback(feedback) {
  const serialized = JSON.stringify(feedback);
  if (serialized.length > MAX_FEEDBACK_JSON_LENGTH) {
    throw new Error('反馈数据过大，请精简后重试');
  }
  return serialized;
}
