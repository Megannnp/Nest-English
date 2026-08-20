
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'node:crypto';

import { toSafeUser } from './authMapper.js';
import {
  findUserByEmail,
  findUserById,
  findUserByPhone,
  insertUser,
  insertUserByPhone,
  updatePasswordByEmail,
  updatePasswordByPhone,
} from './authRepository.js';
import {
  clearLoginFailures,
  getLoginAttemptStatus,
  recordLoginFailure,
} from './loginAttemptService.js';
import { sendVerificationEmail } from './mailService.js';
import { normalizePrepExamPreference } from './prepExamPreferences.js';
import { sendSmsCode } from './smsService.js';
import {
  buildVerificationCodeKey,
  deleteVerificationCode,
  getVerificationCode,
  saveVerificationCode,
} from './verificationCodeStore.js';
import { UnauthorizedError, ValidationError, NotFoundError, AppError } from '../utils/appError.js';
import { nanoid } from '../utils/nanoid.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const DEV = process.env.NODE_ENV !== 'production';

// Returns { devCode: code } only in non-production environments.
// Centralised here so every code-sending path uses the same guard.
function devOnlyCode(code) {
  return DEV ? { devCode: code } : {};
}
const PASSWORD_COMPLEXITY_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const PHONE_REGEX = /^1[3-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTER_ROLES = new Set(['student', 'teacher', 'parent']);

export function normalizeAuthRole(role) {
  return REGISTER_ROLES.has(role) ? role : 'student';
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('服务器配置错误', {
      status: 500,
      code: 'AUTH_CONFIG_ERROR',
      expose: false,
    });
  }
  return secret;
}

function makeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name || user.realName || '',
      email: user.email,
      role: user.role,
      realName: user.realName || '',
      accountCode: user.accountCode || '',
      is_admin: user.is_admin === 1 ? 1 : 0,
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function getPasswordValidationMessage(password) {
  if (!password || password.length < 8) return '密码至少8位';
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) return '密码需包含大小写字母和数字';
  return '';
}

function assertPasswordValid(password, label = '密码') {
  const message = getPasswordValidationMessage(password);
  if (message) throw new ValidationError(label === '新密码' ? message.replace('密码', '新密码') : message);
}

function _normalizeRegisterPayload(payload) {
  return {
    email: String(payload.email || '').trim().toLowerCase(),
    realName: String(payload.realName || '').trim(),
    password: String(payload.password || ''),
    confirmPassword: String(payload.confirmPassword || ''),
    phone: String(payload.phone || '').trim(),
    role: normalizeAuthRole(payload.role),
  };
}

async function assertRegisterPayloadAvailable({ email, phone }) {
  if (await findUserByEmail(email)) throw new ValidationError('该邮箱已注册');
  if (phone && await findUserByPhone(phone)) throw new ValidationError('该手机号已注册');
}

function translateDuplicateRegistrationError(err) {
  const isDupEntry =
    err.errno === 1062 ||
    err.code === 'ER_DUP_ENTRY' ||
    (err.message && err.message.includes('Duplicate entry'));
  if (!isDupEntry) return null;

  const msg = err.message || '';
  if (msg.includes('email')) return new ValidationError('该邮箱已注册');
  if (msg.includes('phone')) return new ValidationError('该手机号已注册');
  return null;
}

function normalizeRegisterPreferences(preferences) {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return null;
  const prepExamId = normalizePrepExamPreference(preferences.prepExamId);
  return prepExamId ? { prepExamId } : null;
}

export async function registerUser(payload) {
  const {
    email: normalizedEmail,
    realName: normalizedRealName,
    password: normalizedPassword,
    confirmPassword: normalizedConfirmPassword,
    phone: normalizedPhone,
    role,
  } = _normalizeRegisterPayload(payload);

  if (!EMAIL_REGEX.test(normalizedEmail)) throw new ValidationError('邮箱格式不正确');
  if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) throw new ValidationError('手机号格式不正确');
  assertPasswordValid(normalizedPassword);
  if (normalizedPassword !== normalizedConfirmPassword) throw new ValidationError('两次输入的密码不一致');
  if (normalizedRealName.length < 2 || normalizedRealName.length > 30) {
    throw new ValidationError('姓名长度需在2到30个字符之间');
  }

  await assertRegisterPayloadAvailable({ email: normalizedEmail, phone: normalizedPhone });

  const passwordHash = await bcrypt.hash(normalizedPassword, 10);
  let row;
  try {
    row = await insertUser({
      id: nanoid(),
      realName: normalizedRealName,
      email: normalizedEmail,
      phone: normalizedPhone || null,
      passwordHash,
      role: normalizeAuthRole(role),
      preferences: normalizeRegisterPreferences(payload.preferences),
      createdAt: Date.now(),
    });
  } catch (err) {
    // Two concurrent registrations can both pass the findUserByEmail / findUserByPhone
    // check above before either INSERT completes.  Translate the resulting
    // ER_DUP_ENTRY from MySQL into a user-friendly ValidationError instead of
    // surfacing a raw 500.
    const translatedError = translateDuplicateRegistrationError(err);
    if (translatedError) throw translatedError;
    throw err;
  }
  const user = toSafeUser(row);
  return { token: makeToken(user), user };
}

