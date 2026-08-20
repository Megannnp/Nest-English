import jwt from 'jsonwebtoken';

import db from '../db/database.js';
import { readCookie, TOKEN_COOKIE_NAME } from '../utils/authCookies.js';

// JWTs are stateless and live for JWT_EXPIRES_IN (7d by default), so disabling
// an account in the admin panel would otherwise leave its existing tokens valid
// for up to a week.  We re-check `users.is_disabled` on authenticated requests,
// cached briefly so the hot path costs at most one primary-key lookup per user
// per TTL window.  A ban therefore takes effect within AUTH_USER_STATE_TTL_MS.
//
// Note this cache is per-process: with multiple instances behind a load
// balancer each keeps its own copy, so the worst-case delay is still one TTL.
const USER_STATE_TTL_MS = Number(process.env.AUTH_USER_STATE_TTL_MS || 30_000);
const USER_STATE_CACHE_MAX_ENTRIES = 10_000;
const userStateCache = new Map();

export function clearUserStateCache() {
  userStateCache.clear();
}

async function isUserDisabled(userId) {
  const cached = userStateCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.disabled;
  }

  const row = await db
    .prepare('SELECT is_disabled FROM users WHERE id = ? LIMIT 1')
    .get(userId);
  // A token whose user row is gone is treated as revoked.
  const disabled = !row || row.is_disabled === 1;

  // Cheap bound: the cache is a TTL cache, not an LRU, so once it grows past
  // the cap we drop everything rather than evict precisely.
  if (userStateCache.size >= USER_STATE_CACHE_MAX_ENTRIES) userStateCache.clear();
  userStateCache.set(userId, { disabled, expiresAt: Date.now() + USER_STATE_TTL_MS });
  return disabled;
}

function normalizeDecodedUser(decoded) {
  if (!decoded || typeof decoded !== 'object') return decoded;
  const realName = decoded.realName || decoded.real_name || '';
  const name = decoded.name || realName || decoded.nick_name || '';
  return {
    ...decoded,
    accountCode: decoded.accountCode || decoded.account_code || '',
    realName,
    real_name: realName,
    name,
  };
}

export async function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  const bearerToken = header && header.startsWith('Bearer ') ? header.slice(7) : '';
  const cookieToken = readCookie(req, TOKEN_COOKIE_NAME);
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({
      code: 401,
      errorCode: 'AUTH_MISSING_TOKEN',
      msg: '未提供认证令牌，请先登录',
    });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      code: 500,
      errorCode: 'AUTH_CONFIG_ERROR',
      msg: '服务器配置错误',
    });
  }
  let decoded;
  try {
    decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({
      code: 401,
      errorCode: 'AUTH_TOKEN_INVALID',
      msg: 'Token 无效或已过期，请重新登录',
    });
  }

  try {
    if (await isUserDisabled(decoded.id)) {
      return res.status(403).json({
        code: 403,
        errorCode: 'AUTH_ACCOUNT_DISABLED',
        msg: '账号已被停用，请联系管理员',
      });
    }
  } catch (err) {
    // Surface lookup failures rather than silently admitting the request:
    // we cannot confirm the account is still active. Mirrors requireAdmin.
    return next(err);
  }

  req.user = normalizeDecodedUser(decoded);
  next();
}

export async function optionalAuth(req, _res, next) {
  const header = req.headers['authorization'];
  const bearerToken = header && header.startsWith('Bearer ') ? header.slice(7) : '';
  const cookieToken = readCookie(req, TOKEN_COOKIE_NAME);
  const token = bearerToken || cookieToken;

  if (!token) {
    req.user = null;
    return next();
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    // Degrade a disabled account to anonymous rather than erroring: these
    // routes are usable logged-out, so the guest experience is the right
    // fallback. A lookup failure degrades the same way.
    req.user = (await isUserDisabled(decoded.id)) ? null : normalizeDecodedUser(decoded);
  } catch {
    req.user = null;
  }

  next();
}

export function requireTeacher(req, res, next) {
  if (req.user?.role !== 'teacher') {
    return res.status(403).json({
      code: 403,
      errorCode: 'AUTH_FORBIDDEN_TEACHER_REQUIRED',
      msg: '无权限，需要教师身份',
    });
  }
  next();
}

export async function requireAdmin(req, res, next) {
  if (req.user?.is_admin !== 1) {
    return res.status(403).json({ code: 403, msg: '无权限，需要管理员权限' });
  }
  try {
    const row = await db.prepare('SELECT is_admin FROM users WHERE id = ? LIMIT 1').get(req.user.id);
    if (!row || row.is_admin !== 1) {
      return res.status(403).json({ code: 403, msg: '无权限，需要管理员权限' });
    }
    next();
  } catch (err) {
    next(err);
  }
}
