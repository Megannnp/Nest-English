import crypto from 'node:crypto';

const TOKEN_COOKIE_NAME = 'nest_token';
const SESSION_FLAG_COOKIE_NAME = 'nest_has_session';
const CSRF_COOKIE_NAME = 'nest_csrf';

function getCookieDomain() {
  return process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN).trim() : '';
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);

  return parts.join('; ');
}

export function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey !== name) continue;
    return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function setAuthCookies(res, token, expiresInSeconds) {
  const secure = process.env.NODE_ENV === 'production';
  const domain = getCookieDomain();
  const csrfToken = crypto.randomBytes(24).toString('base64url');
  const common = {
    path: '/',
    sameSite: 'Lax',
    secure,
    domain,
  };

  res.setHeader('Set-Cookie', [
    serializeCookie(TOKEN_COOKIE_NAME, token, {
      ...common,
      httpOnly: true,
      maxAge: expiresInSeconds,
    }),
    serializeCookie(SESSION_FLAG_COOKIE_NAME, '1', {
      ...common,
      maxAge: expiresInSeconds,
    }),
    serializeCookie(CSRF_COOKIE_NAME, csrfToken, {
      ...common,
      maxAge: expiresInSeconds,
    }),
  ]);
}

export function setCsrfCookie(res, expiresInSeconds) {
  const secure = process.env.NODE_ENV === 'production';
  const domain = getCookieDomain();
  const csrfToken = crypto.randomBytes(24).toString('base64url');

  res.append('Set-Cookie', serializeCookie(CSRF_COOKIE_NAME, csrfToken, {
    path: '/',
    sameSite: 'Lax',
    secure,
    domain,
    maxAge: expiresInSeconds,
  }));
}

export function clearAuthCookies(res) {
  const secure = process.env.NODE_ENV === 'production';
  const domain = getCookieDomain();
  const common = {
    path: '/',
    sameSite: 'Lax',
    secure,
    domain,
    maxAge: 0,
  };

  res.setHeader('Set-Cookie', [
    serializeCookie(TOKEN_COOKIE_NAME, '', {
      ...common,
      httpOnly: true,
    }),
    serializeCookie(SESSION_FLAG_COOKIE_NAME, '', common),
    serializeCookie(CSRF_COOKIE_NAME, '', common),
  ]);
}

export { CSRF_COOKIE_NAME, TOKEN_COOKIE_NAME };
