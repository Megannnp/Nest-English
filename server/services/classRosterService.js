import { listAssignmentSubmissionRows } from './assignmentSubmissionRowsService.js';
import {
  normalizeStudentName,
  normalizeStudentNo,
  toRosterBindingValidationError,
} from './classDomain.js';
import {
  createAndLinkRosterForClassUser,
  linkRosterToClassUserByStudentNo,
  linkSpecificRosterToClassUser,
  unlinkRosterFromClassUser,
} from './classJoinRepository.js';
import {
  toClientClassQueueWriting,
  toClientClassRosterItem,
  toClientUnmatchedClassUser,
} from './classMapper.js';
import { getTeacherOwnedClass } from './classMembershipService.js';
import {
  listRosterItemsByClassId,
  listUnmatchedClassUsers,
  upsertRosterItems,
} from './classRosterRepository.js';
import { ValidationError } from '../utils/appError.js';
import { nanoid } from '../utils/nanoid.js';
import { requireTrimmedString } from '../utils/routeValidation.js';

export async function listClassWritingsForTeacher({ teacherId, classId }) {
  await getTeacherOwnedClass({ teacherId, classId });

  const rows = await listAssignmentSubmissionRows({ teacherId, classId, limit: 200 });
  return rows
    .filter((row) => row.writingId)
    .map(toClientClassQueueWriting);
}

export async function listClassRosterForTeacher({ teacherId, classId }) {
  await getTeacherOwnedClass({ teacherId, classId });

  const rows = await listRosterItemsByClassId(classId);
  return rows.map(toClientClassRosterItem);
}

export async function listUnmatchedClassUsersForTeacher({ teacherId, classId }) {
  await getTeacherOwnedClass({ teacherId, classId });

  const rows = await listUnmatchedClassUsers(classId);
  return rows.map(toClientUnmatchedClassUser);
}

export async function linkClassRosterUserForTeacher({ teacherId, classId, userId }) {
  await getTeacherOwnedClass({ teacherId, classId });
  const normalizedUserId = requireTrimmedString(userId, '请选择要绑定的学生账号');

  try {
    return await linkRosterToClassUserByStudentNo({
      classId,
      userId: normalizedUserId,
      now: Date.now(),
    });
  } catch (error) {
    throw toRosterBindingValidationError(error);
  }
}

export async function createAndLinkClassRosterUserForTeacher({ teacherId, classId, userId }) {
  await getTeacherOwnedClass({ teacherId, classId });
  const normalizedUserId = requireTrimmedString(userId, '请选择要绑定的学生账号');

  try {
    return await createAndLinkRosterForClassUser({
      classId,
      userId: normalizedUserId,
      rosterId: nanoid(),
      now: Date.now(),
    });
  } catch (error) {
    throw toRosterBindingValidationError(error);
  }
}

export async function linkSpecificClassRosterUserForTeacher({ teacherId, classId, rosterId, userId }) {
  await getTeacherOwnedClass({ teacherId, classId });
  const normalizedRosterId = requireTrimmedString(rosterId, '请选择要绑定的名单学生');
  const normalizedUserId = requireTrimmedString(userId, '请选择要绑定的学生账号');

  try {
    return await linkSpecificRosterToClassUser({
      classId,
      rosterId: normalizedRosterId,
      userId: normalizedUserId,
      now: Date.now(),
    });
  } catch (error) {
    throw toRosterBindingValidationError(error);
  }
}

export async function unlinkClassRosterUserForTeacher({ teacherId, classId, rosterId }) {
  await getTeacherOwnedClass({ teacherId, classId });
  const normalizedRosterId = requireTrimmedString(rosterId, '请选择要解绑的名单学生');

  try {
    return await unlinkRosterFromClassUser({
      classId,
      rosterId: normalizedRosterId,
      now: Date.now(),
    });
  } catch (error) {
    throw toRosterBindingValidationError(error);
  }
}

export async function importClassRosterForTeacher({ teacherId, classId, items }) {
  await getTeacherOwnedClass({ teacherId, classId });
  if (!Array.isArray(items) || !items.length) {
    throw new ValidationError('请提供要导入的学生名单');
  }

  const normalizedEntries = items.map((item, index) => {
    const studentNo = normalizeStudentNo(item?.studentNo);
    const studentName = normalizeStudentName(item?.studentName);
    if (!studentNo) throw new ValidationError(`第 ${index + 1} 行缺少学号`);
    if (!studentName) throw new ValidationError(`第 ${index + 1} 行缺少姓名`);
    if (studentNo.length > 32) throw new ValidationError(`第 ${index + 1} 行学号过长`);
    if (studentName.length > 128) throw new ValidationError(`第 ${index + 1} 行姓名过长`);
    return {
      id: nanoid(),
      studentNo,
      studentName,
    };
  });

  const duplicateStudentNo = normalizedEntries.find((entry, index) => (
    normalizedEntries.findIndex((candidate) => candidate.studentNo === entry.studentNo) !== index
  ));
  if (duplicateStudentNo) {
    throw new ValidationError(`学号 ${duplicateStudentNo.studentNo} 在本次导入中重复`);
  }

  await upsertRosterItems({
    classId,
    entries: normalizedEntries,
    now: Date.now(),
  });

  const rows = await listRosterItemsByClassId(classId);
  return {
    importedCount: normalizedEntries.length,
    items: rows.map(toClientClassRosterItem),
  };
}
