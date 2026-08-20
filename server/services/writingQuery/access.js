import { ForbiddenError } from '../../utils/appError.js';
import {
  assertWritingAccess,
  loadWritingOrThrow,
} from '../writingService.js';

export async function assertTeacherStudentWritingAccess({ teacherId, studentId, db }) {
  const canAccess = await db.prepare(`
    SELECT 1
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    WHERE cs.student_id = ? AND c.teacher_id = ?
    LIMIT 1
  `).get(studentId, teacherId);

  if (!canAccess) {
    throw new ForbiddenError('无权限查看该学生的写作记录');
  }
}

export async function loadAccessibleWriting({ writingId, user }) {
  const row = await loadWritingOrThrow(writingId);
  await assertWritingAccess({
    user,
    row,
    allowOwner: true,
    allowTeacher: true,
    forbiddenMessage: '无权限查看此写作',
  });
  return row;
}

export async function loadAccessibleWritingTasks({ writingId, user }) {
  const row = await loadWritingOrThrow(writingId);
  await assertWritingAccess({
    user,
    row,
    allowOwner: true,
    allowTeacher: true,
    forbiddenMessage: '无权限查看此写作任务',
  });
  return row;
}
