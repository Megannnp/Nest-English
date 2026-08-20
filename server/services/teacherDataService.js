import db from '../db/database.js';
import { NotFoundError } from '../utils/appError.js';

function pct(done, total) {
  const safeTotal = Number(total || 0);
  if (safeTotal <= 0) return 0;
  return Math.round((Number(done || 0) / safeTotal) * 100);
}

function maxTimestamp(values = []) {
  const numeric = values
    .map((value) => Number(value || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  return numeric.length ? Math.max(...numeric) : null;
}

function uniqueById(items = []) {
  const map = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
}

function makeStudent(row = {}) {
  return {
    id: row.student_id || row.id,
    name: row.real_name || row.nick_name || row.student_name || '未命名',
    studentNo: row.student_no || '',
  };
}

async function getTeacherClass(teacherId, classId) {
  const row = await db.prepare(`
    SELECT id, class_name
    FROM classes
    WHERE id = ? AND teacher_id = ?
    LIMIT 1
  `).get(classId, teacherId);
  if (!row) throw new NotFoundError('班级不存在或无权限查看');
  return row;
}

async function listTeacherClasses(teacherId) {
  return db.prepare(`
    SELECT
      c.id,
      c.class_name,
      COUNT(DISTINCT cs.student_id) AS student_count
    FROM classes c
    LEFT JOIN class_students cs ON cs.class_id = c.id
    WHERE c.teacher_id = ?
    GROUP BY c.id, c.class_name
    ORDER BY c.created_at DESC
  `).all(teacherId);
}

async function listClassStudents(teacherId, classId) {
  await getTeacherClass(teacherId, classId);
  return db.prepare(`
    SELECT
      u.id,
      u.real_name,
      u.nick_name,
      u.student_no,
      u.email
    FROM class_students cs
    JOIN users u ON u.id = cs.student_id
    WHERE cs.class_id = ?
    ORDER BY u.student_no ASC, u.real_name ASC, u.nick_name ASC
  `).all(classId);
}

async function getWritingData(classId, studentRows) {
  const assignmentRows = await db.prepare(`
    SELECT
      a.id,
      a.title,
      COUNT(t.id) AS assigned_count,
      SUM(CASE WHEN t.status IN ('submitted', 'grading', 'returned') THEN 1 ELSE 0 END) AS submitted_count,
      SUM(CASE WHEN t.status = 'returned' THEN 1 ELSE 0 END) AS returned_count,
      SUM(CASE
        WHEN t.status = 'returned'
          AND w.teacher_comment IS NOT NULL
          AND TRIM(w.teacher_comment) <> ''
        THEN 1 ELSE 0 END
      ) AS commented_count,
      MAX(COALESCE(t.submitted_at, t.graded_at, t.updated_at, a.updated_at)) AS last_activity_at
    FROM assignments a
    LEFT JOIN assignment_tasks t ON t.assignment_id = a.id
    LEFT JOIN writings w ON w.id = t.writing_id
    WHERE a.class_id = ?
    GROUP BY a.id, a.title
    ORDER BY a.created_at DESC
  `).all(classId);

  const pendingRows = await db.prepare(`
    SELECT DISTINCT
      u.id AS student_id,
      u.real_name,
      u.nick_name,
      u.student_no
    FROM assignments a
    JOIN assignment_tasks t ON t.assignment_id = a.id
    JOIN users u ON u.id = t.student_id
    WHERE a.class_id = ?
      AND t.status IN ('pending', 'overdue')
    ORDER BY u.student_no ASC, u.real_name ASC
  `).all(classId);

  const assignedCount = assignmentRows.reduce((sum, row) => sum + Number(row.assigned_count || 0), 0);
  const submittedCount = assignmentRows.reduce((sum, row) => sum + Number(row.submitted_count || 0), 0);
  const returnedCount = assignmentRows.reduce((sum, row) => sum + Number(row.returned_count || 0), 0);
  const commentedCount = assignmentRows.reduce((sum, row) => sum + Number(row.commented_count || 0), 0);

  return {
    assignmentCount: assignmentRows.length,
    assignedCount,
    submittedCount,
    returnedCount,
    commentReadyCount: commentedCount,
    completionRate: pct(returnedCount, assignedCount),
    submissionRate: pct(submittedCount, assignedCount),
    teacherCommentCoverageRate: pct(commentedCount, returnedCount),
    lastActivityAt: maxTimestamp(assignmentRows.map((row) => row.last_activity_at)),
    pendingStudents: pendingRows.map(makeStudent),
    assignments: assignmentRows.map((row) => ({
      id: row.id,
      title: row.title || '未命名写作任务',
      assignedCount: Number(row.assigned_count || 0),
      submittedCount: Number(row.submitted_count || 0),
      returnedCount: Number(row.returned_count || 0),
      commentReadyCount: Number(row.commented_count || 0),
      completionRate: pct(row.returned_count, row.assigned_count),
    })),
    studentCount: studentRows.length,
  };
}

async function getGrammarData(classId) {
  const assignmentRows = await db.prepare(`
    SELECT
      ga.id,
      ga.title,
      COUNT(DISTINCT cs.student_id) AS assigned_count,
      COUNT(DISTINCT gas.student_id) AS submitted_count,
      MAX(gas.submitted_at) AS last_submitted_at
    FROM grammar_assignments ga
    LEFT JOIN class_students cs ON cs.class_id = ga.class_id
    LEFT JOIN grammar_assignment_submissions gas ON gas.assignment_id = ga.id
    WHERE ga.class_id = ?
    GROUP BY ga.id, ga.title
    ORDER BY ga.created_at DESC
  `).all(classId);

  const practiceRow = await db.prepare(`
    SELECT
      COUNT(gpr.id) AS sessions,
      SUM(gpr.total_count) AS total_questions,
      SUM(gpr.correct_count) AS correct_questions,
      MAX(gpr.created_at) AS last_practiced_at
    FROM class_students cs
    LEFT JOIN grammar_practice_records gpr ON gpr.user_id = cs.student_id
    WHERE cs.class_id = ?
  `).get(classId);

  const pendingRows = await db.prepare(`
    SELECT DISTINCT
      u.id AS student_id,
      u.real_name,
      u.nick_name,
      u.student_no
    FROM grammar_assignments ga
    JOIN class_students cs ON cs.class_id = ga.class_id
    JOIN users u ON u.id = cs.student_id
    LEFT JOIN grammar_assignment_submissions gas
      ON gas.assignment_id = ga.id AND gas.student_id = cs.student_id
    WHERE ga.class_id = ?
      AND gas.id IS NULL
    ORDER BY u.student_no ASC, u.real_name ASC
  `).all(classId);

  const assignedCount = assignmentRows.reduce((sum, row) => sum + Number(row.assigned_count || 0), 0);
  const submittedCount = assignmentRows.reduce((sum, row) => sum + Number(row.submitted_count || 0), 0);
  const totalQuestions = Number(practiceRow?.total_questions || 0);
  const correctQuestions = Number(practiceRow?.correct_questions || 0);

  return {
    assignmentCount: assignmentRows.length,
    assignedCount,
    submittedCount,
    completionRate: pct(submittedCount, assignedCount),
    practiceSessions: Number(practiceRow?.sessions || 0),
    totalQuestions,
    correctQuestions,
    accuracy: pct(correctQuestions, totalQuestions),
    lastPracticedAt: practiceRow?.last_practiced_at ? Number(practiceRow.last_practiced_at) : null,
    pendingStudents: pendingRows.map(makeStudent),
    assignments: assignmentRows.map((row) => ({
      id: row.id,
      title: row.title || '未命名语法任务',
      assignedCount: Number(row.assigned_count || 0),
      submittedCount: Number(row.submitted_count || 0),
      completionRate: pct(row.submitted_count, row.assigned_count),
    })),
  };
}

async function getReadingData(classId) {
  const practiceRow = await db.prepare(`
    SELECT
      COUNT(rpr.id) AS sessions,
      SUM(rpr.total_count) AS total_questions,
      SUM(rpr.correct_count) AS correct_questions,
      MAX(rpr.created_at) AS last_practiced_at
    FROM class_students cs
    LEFT JOIN reading_practice_records rpr ON rpr.user_id = cs.student_id
    WHERE cs.class_id = ?
  `).get(classId);

  const analysisRow = await db.prepare(`
    SELECT
      COUNT(ra.id) AS analyses_count,
      MAX(ra.created_at) AS last_analyzed_at
    FROM class_students cs
    LEFT JOIN reading_analyses ra ON ra.user_id = cs.student_id AND ra.status = 'success'
    WHERE cs.class_id = ?
  `).get(classId);

  const totalQuestions = Number(practiceRow?.total_questions || 0);
  const correctQuestions = Number(practiceRow?.correct_questions || 0);
  const lastRecordAt = maxTimestamp([practiceRow?.last_practiced_at, analysisRow?.last_analyzed_at]);

  return {
    practiceSessions: Number(practiceRow?.sessions || 0),
    totalQuestions,
    correctQuestions,
    accuracy: pct(correctQuestions, totalQuestions),
    analysesCount: Number(analysisRow?.analyses_count || 0),
    lastRecordAt,
  };
}

async function getModuleData(classId) {
  const rows = await db.prepare(`
    SELECT
      ma.module_type,
      COUNT(DISTINCT ma.id) AS assignment_count,
      COUNT(DISTINCT CONCAT(ma.id, ':', cs.student_id)) AS assigned_count,
      COUNT(DISTINCT mas.id) AS completed_count,
      MAX(COALESCE(mas.completed_at, ma.updated_at)) AS last_activity_at
    FROM module_assignments ma
    LEFT JOIN class_students cs ON cs.class_id = ma.class_id
    LEFT JOIN module_assignment_submissions mas ON mas.assignment_id = ma.id
    WHERE ma.class_id = ?
    GROUP BY ma.module_type
    ORDER BY ma.module_type ASC
  `).all(classId);

  const [vocabRow, listeningRow, phoneticsRow, speakingRow] = await Promise.all([
    getClassActivityProgress(classId, 'vocabulary_progress_records'),
    getClassActivityProgress(classId, 'listening_progress_records'),
    getClassActivityProgress(classId, 'phonetics_progress_records'),
    getClassActivityProgress(classId, 'speaking_progress_records', { hasAccuracy: false }),
  ]);

  const assignedCount = rows.reduce((sum, row) => sum + Number(row.assigned_count || 0), 0);
  const completedCount = rows.reduce((sum, row) => sum + Number(row.completed_count || 0), 0);
  const realRecords = [
    mapClassActivityProgress('vocabulary', vocabRow),
    mapClassActivityProgress('listening', listeningRow),
    mapClassActivityProgress('phonetics', phoneticsRow),
    mapClassActivityProgress('speaking', speakingRow),
  ];

  return {
    assignmentCount: rows.reduce((sum, row) => sum + Number(row.assignment_count || 0), 0),
    assignedCount,
    completedCount,
    completionRate: pct(completedCount, assignedCount),
    completionSource: 'manual',
    lastActivityAt: maxTimestamp(rows.map((row) => row.last_activity_at)),
    realPracticeSessions: realRecords.reduce((sum, row) => sum + row.sessions, 0),
    realRecords,
    byModule: rows.map((row) => ({
      moduleType: row.module_type,
      assignmentCount: Number(row.assignment_count || 0),
      assignedCount: Number(row.assigned_count || 0),
      completedCount: Number(row.completed_count || 0),
      completionRate: pct(row.completed_count, row.assigned_count),
      completionSource: 'manual',
      lastActivityAt: row.last_activity_at ? Number(row.last_activity_at) : null,
    })),
  };
}

async function getClassActivityProgress(classId, tableName, { hasAccuracy = true } = {}) {
  return db.prepare(`
    SELECT
      COUNT(pr.id) AS sessions,
      SUM(pr.duration_ms) AS duration_ms,
      AVG(pr.score) AS average_score,
      ${hasAccuracy ? 'AVG(pr.accuracy)' : 'NULL'} AS average_accuracy,
      MAX(pr.created_at) AS last_practiced_at
    FROM class_students cs
    LEFT JOIN ${tableName} pr ON pr.user_id = cs.student_id
    WHERE cs.class_id = ?
  `).get(classId);
}

function mapClassActivityProgress(moduleType, row) {
  return {
    moduleType,
    sessions: Number(row?.sessions || 0),
    durationMs: Number(row?.duration_ms || 0),
    averageScore: row?.average_score != null ? Math.round(Number(row.average_score)) : 0,
    averageAccuracy: row?.average_accuracy != null ? Math.round(Number(row.average_accuracy)) : 0,
    lastPracticedAt: row?.last_practiced_at != null ? Number(row.last_practiced_at) : null,
  };
}

function buildOverall({ studentRows, writing, grammar, modules }) {
  const assignedCount = Number(writing.assignedCount || 0)
    + Number(grammar.assignedCount || 0)
    + Number(modules.assignedCount || 0);
  const completedCount = Number(writing.returnedCount || 0)
    + Number(grammar.submittedCount || 0)
    + Number(modules.completedCount || 0);
  const pendingStudents = uniqueById([
    ...(writing.pendingStudents || []),
    ...(grammar.pendingStudents || []),
  ]);

  return {
    assignedCount,
    completedCount,
    completionRate: pct(completedCount, assignedCount),
    pendingStudentCount: pendingStudents.length,
    pendingStudents,
    studentCount: studentRows.length,
  };
}

function buildClassSummary({ classRow, studentRows, writing, grammar, reading, modules }) {
  return {
    id: classRow.id,
    classId: classRow.id,
    className: classRow.class_name || '',
    studentCount: studentRows.length,
    lastLearningAt: maxTimestamp([
      writing.lastActivityAt,
      grammar.lastPracticedAt,
      reading.lastRecordAt,
      modules.lastActivityAt,
    ]),
  };
}

export async function getTeacherClassData({ teacherId, classId }) {
  const classRow = await getTeacherClass(teacherId, classId);
  const studentRows = await listClassStudents(teacherId, classId);
  const [writing, grammar, reading, modules] = await Promise.all([
    getWritingData(classId, studentRows),
    getGrammarData(classId),
    getReadingData(classId),
    getModuleData(classId),
  ]);

  return {
    classSummary: buildClassSummary({ classRow, studentRows, writing, grammar, reading, modules }),
    students: studentRows.map(makeStudent),
    writing,
    grammar,
    reading,
    modules,
    overall: buildOverall({ studentRows, writing, grammar, modules }),
  };
}

export async function getTeacherDataOverview({ teacherId }) {
  const classRows = await listTeacherClasses(teacherId);
  const classes = await Promise.all(
    classRows.map(async (row) => {
      const detail = await getTeacherClassData({ teacherId, classId: row.id });
      return {
        ...detail.classSummary,
        overall: detail.overall,
      };
    })
  );

  const assignedCount = classes.reduce((sum, item) => sum + Number(item.overall.assignedCount || 0), 0);
  const completedCount = classes.reduce((sum, item) => sum + Number(item.overall.completedCount || 0), 0);
  const pendingStudents = classes.reduce((sum, item) => sum + Number(item.overall.pendingStudentCount || 0), 0);

  return {
    classes,
    summary: {
      classCount: classes.length,
      studentCount: classes.reduce((sum, item) => sum + Number(item.studentCount || 0), 0),
      assignedCount,
      completedCount,
      completionRate: pct(completedCount, assignedCount),
      pendingStudentCount: pendingStudents,
      lastLearningAt: maxTimestamp(classes.map((item) => item.lastLearningAt)),
    },
  };
}
