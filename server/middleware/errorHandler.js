import { logError } from '../utils/logger.js';

function _sendSSEError(res, err) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify({ error: err.message || 'AI 服务异常' })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}

function _errorMsg(isDev, status, err) {
  return isDev ? err.message : (status < 500 ? err.message : '服务器内部错误');
}

function _formatNestedErrors(err, isDev) {
  if (!Array.isArray(err.errors)) return {};
  return {
    errors: err.errors.map((item) => ({
      message: item?.message || String(item),
      ...(isDev && { stack: item?.stack || null }),
      code: item?.code || null,
    })),
  };
}

export function errorHandler(err, req, res, _next) {
  const isDev = process.env.NODE_ENV !== 'production';
  logError('request_error', {
    requestId: req.requestId || null,
    method: req.method,
    path: req.path,
    message: err.message,
    stack: err.stack,
    ..._formatNestedErrors(err, isDev),
  });

  const path = req.originalUrl || req.path || '';
  if (path.includes('/api/ai/complete-stream') && req.method === 'POST' && !res.headersSent) {
    _sendSSEError(res, err);
    return;
  }

  const status = err.status || err.statusCode || 500;
  const errorCode = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  res.status(status).json({
    code: status,
    errorCode,
    msg: _errorMsg(isDev, status, err),
    requestId: req.requestId || null,
    ...(isDev && err.details ? { details: err.details } : {}),
    ...(isDev && { stack: err.stack }),
  });
}
