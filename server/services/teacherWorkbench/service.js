import { listAssignmentsByTeacher } from '../assignmentService.js';
import {
  mapDueSoonAssignment,
  mapPendingComment,
  mapWorkbenchDraft,
  mapWorkbenchException,
  mapWorkbenchGrading,
} from './mappers.js';
import { getTeacherWorkbenchOverview } from './overview.js';
import {
  listDueSoonRows,
  listExceptionRows,
  listGradingRows,
  listPendingCommentRows,
} from './queries.js';
import { normalizeAssignmentStatus } from './status.js';

export { getTeacherWorkbenchOverview };

export async function listTeacherWorkbenchDrafts(teacherId) {
  const assignments = (await listAssignmentsByTeacher(teacherId))
    .map((item) => ({
      ...item,
      status: normalizeAssignmentStatus(item.status),
    }))
    .filter((item) => item.status === 'draft')
    .slice(0, 20);

  return assignments.map(mapWorkbenchDraft);
}

export async function listTeacherWorkbenchDueSoon(teacherId) {
  const now = Date.now();
  const rows = await listDueSoonRows(teacherId, now, now + 48 * 60 * 60 * 1000);
  return rows.map(mapDueSoonAssignment);
}

export async function listTeacherWorkbenchGradings(teacherId) {
  const rows = await listGradingRows(teacherId);
  return rows.map(mapWorkbenchGrading);
}

export async function listTeacherWorkbenchPendingComments(teacherId) {
  const rows = await listPendingCommentRows(teacherId);
  return rows.map(mapPendingComment);
}

export async function listTeacherWorkbenchExceptions(teacherId) {
  const rows = await listExceptionRows(teacherId);
  return rows.map(mapWorkbenchException);
}