export async function loginUser(payload, ip = '') {
  const account = String(payload.account || '').trim();
  const password = String(payload.password || '');
  const isEmail = EMAIL_REGEX.test(account);
  const isPhone = PHONE_REGEX.test(account);

  if (!isEmail && !isPhone) throw new ValidationError('请输入正确的邮箱或手机号');

  const attemptStatus = await getLoginAttemptStatus(account, ip);
  if (!attemptStatus.allowed) {
    throw new AppError(
      attemptStatus.retryAfterSeconds > 60
        ? '登录尝试较多，请稍后再试'
        : `登录尝试较多，请 ${attemptStatus.retryAfterSeconds} 秒后再试`,
      { status: 429, code: 'LOGIN_RATE_LIMITED' },
    );
  }

  let row;
  try {
    row = isEmail
      ? await findUserByEmail(account.toLowerCase())
      : await findUserByPhone(account);
  } catch (dbError) {
    // Fire-and-forget: don't let Redis failure hide the original DB error
    recordLoginFailure(account, ip).catch(() => {});
    throw dbError;
  }

  if (!row || !row.password) {
    await recordLoginFailure(account, ip);
    throw new UnauthorizedError('账号或密码错误');
  }

  const valid = await bcrypt.compare(password, row.password);
  if (!valid) {
    await recordLoginFailure(account, ip);
    throw new UnauthorizedError('账号或密码错误');
  }

  await clearLoginFailures(account, ip);
  const user = toSafeUser(row);
  return { token: makeToken(user), user };
}

export async function requestPasswordReset(payload) {
  const account = String(payload.account || '').trim();
  const type = payload.type;
  let user;
  let key;

  if (type === 'email') {
    if (!EMAIL_REGEX.test(account)) throw new ValidationError('邮箱格式不正确');
    const normalizedEmail = account.toLowerCase();
    user = await findUserByEmail(normalizedEmail);
    key = buildVerificationCodeKey('email', normalizedEmail);
  } else {
    if (!PHONE_REGEX.test(account)) throw new ValidationError('手机号格式不正确');
    throw new AppError('当前暂未接入短信验证码，请使用邮箱找回', {
      status: 501,
      code: 'SMS_NOT_IMPLEMENTED',
    });
  }

  if (!user) {
    return { code: 200, msg: '验证码已发送至邮箱' };
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = Date.now() + 10 * 60 * 1000;
  await saveVerificationCode(key, { code, expiresAt, type, account }, 10 * 60);

  try {
    await sendVerificationEmail({
      to: account.toLowerCase(),
      code,
      expiresMinutes: 10,
    });
  } catch (error) {
    await deleteVerificationCode(key);
    throw error;
  }

  return {
    code: 200,
    msg: '验证码已发送至邮箱',
    ...devOnlyCode(code),
  };
}

export async function resetPassword(payload) {
  const rawAccount = String(payload.account || '').trim();
  const account = payload.type === 'email' ? rawAccount.toLowerCase() : rawAccount;
  const type = payload.type;
  const code = String(payload.code || '').trim();
  const newPassword = String(payload.newPassword || '');

  assertPasswordValid(newPassword);

  const key = buildVerificationCodeKey(type, account);
  const stored = await getVerificationCode(key);
  if (!stored) throw new ValidationError('验证码已过期，请重新获取');
  if (Date.now() > stored.expiresAt) {
    await deleteVerificationCode(key);
    throw new ValidationError('验证码已过期，请重新获取');
  }
  if (stored.code !== code) throw new ValidationError('验证码错误');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  if (type === 'email') {
    await updatePasswordByEmail(account.toLowerCase(), passwordHash);
  } else {
    await updatePasswordByPhone(account, passwordHash);
  }

  await deleteVerificationCode(key);
}

export async function getCurrentUser(userId) {
  const row = await findUserById(userId);
  if (!row) throw new NotFoundError('用户不存在');
  return toSafeUser(row);
}

const SMS_CODE_TTL = 5 * 60; // 5 minutes
const EMAIL_LOGIN_CODE_TTL = 10 * 60; // 10 minutes

/**
 * Sends a 6-digit email verification code for login/registration.
 * Returns { isNewUser, devCode? }.
 */
export async function sendEmailLoginCode(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) throw new ValidationError('邮箱格式不正确');

  const existingUser = await findUserByEmail(normalizedEmail);
  const isNewUser = !existingUser;

  const code = String(randomInt(100000, 1000000));
  const key = buildVerificationCodeKey('email-login', normalizedEmail);
  await saveVerificationCode(
    key,
    { code, expiresAt: Date.now() + EMAIL_LOGIN_CODE_TTL * 1000, isNewUser },
    EMAIL_LOGIN_CODE_TTL,
  );

  try {
    await sendVerificationEmail({ to: normalizedEmail, code, expiresMinutes: 10 });
  } catch (err) {
    await deleteVerificationCode(key);
    throw err;
  }

  return {
    isNewUser,
    ...devOnlyCode(code),
  };
}

