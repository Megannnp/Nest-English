export function initSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

export function writeSSE(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  if (res.flush) res.flush();
}

export function writeSSEError(res, error, errorCode = null) {
  writeSSE(res, {
    error,
    ...(errorCode ? { errorCode } : {}),
  });
}

export function endSSE(res, payload = null) {
  if (payload) {
    writeSSE(res, payload);
  }
  res.write('data: [DONE]\n\n');
  res.end();
}
