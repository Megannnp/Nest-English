import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';


import { ValidationError } from '../utils/appError.js';

function _generateClassCode() {
  return 'C' + randomBytes(3).toString('hex').toUpperCase();
}

export async function generateUniqueClassCode(getByCode) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = _generateClassCode();
    const existing = await getByCode(code);
    if (!existing) return code;
  }
  throw new Error('生成班级邀请码失败，请重试');
}

export function normalizeStudentNo(value) {
  return String(value || '').trim();
}

export function normalizeStudentName(value) {
  return String(value || '').trim();
}

export function toRosterBindingValidationError(error) {
  const message = error?.message || '';
  if (message === 'USER_NOT_IN_CLASS') return new ValidationError('该学生账号尚未加入当前班级');
  if (message === 'USER_STUDENT_NO_REQUIRED') return new ValidationError('该学生账号没有填写学号，请先让学生补充学号');
  if (message === 'ROSTER_NOT_FOUND_FOR_USER') return new ValidationError('当前名单里还没有这个学号，可以改用“新增到名单并绑定”');
  if (message === 'ROSTER_NOT_FOUND') return new ValidationError('未找到这条名单记录，请刷新后再试');
  if (message === 'ROSTER_ALREADY_LINKED') return new ValidationError('该学号已绑定到其他账号，请先核对后再处理');
  if (message === 'USER_ALREADY_LINKED_ROSTER') return new ValidationError('该学生账号已经绑定到其他名单记录');
  return error;
}

export function getClassPasswordValidationMessage(password) {
  if (!password?.trim()) return '请设置班级密码';
  if (password.trim().length < 4) return '班级密码至少4位';
  if (password.trim().length > 32) return '班级密码不能超过32位';
  return '';
}

export async function verifyClassPassword(storedPassword, inputPassword) {
  if (!storedPassword || !inputPassword) return { valid: false, upgradedHash: null };

  if (/^\$2[aby]\$/.test(storedPassword)) {
    const valid = await bcrypt.compare(inputPassword, storedPassword);
    return { valid, upgradedHash: null };
  }

  const valid = storedPassword === inputPassword;
  if (!valid) return { valid: false, upgradedHash: null };

  const upgradedHash = await bcrypt.hash(inputPassword, 10);
  return { valid: true, upgradedHash };
}

export function buildStudentStats(writings) {
  const stats = { total: writings.length, avgScore: 0, trend: 'stable', weaknesses: [] };
  if (!writings.length) return stats;

  const pcts = writings.map((writing) => {
    const score = Number(writing.total_score);
    const max = Number(writing.max_score);
    return max > 0 ? Math.round(score / max * 100) : 0;
  }).filter((score) => score > 0);

  if (!pcts.length) return stats;

  stats.avgScore = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  const recent = pcts.slice(-3);
  const diff = recent.length > 1 ? recent[recent.length - 1] - recent[0] : 0;
  stats.trend = diff > 5 ? 'up' : diff < -5 ? 'down' : 'stable';
  const latest = writings[writings.length - 1];
  if (latest?.weaknesses) {
    try {
      stats.weaknesses = JSON.parse(latest.weaknesses) || [];
    } catch {
      // ignore malformed historical weakness payloads
    }
  }
  return stats;
}
