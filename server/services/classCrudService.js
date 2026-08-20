import bcrypt from 'bcryptjs';

import {
  generateUniqueClassCode,
  getClassPasswordValidationMessage,
} from './classDomain.js';
import {
  toClientClass,
  toClientClassSearchResult,
} from './classMapper.js';
import {
  clearClassReferences,
  countClassStudents,
  deleteClass,
  getClassByCode,
  getClassById,
  getClassForTeacher,
  insertClass,
  listClassMemberIds,
  listClassMembersByClassIds,
  listClassesByTeacher,
  syncClassNameReferences,
  updateClassName,
  updateClassPassword,
} from './classRepository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/appError.js';
import { nanoid } from '../utils/nanoid.js';
import {
  assertMaxLength,
  requireTrimmedString,
} from '../utils/routeValidation.js';

export async function listClassesForTeacher(teacherId) {
  const classes = await listClassesByTeacher(teacherId);
  if (!classes.length) return [];

  const classIds = classes.map((item) => item.id);
  const studentRows = await listClassMemberIdsForClasses(classIds);
  return classes.map((row) => toClientClass(row, studentRows[row.id] || []));
}

async function listClassMemberIdsForClasses(classIds) {
  const studentRows = await listClassMembersByClassIds(classIds);
  const studentMap = {};
  studentRows.forEach((row) => {
    if (!studentMap[row.class_id]) studentMap[row.class_id] = [];
    studentMap[row.class_id].push(row.student_id);
  });
  return studentMap;
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

export async function updateClassNameForTeacher({ teacherId, classId, className }) {
  const normalizedClassName = requireTrimmedString(className, '请输入班级名称');
  assertMaxLength(normalizedClassName, 50, '班级名称不能超过50个字符');

  const row = await getClassForTeacher(
    classId,
    teacherId,
    'id, class_name, class_code, teacher_id, teacher_name, created_at'
  );
  if (!row) throw new NotFoundError('班级不存在或无权限修改');

  await updateClassName(row.id, normalizedClassName);
  await syncClassNameReferences(row.id, normalizedClassName);
  return toClientClass({ ...row, class_name: normalizedClassName }, []);
}

export async function deleteClassForTeacher({ teacherId, classId }) {
  const row = await getClassForTeacher(classId, teacherId, 'id');
  if (!row) throw new NotFoundError('班级不存在或无权限删除');
  await clearClassReferences(row.id);
  await deleteClass(row.id);
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
