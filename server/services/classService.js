import bcrypt from 'bcryptjs';

import { generateUniqueClassCode } from './classDomain.js';
import {
  toClientClass,
  toClientClassSearchResult,
  toClientClassStudent,
  toClientClassUser,
  toClientClassWriting,
} from './classMapper.js';
import {
  countClassStudents,
  getClassByCode,
  getClassById,
  getClassForTeacher,
  getClassUserById,
  insertClass,
  joinClassTransaction,
  listClassMemberIds,
  listClassMembersByClassIds,
  listClassWritingsByUserIds,
  listClassesByTeacher,
  listUsersByIds,
  listWritingStatsByUserIds,
  updateClassPassword,
  updateUserClass,
} from './classRepository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/appError.js';
import { nanoid } from '../utils/nanoid.js';
import {
  assertMaxLength,
  requireTrimmedString,
} from '../utils/routeValidation.js';

function getClassPasswordValidationMessage(password) {
  if (!password?.trim()) return '请设置班级密码';
  if (password.trim().length < 4) return '班级密码至少4位';
  if (password.trim().length > 32) return '班级密码不能超过32位';
  return '';
}

async function verifyClassPassword(storedPassword, inputPassword) {
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

function buildStudentStats(writings) {
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
    } catch { /* intentional */ }
  }
  return stats;
}

export async function listClassesForTeacher(teacherId) {
  const classes = await listClassesByTeacher(teacherId);
  if (!classes.length) return [];

  const classIds = classes.map((item) => item.id);
  const studentRows = await listClassMembersByClassIds(classIds);
  const studentMap = {};
  studentRows.forEach((row) => {
    if (!studentMap[row.class_id]) studentMap[row.class_id] = [];
    studentMap[row.class_id].push(row.student_id);
  });

  return classes.map((row) => toClientClass(row, studentMap[row.id] || []));
}

export async function searchClassByCode(code) {
  const normalizedCode = requireTrimmedString(code, '请提供班级号').toUpperCase();
  assertMaxLength(normalizedCode, 32, '班级号格式不正确');

  const row = await getClassByCode(normalizedCode);
  if (!row) throw new NotFoundError('未找到该班级，请检查班级号');

  const studentCount = await countClassStudents(row.id);
  return toClientClassSearchResult(row, studentCount);
}

export async function createClassForTeacher({ teacher, payload }) {
  const normalizedClassName = requireTrimmedString(payload?.className, '请输入班级名称');
  assertMaxLength(normalizedClassName, 50, '班级名称不能超过50个字符');
  const passwordValidationMessage = getClassPasswordValidationMessage(payload?.password);
  if (passwordValidationMessage) throw new ValidationError(passwordValidationMessage);

  const id = nanoid();
  const code = await generateUniqueClassCode(getClassByCode);
  const now = Date.now();
  const teacherName = teacher.realName || teacher.name || '教师';
  const passwordHash = await bcrypt.hash(payload.password.trim(), 10);

  await insertClass({
    id,
    className: normalizedClassName,
    classCode: code,
    passwordHash,
    teacherId: teacher.id,
    teacherName,
    createdAt: now,
  });

  const row = await getClassById(id);
  return toClientClass(row, []);
}

export async function updateClassPasswordForTeacher({ teacherId, classId, password }) {
  const validationMessage = getClassPasswordValidationMessage(password);
  if (validationMessage) {
    throw new ValidationError(validationMessage === '请设置班级密码' ? '请输入新的班级密码' : validationMessage);
  }

  const row = await getClassForTeacher(
    classId,
    teacherId,
    'id, class_name, class_code, teacher_id, teacher_name, created_at'
  );
  if (!row) throw new NotFoundError('班级不存在或无权限修改');

  const passwordHash = await bcrypt.hash(password.trim(), 10);
  await updateClassPassword(row.id, passwordHash);

  return toClientClass(row, []);
}

export async function joinClassForStudent({ user, classId, password }) {
  if (user.role !== 'student') {
    throw new ForbiddenError('只有学生可以加入班级');
  }

  const normalizedPassword = requireTrimmedString(password, '请输入班级密码');
  const row = await getClassById(classId);
  if (!row) throw new NotFoundError('班级不存在');

  const { valid, upgradedHash } = await verifyClassPassword(row.password, normalizedPassword);
  if (!valid) throw new ValidationError('班级密码错误');

  await joinClassTransaction({
    classId,
    className: row.class_name,
    studentId: user.id,
    upgradedHash,
  });

  const updatedUser = await getClassUserById(user.id);
  return {
    classId: row.id,
    className: row.class_name,
    user: toClientClassUser(updatedUser),
  };
}

export async function bindTeacherToClass({ teacherId, classId }) {
  const row = await getClassForTeacher(classId, teacherId, 'id, class_name');
  if (!row) throw new NotFoundError('班级不存在或无权限绑定');

  await updateUserClass(teacherId, row.id, row.class_name);

  const updatedUser = await getClassUserById(teacherId);
  return toClientClassUser(updatedUser);
}

export async function getClassDetailForUser({ user, classId }) {
  const row = await getClassById(classId);
  if (!row) throw new NotFoundError('班级不存在');

  const isTeacherOwner = row.teacher_id === user.id;
  const isJoinedStudent = user.role === 'student' && user.classId === row.id;
  if (!isTeacherOwner && !isJoinedStudent) {
    throw new ForbiddenError('无权限');
  }

  const studentIds = isTeacherOwner ? await listClassMemberIds(row.id) : [];
  return toClientClass(row, studentIds);
}

export async function listClassStudentsForTeacher({ teacherId, classId }) {
  const cls = await getClassForTeacher(classId, teacherId);
  if (!cls) throw new NotFoundError('班级不存在');

  const studentIds = await listClassMemberIds(classId);
  if (!studentIds.length) return [];

  const users = await listUsersByIds(studentIds);
  const writings = await listWritingStatsByUserIds(studentIds);
  const writingMap = {};
  writings.forEach((writing) => {
    if (!writingMap[writing.user_id]) writingMap[writing.user_id] = [];
    writingMap[writing.user_id].push(writing);
  });

  return users.map((user) => toClientClassStudent(user, buildStudentStats(writingMap[user.id] || [])));
}

export async function listClassWritingsForTeacher({ teacherId, classId }) {
  const cls = await getClassForTeacher(classId, teacherId);
  if (!cls) throw new NotFoundError('班级不存在');

  const studentIds = await listClassMemberIds(classId);
  if (!studentIds.length) return [];

  const rows = await listClassWritingsByUserIds(studentIds);
  return rows.map(toClientClassWriting);
}