/**
 * Verifies the email code and logs in or registers the user.
 * For new users, realName is required.
 */
export async function emailCodeAuth({ email, code, realName, role = 'student', preferences = null }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) throw new ValidationError('邮箱格式不正确');
  if (!code || !String(code).trim()) throw new ValidationError('请输入验证码');

  const key = buildVerificationCodeKey('email-login', normalizedEmail);
  const stored = await getVerificationCode(key);
  if (!stored) throw new ValidationError('验证码已过期，请重新获取');
  if (Date.now() > stored.expiresAt) {
    await deleteVerificationCode(key);
    throw new ValidationError('验证码已过期，请重新获取');
  }
  if (stored.code !== String(code).trim()) throw new ValidationError('验证码错误');

  await deleteVerificationCode(key);

  let row = await findUserByEmail(normalizedEmail);

  if (!row) {
    const trimmedName = String(realName || '').trim();
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      throw new ValidationError('姓名长度需在2到30个字符之间');
    }
    row = await insertUser({
      id: nanoid(),
      realName: trimmedName,
      email: normalizedEmail,
      phone: null,
      passwordHash: null,
      role: normalizeAuthRole(role),
      preferences: normalizeRegisterPreferences(preferences),
      createdAt: Date.now(),
    });
  }

  const user = toSafeUser(row);
  return { token: makeToken(user), user };
}

/**
 * Sends a 6-digit SMS verification code to the given phone number.
 * Returns { isNewUser, devCode? } so the frontend knows whether to show the name field.
 */
export async function sendPhoneCode(phone) {
  if (!PHONE_REGEX.test(phone)) throw new ValidationError('手机号格式不正确');

  const existingUser = await findUserByPhone(phone);
  const isNewUser = !existingUser;

  const code = String(randomInt(100000, 1000000));
  const key = buildVerificationCodeKey('sms-login', phone);
  await saveVerificationCode(key, { code, expiresAt: Date.now() + SMS_CODE_TTL * 1000, isNewUser }, SMS_CODE_TTL);

  await sendSmsCode(phone, code);

  return {
    isNewUser,
    ...devOnlyCode(code),
  };
}

/**
 * Verifies the SMS code and either logs in an existing user or registers a new one.
 * For new users, realName is required.
 */
export async function phoneCodeAuth({ phone, code, realName, role = 'student' }) {
  if (!PHONE_REGEX.test(phone)) throw new ValidationError('手机号格式不正确');
  if (!code || !code.trim()) throw new ValidationError('请输入验证码');

  const key = buildVerificationCodeKey('sms-login', phone);
  const stored = await getVerificationCode(key);
  if (!stored) throw new ValidationError('验证码已过期，请重新获取');
  if (Date.now() > stored.expiresAt) {
    await deleteVerificationCode(key);
    throw new ValidationError('验证码已过期，请重新获取');
  }
  if (stored.code !== String(code).trim()) throw new ValidationError('验证码错误');

  await deleteVerificationCode(key);

  let row = await findUserByPhone(phone);

  if (!row) {
    const trimmedName = String(realName || '').trim();
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      throw new ValidationError('姓名长度需在2到30个字符之间');
    }
    row = await insertUserByPhone({
      id: nanoid(),
      realName: trimmedName,
      phone,
      role,
      createdAt: Date.now(),
    });
  }

  const user = toSafeUser(row);
  return { token: makeToken(user), user };
}
