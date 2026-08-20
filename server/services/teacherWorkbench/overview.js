import { listAssignmentsByTeacher } from '../assignmentService.js';
import { mapWorkbenchDraft } from './mappers.js';
import { getExceptionCount, getPendingCommentsCount, getPendingGradingsCount } from './queries.js';
import { isDueSoonAssignment, normalizeAssignmentStatus } from './status.js';

export async function getTeacherWorkbenchOverview(teacherId) {
  const assignments = (await listAssignmentsByTeacher(teacherId)).map((item) => ({
    ...item,
    status: normalizeAssignmentStatus(item.status),
  }));

  const [pendingGradings, pendingComments, exceptionCount] = await Promise.all([
    getPendingGradingsCount(teacherId),
    getPendingCommentsCount(teacherId),
    getExceptionCount(teacherId),
  ]);

  return {
    todo: {
      draftCount: assignments.filter((item) => item.status === 'draft').length,
      publishedCount: assignments.filter((item) => item.status === 'published').length,
      dueSoonCount: assignments.filter((item) => isDueSoonAssignment(item)).length,
      pendingGradings,
      pendingComments,
      exceptionCount,
    },
    recentAssignments: assignments.slice(0, 5).map(mapWorkbenchDraft),
  };
}
