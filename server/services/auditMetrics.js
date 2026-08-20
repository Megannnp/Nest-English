const AUDIT_HISTORY_LIMIT = 50;

const auditMetrics = {
  total: 0,
  byLevel: {},
  byEvent: {},
  recent: [],
};

function increment(map, key) {
  const normalizedKey = String(key || 'unknown');
  map[normalizedKey] = (map[normalizedKey] || 0) + 1;
}

export function recordAuditMetric({ level, event, payload = {} }) {
  auditMetrics.total += 1;
  increment(auditMetrics.byLevel, level);
  increment(auditMetrics.byEvent, event);
  auditMetrics.recent.unshift({
    level,
    event,
    at: Date.now(),
    requestId: payload.requestId || null,
    path: payload.path || null,
    statusCode: payload.statusCode || null,
    userId: payload.userId || null,
    role: payload.role || null,
  });
  if (auditMetrics.recent.length > AUDIT_HISTORY_LIMIT) {
    auditMetrics.recent.splice(AUDIT_HISTORY_LIMIT);
  }
}

export function getAuditMetrics() {
  return {
    total: auditMetrics.total,
    byLevel: { ...auditMetrics.byLevel },
    byEvent: { ...auditMetrics.byEvent },
    recent: auditMetrics.recent.map((item) => ({ ...item })),
  };
}
