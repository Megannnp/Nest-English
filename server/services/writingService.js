import db from '../db/database.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/appError.js';
import { optionalTrimmedString } from '../utils/routeValidation.js';

const MAX_TEACHER_COMMENT_IMAGE_JSON_BYTES = 100 * 1024;

export function createNotFoundError(message = '写作记录不存在') {
  return new NotFoundError(message);
}

export function createForbiddenError(message = '无权限执行此操作') {
  return new ForbiddenError(message);
}

export function createConflictError(message = '当前操作与记录状态冲突') {
  return new ConflictError(message);
}

export async function getWritingById(writingId) {
  return db.prepare('SELECT * FROM writings WHERE id = ?').get(writingId);
}

export async function loadWritingOrThrow(writingId, message = '写作记录不存在') {
  const row = await getWritingById(writingId);
  if (!row) {
    throw createNotFoundError(message);
  }
  return row;
}

export async function canTeacherAccessWriting(teacherId, row) {
  if (!teacherId || !row?.user_id) return false;

  let submittedByTeacher = null;
  try {
    submittedByTeacher = row.submitted_by_teacher ? JSON.parse(row.submitted_by_teacher) : null;
  } catch {
    submittedByTeacher = null;
  }

  if (submittedByTeacher?.teacherId && submittedByTeacher.teacherId === teacherId) {
    return true;
  }

  const classMembership = await db.prepare(`
    SELECT 1
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    WHERE cs.student_id = ? AND c.teacher_id = ?
    LIMIT 1
  `).get(row.user_id, teacherId);

  return Boolean(classMembership);
}

export async function canTeacherManageStudent(teacherId, studentId) {
  if (!teacherId || !studentId) return false;

  const membership = await db.prepare(`
    SELECT 1
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    WHERE cs.student_id = ? AND c.teacher_id = ?
    LIMIT 1
  `).get(studentId, teacherId);

  return Boolean(membership);
}

export async function assertWritingAccess({
  user,
  row,
  allowOwner = true,
  allowTeacher = true,
  forbiddenMessage = '无权限访问此写作',
}) {
  if (!row) {
    throw createNotFoundError();
  }

  const isOwner = allowOwner && row.user_id === user?.id;
  const canTeacher = allowTeacher && user?.role === 'teacher'
    ? await canTeacherAccessWriting(user.id, row)
    : false;

  if (!isOwner && !canTeacher) {
    throw createForbiddenError(forbiddenMessage);
  }

  return { isOwner, canTeacherAccess: canTeacher };
}

export async function assertTeacherCanManageStudent(teacherId, studentId, message = '无权限为该学生处理写作') {
  const allowed = await canTeacherManageStudent(teacherId, studentId);
  if (!allowed) {
    throw createForbiddenError(message);
  }
}

export function assertWritingCanBeDeleted(row) {
  if (!row) {
    throw createNotFoundError();
  }

  if (row.assignment_id || String(row.source || '').toLowerCase() === 'homework') {
    throw createConflictError('教师布置的任务记录不支持删除');
  }
}

export function buildTeacherCommentPayload({ content, annotatedImage, teacher }) {
  const normalizedContent = optionalTrimmedString(content, 5000) || '';
  const normalizedImage = annotatedImage && typeof annotatedImage === 'object'
    ? annotatedImage
    : null;

  if (normalizedImage && JSON.stringify(normalizedImage).length > MAX_TEACHER_COMMENT_IMAGE_JSON_BYTES) {
    throw new ValidationError('批注图片数据过大，请重新上传');
  }

  if (!normalizedContent && !normalizedImage) {
    throw new ValidationError('请填写评语或上传批注图片');
  }

  return {
    content: normalizedContent,
    timestamp: new Date().toLocaleString('zh-CN'),
    teacherName: teacher?.realName || teacher?.name || '教师',
    annotatedImage: normalizedImage,
  };
}
