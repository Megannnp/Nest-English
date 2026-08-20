import {
  buildStudentStats,
  verifyClassPassword,
} from './classDomain.js';
import {
  toClientClass,
  toClientClassStudent,
  toClientClassUser,
} from './classMapper.js';
import {
  getClassById,
  getClassForTeacher,
  getClassUserById,
  joinClassTransaction,
  listClassMemberIds,
  listUsersByIds,
  listWritingStatsByUserIds,
  updateUserClass,
} from './classRepository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/appError.js';
import { requireTrimmedString } from '../utils/routeValidation.js';

export async function joinClassForStudent({ user, classId, password }) {
  if (user.role !== 'student') {
    throw new ForbiddenError('只有学生可以加入班级');
  }

  const normalizedPassword = requireTrimmedString(password, '请输入班级密码');
  const row = await getClassById(classId);
  if (!row) throw new NotFoundError('班级不存在');

  const { valid, upgradedHash } = await verifyClassPassword(row.password, normalizedPassword);
  if (!valid) throw new ValidationError('班级密码错误');

  let joinResult;
  try {
    joinResult = await joinClassTransaction({
      classId,
      className: row.class_name,
      studentId: user.id,
      upgradedHash,
    });
  } catch (error) {
    if (error?.message === 'ROSTER_ALREADY_LINKED') {
      throw new ValidationError('该学号已在当前班级绑定其他账号，请联系老师确认');
    }
    throw error;
  }

  const updatedUser = await getClassUserById(user.id);
  return {
    classId: row.id,
    className: row.class_name,
    rosterMatched: Boolean(joinResult?.matchedRosterId),
    matchedRosterId: joinResult?.matchedRosterId || null,
    matchedRosterName: joinResult?.matchedRosterName || '',
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

  return users.map((candidate) => (
    toClientClassStudent(candidate, buildStudentStats(writingMap[candidate.id] || []))
  ));
}

export async function getTeacherOwnedClass({ teacherId, classId }) {
  const cls = await getClassForTeacher(classId, teacherId);
  if (!cls) throw new NotFoundError('班级不存在');
  return cls;
}

export async function getClassSummaryForTeacher({ teacherId, classId }) {
  await getTeacherOwnedClass({ teacherId, classId });
  const row = await getClassById(classId);
  const studentIds = await listClassMemberIds(classId);
  return toClientClass(row, studentIds);
}
