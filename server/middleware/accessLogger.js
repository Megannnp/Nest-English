import { logInfo } from '../utils/logger.js';

export function accessLogger(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    logInfo('http_request', {
      requestId: req.requestId || null,
      method: req.method,
      path: req.path || String(req.url || '').split('?')[0],
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.id || null,
      role: req.user?.role || null,
      ip: req.ip || req.socket?.remoteAddress || null,
    });
  });

  next();
}
