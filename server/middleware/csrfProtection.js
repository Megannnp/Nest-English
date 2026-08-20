import { CSRF_COOKIE_NAME, readCookie, TOKEN_COOKIE_NAME } from '../utils/authCookies.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  // Bearer token requests originate from programmatic API clients, not browsers.
  // Browsers cannot set a custom Authorization header in cross-origin requests
  // (blocked by CORS preflight), so this bypass does not weaken CSRF protection
  // for cookie-based sessions.  The token is still validated by requireAuth.
  const authorization = getHeader(req, 'authorization') || '';
  if (authorization.startsWith('Bearer ')) return next();

  const authCookie = readCookie(req, TOKEN_COOKIE_NAME);
  if (!authCookie) return next();

  const csrfCookie = readCookie(req, CSRF_COOKIE_NAME);
  const csrfHeader = getHeader(req, 'x-csrf-token');
  if (csrfCookie && csrfHeader && csrfCookie === csrfHeader) return next();

  return res.status(403).json({ code: 403, msg: 'CSRF 校验失败，请刷新页面后重试' });
}
