import { safeJsonParse } from '../utils/writingFeedback.js';

export function toClientClass(row, studentIds = []) {
  return {
    id: row.id,
    className: row.class_name,
    classCode: row.class_code,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    createdAt: row.created_at,
    students: studentIds,
  };
}

export function toClientClassSearchResult(row, studentCount = 0) {
  return {
    id: row.id,
    className: row.class_name,
    classCode: row.class_code,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    createdAt: row.created_at,
    studentCount: Number(studentCount || 0),
  };
}

export function toClientClassUser(row) {
  if (!row) return null;
  const displayName = row.real_name || '';
  return {
    id: row.id,
    accountCode: row.account_code || '',
    name: displayName,
    email: row.email,
    role: row.role,
    realName: row.real_name,
    studentNo: row.student_no || '',
    classId: row.class_id,
    className: row.class_name,
  };
}

export function toClientClassStudent(row, stats) {
  return {
    id: row.id,
    accountCode: row.account_code || '',
    name: row.real_name,
    realName: row.real_name,
    studentNo: row.student_no || '',
    email: row.email,
    classId: row.class_id,
    className: row.class_name,
    stats,
  };
}

export function toClientClassQueueWriting(row) {
  // row is already camelCase-mapped by listAssignmentSubmissionRows
  return row;
}

export function toClientClassRosterItem(row) {
  return {
    id: row.id,
    classId: row.class_id,
    studentNo: row.student_no || '',
    studentName: row.student_name || '',
    userId: row.user_id || null,
    linkedUserName: row.linked_user_name || '',
    linkedUserEmail: row.linked_user_email || '',
    status: row.status || 'pending',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function toClientUnmatchedClassUser(row) {
  return {
    id: row.id,
    accountCode: row.account_code || '',
    realName: row.real_name || '',
    email: row.email || '',
    studentNo: row.student_no || '',
    classId: row.class_id || null,
    className: row.class_name || '',
    joinedAt: row.joined_at || null,
  };
}

export function toClientClassWriting(row) {
  return {
    id: row.id,
    userId: row.user_id,
    studentName: row.student_real_name || row.user_name,
    userName: row.user_name,
    className: row.class_name,
    writingTitle: row.writing_title,
    selectedType: row.selected_type,
    selectedThemes: safeJsonParse(row.selected_themes, []),
    wordCount: row.word_count,
    maxScore: row.max_score,
    source: row.source || 'self',
    teacherComment: safeJsonParse(row.teacher_comment, null),
    submittedByTeacher: safeJsonParse(row.submitted_by_teacher, null),
    createdAt: row.created_at,
    feedback: {
      totalScore: row.total_score,
      tier: row.tier,
      summary: row.summary,
      categories: safeJsonParse(row.categories, []),
    },
  };
}
