export function buildMessageRateLimitKey(req) {
  return `ip:${req.ip || req.socket?.remoteAddress || ''}`;
}
