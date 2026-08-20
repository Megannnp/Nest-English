function compactParts(parts) {
  return parts.filter((item) => item != null && String(item).trim() !== '').join(' | ');
}

function baseAlert({ level, event, payload, line }) {
  return {
    severity: level === 'error' ? 'critical' : (level === 'audit' ? 'warning' : level),
    title: `NEST ${event}`,
    summary: payload?.message || line,
    event,
    level,
    payload,
    line,
  };
}

function requestErrorAlert({ level, event, payload, line }) {
  return {
    ...baseAlert({ level, event, payload, line }),
    severity: 'critical',
    title: 'NEST 请求异常',
    summary: compactParts([
      `${payload?.method || 'UNKNOWN'} ${payload?.path || ''}`,
      payload?.message || '请求处理失败',
      payload?.requestId ? `requestId=${payload.requestId}` : null,
    ]),
  };
}

function rateLimitAlert({ level, event, payload, line }) {
  return {
    ...baseAlert({ level, event, payload, line }),
    severity: 'warning',
    title: 'NEST 限流命中',
    summary: compactParts([
      payload?.scope ? `scope=${payload.scope}` : null,
      `${payload?.method || 'UNKNOWN'} ${payload?.path || ''}`,
      payload?.ip ? `ip=${payload.ip}` : null,
      payload?.userId ? `userId=${payload.userId}` : null,
    ]),
  };
}

function databaseInitFailedAlert({ level, event, payload, line }) {
  return {
    ...baseAlert({ level, event, payload, line }),
    severity: 'critical',
    title: 'NEST 数据库初始化失败',
    summary: compactParts([
      payload?.message || '数据库初始化失败',
      payload?.initMode ? `initMode=${payload.initMode}` : null,
    ]),
  };
}

function aiRetryAlert({ level, event, payload, line }) {
  return {
    ...baseAlert({ level, event, payload, line }),
    severity: payload?.canRetry ? 'warning' : 'critical',
    title: payload?.canRetry ? 'NEST AI 调用重试' : 'NEST AI 调用重试终止',
    summary: compactParts([
      payload?.label || 'AI 请求',
      `attempt=${payload?.attempt || '?'} / ${payload?.maxAttempts || '?'}`,
      payload?.message || null,
    ]),
  };
}

const ALERT_TEMPLATE_BY_EVENT = {
  request_error: requestErrorAlert,
  rate_limit_exceeded: rateLimitAlert,
  database_init_failed: databaseInitFailedAlert,
  ai_retry_attempt: aiRetryAlert,
};

export function buildAlertPayload({ level, event, payload = {}, line }) {
  const template = ALERT_TEMPLATE_BY_EVENT[event] || baseAlert;
  return template({ level, event, payload, line });
}
