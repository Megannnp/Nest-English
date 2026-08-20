import bcrypt from 'bcryptjs';

import { awardProfileCompletion } from './pointsService.js';
import { normalizePrepExamPreference } from './prepExamPreferences.js';
import { toSafeUser } from './userMapper.js';
import {
  canTeacherAccessStudent,
  findOtherUserByEmail,
  findOtherUserByPhone,
  findUserById,
  getUserProfileRow,
  listStudentsForTeacher,
  updateUserById,
} from './userRepository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/appError.js';
import { logError } from '../utils/logger.js';
import {
  optionalTrimmedString,
  requireTrimmedString,
} from '../utils/routeValidation.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^1[3-9]\d{9}$/;
const PASSWORD_COMPLEXITY_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

function parsePreferences(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function assertNewPasswordValid(password) {
  if (password.length < 8) {
    throw new ValidationError('新密码至少8位');
  }
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    throw new ValidationError('新密码需包含大小写字母和数字');
  }
}

export async function listUsersForTeacher(teacherId) {
  const rows = await listStudentsForTeacher(teacherId);
  return rows.map(toSafeUser);
}

function _validateNoNameChange(payload) {
  const p = payload || {};
  if (Object.prototype.hasOwnProperty.call(p, 'nickName') ||
      Object.prototype.hasOwnProperty.call(p, 'realName')) {
    throw new ValidationError('姓名在注册后不可修改');
  }
}

async function _applyEmailUpdate(updates, params, email, userId) {
  const normalizedEmail = requireTrimmedString(email, '邮箱不能为空').toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) throw new ValidationError('邮箱格式不正确');
  const existed = await findOtherUserByEmail(normalizedEmail, userId);
  if (existed) throw new ValidationError('该邮箱已被使用');
  updates.push('email = ?');
  params.push(normalizedEmail);
}

async function _applyPhoneUpdate(updates, params, phone, userId) {
  const normalizedPhone = optionalTrimmedString(phone, 20);
  if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
    throw new ValidationError('手机号格式不正确');
  }
  if (normalizedPhone) {
    const existed = await findOtherUserByPhone(normalizedPhone, userId);
    if (existed) throw new ValidationError('该手机号已被使用');
  }
  updates.push('phone = ?');
  params.push(normalizedPhone);
}

/**
 * Merges a partial preferences object into the user's existing `users.preferences` JSON column.
 *
 * ⚠️  SCHEMA GOVERNANCE — `users.preferences` is a schemaless JSON blob.
 * To avoid it becoming a "garbage-bag" column, only the following keys are
 * permitted.  Adding a new key requires a code-review comment here AND in the
 * client that reads it:
 *
 *   teacherWorkbenchFilters  {object}   — teacher workbench filter state
 *   prepExamId               {string}   — user's selected preparation target
 *
 * DO NOT store per-module learning settings here (grammar difficulty, writing
 * mode, etc.).  Module-specific user data should live in a typed table
 * (e.g. grammar_practice_records, future reading_preferences).
 */
function _applyPreferencesUpdate(updates, params, preferences, current) {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    throw new ValidationError('偏好设置格式不正确');
  }
  const nextPreferences = { ...parsePreferences(current.preferences), ...preferences };
  if (Object.prototype.hasOwnProperty.call(preferences, 'prepExamId')) {
    nextPreferences.prepExamId = normalizePrepExamPreference(preferences.prepExamId);
  }
  updates.push('preferences = ?');
  params.push(JSON.stringify(nextPreferences));
}

async function _applyPasswordUpdate(updates, params, oldPassword, newPassword, current) {
  if (!oldPassword || !newPassword) {
    throw new ValidationError('修改密码时请填写旧密码和新密码');
  }
  const normalizedOldPassword = requireTrimmedString(oldPassword, '修改密码时请填写旧密码和新密码');
  const normalizedNewPassword = requireTrimmedString(newPassword, '修改密码时请填写旧密码和新密码');
  const valid = await bcrypt.compare(normalizedOldPassword, current.password || '');
  if (!valid) throw new ValidationError('当前密码错误');
  assertNewPasswordValid(normalizedNewPassword);
  const newHash = await bcrypt.hash(normalizedNewPassword, 10);
  updates.push('password = ?');
  params.push(newHash);
}

export async function updateCurrentUserProfile({ userId, payload }) {
  _validateNoNameChange(payload);

  const current = await findUserById(userId);
  if (!current) throw new NotFoundError('用户不存在');

  const { email, phone, preferences, currentPassword, oldPassword, newPassword } = payload || {};

  const updates = [];
  const params = [];
  const wantsContactUpdate = email !== undefined || phone !== undefined;

  if (wantsContactUpdate) {
    const normalizedCurrentPassword = requireTrimmedString(currentPassword, '修改联系方式时请填写当前密码');
    const valid = await bcrypt.compare(normalizedCurrentPassword, current.password || '');
    if (!valid) throw new ValidationError('当前密码错误');
  }

  if (email !== undefined) await _applyEmailUpdate(updates, params, email, userId);
  if (phone !== undefined) await _applyPhoneUpdate(updates, params, phone, userId);
  if (preferences !== undefined) _applyPreferencesUpdate(updates, params, preferences, current);
  if (oldPassword !== undefined || newPassword !== undefined) {
    await _applyPasswordUpdate(updates, params, oldPassword, newPassword, current);
  }

  if (!updates.length) {
    throw new ValidationError('没有可更新的内容');
  }

  await updateUserById(userId, updates, params);
  const updated = await getUserProfileRow(userId);
  try {
    await awardProfileCompletion(userId, updated);
  } catch (error) {
    logError('profile_completion_points_failed', { message: error.message, userId });
  }
  return toSafeUser(updated);
}

export async function getUserForViewer({ viewer, targetUserId }) {
  const row = await getUserProfileRow(targetUserId);
  if (!row) throw new NotFoundError('用户不存在');

  const isSelf = viewer.id === row.id;
  const teacherAccess = viewer.role === 'teacher'
    ? await canTeacherAccessStudent(viewer.id, row.id)
    : false;

  if (!isSelf && !teacherAccess) {
    throw new ForbiddenError('无权限查看该用户');
  }

  return toSafeUser(row);
}

export { canTeacherAccessStudent };
