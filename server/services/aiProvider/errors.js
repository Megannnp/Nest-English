function _classifyByHttpStatus(httpStatus) {
  if (httpStatus === 401) return { code: 'AI_AUTH_ERROR', status: 502 };
  if (httpStatus === 404) return { code: 'AI_MODEL_NOT_FOUND', status: 502 };
  if (httpStatus === 429) return { code: 'AI_RATE_LIMIT', status: 429 };
  if (httpStatus >= 500 && httpStatus <= 504) return { code: 'AI_UPSTREAM_ERROR', status: 502 };
  return null;
}

function _classifyByMessage(message) {
  if (message.includes('超时')) return { code: 'AI_TIMEOUT', status: 504 };
  if (message.includes('AI 返回为空')) return { code: 'AI_EMPTY_RESPONSE', status: 502 };
  if (message.includes('AI 返回格式错误')) return { code: 'AI_INVALID_JSON', status: 502 };
  if (message.includes('网络连接失败') || message.includes('fetch failed')) return { code: 'AI_NETWORK_ERROR', status: 503 };
  return null;
}

export function classifyAIError(error) {
  const message = String(error?.message || '');

  if (message.includes('未配置 AI_API_KEY') || message.includes('未配置 AI_DEFAULT_MODEL')) {
    return { code: 'AI_CONFIG_ERROR', status: 500 };
  }

  // Prefer the structured statusCode attached by the HTTP layer over string parsing.
  const httpStatus = error?.statusCode ?? extractStatusFromMessage(message);
  const statusResult = _classifyByHttpStatus(httpStatus);
  if (statusResult) return statusResult;

  return _classifyByMessage(message) || { code: 'AI_UNKNOWN_ERROR', status: 500 };
}

// Extracts HTTP status from legacy message strings like "请求失败 [429]".
export function extractStatusFromMessage(message) {
  const match = message.match(/\[(\d{3})\]/);
  return match ? Number(match[1]) : null;
}
