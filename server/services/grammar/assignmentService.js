import { savePracticeRecord } from './practiceRecordService.js';
import db from '../../db/database.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/appError.js';
import { nanoid } from '../../utils/nanoid.js';
import { getClassForTeacher, listClassMemberIds } from '../classRepository.js';

const DEFAULT_STAGE = '高中';
const DEFAULT_DIFFICULTY = '中等';

function toTimestamp(value) {
  if (!value) return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function validateScoreCounts(correctCount, totalCount) {
  const correct = Number(correctCount);
  const total = Number(totalCount);
  if (!Number.isInteger(correct) || correct < 0) {
    throw new ValidationError('答对题数不合法');
  }
  if (!Number.isInteger(total) || total < 1) {
    throw new ValidationError('总题数不合法');
  }
  if (correct > total) {
    throw new ValidationError('答对题数不能大于总题数');
  }
}

async function withConnection(callback) {
  if (!db.pool?.getConnection) return callback(null);
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function queryOne(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.query(sql, params);
    return rows[0] || null;
  }
  return db.prepare(sql).get(...params);
}

async function runSql(connection, sql, params = []) {
  if (connection) {
    const [result] = await connection.query(sql, params);
    return { changes: result.affectedRows ?? 0 };
  }
  return db.prepare(sql).run(...params);
}

function toClientTeacherAssignment(row) {
  return {
    id: row.id,
    title: row.title,
    classId: row.class_id,
    className: row.class_name || '',
    grammarPoint: row.grammar_point,
    quizType: row.quiz_type,
    stage: row.stage || DEFAULT_STAGE,
    difficulty: row.difficulty || DEFAULT_DIFFICULTY,
    dueAt: row.due_at ? Number(row.due_at) : null,
    allowLate: Boolean(row.allow_late),
    status: row.status,
    assignedCount: Number(row.assigned_count || 0),
    completedCount: Number(row.completed_count || 0),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function toClientStudentTask(row, now = Date.now()) {
  const completed = Boolean(row.submission_id);
  const dueAt = row.due_at ? Number(row.due_at) : null;
  const allowLate = Boolean(row.allow_late);
  const overdue = !completed && dueAt && dueAt < now && !allowLate;
  return {
    id: row.id,
    taskType: 'grammar',
    status: completed ? 'completed' : overdue ? 'overdue' : 'pending',
    submittedAt: row.submitted_at ? Number(row.submitted_at) : null,
    assignment: {
      id: row.id,
      title: row.title,
      classId: row.class_id,
      className: row.class_name || '',
      teacherName: row.teacher_name || '',
      grammarPoint: row.grammar_point,
      quizType: row.quiz_type,
      stage: row.stage || DEFAULT_STAGE,
      difficulty: row.difficulty || DEFAULT_DIFFICULTY,
      dueAt,
      allowLate,
    },
    grammarConfig: {
      assignmentId: row.id,
      grammar: row.grammar_point,
      type: row.quiz_type,
      stage: row.stage || DEFAULT_STAGE,
      difficulty: row.difficulty || DEFAULT_DIFFICULTY,
    },
  };
}

export async function createGrammarAssignment({ teacher, payload }) {
  const cls = await getClassForTeacher(payload.classId, teacher.id, 'id, class_name');
  if (!cls) throw new NotFoundError('班级不存在或无权限发布任务');

  const studentIds = await listClassMemberIds(cls.id);
  if (!studentIds.length) {
    throw new ValidationError('当前班级暂无学生，无法发布语法任务');
  }

  const id = nanoid();
  const now = Date.now();
  await db.prepare(`
    INSERT INTO grammar_assignments
      (id, teacher_id, class_id, title, grammar_point, quiz_type, stage, difficulty, due_at, allow_late, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
  `).run(
    id,
    teacher.id,
    cls.id,
    payload.title,
    payload.grammarPoint,
    payload.quizType,
    payload.stage || DEFAULT_STAGE,
    payload.difficulty || DEFAULT_DIFFICULTY,
    toTimestamp(payload.dueAt),
    payload.allowLate ? 1 : 0,
    now,
    now
  );

  return getGrammarAssignmentForTeacher({ teacherId: teacher.id, assignmentId: id });
}

export async function listGrammarAssignmentsForTeacher({ teacherId, classId = '', limit = 50, offset = 0 }) {
  const params = [teacherId];
  let classFilter = '';
  if (classId) {
    const cls = await getClassForTeacher(classId, teacherId, 'id');
    if (!cls) throw new NotFoundError('班级不存在或无权限查看');
    classFilter = 'AND ga.class_id = ?';
    params.push(classId);
  }

  const rows = await db.prepare(`
    SELECT
      ga.*,
      c.class_name,
      COUNT(DISTINCT cs.student_id) AS assigned_count,
      COUNT(DISTINCT gas.student_id) AS completed_count
    FROM grammar_assignments ga
    JOIN classes c ON c.id = ga.class_id
    LEFT JOIN class_students cs ON cs.class_id = ga.class_id
    LEFT JOIN grammar_assignment_submissions gas ON gas.assignment_id = ga.id
    WHERE ga.teacher_id = ?
      ${classFilter}
    GROUP BY ga.id
    ORDER BY ga.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return rows.map(toClientTeacherAssignment);
}

export async function getGrammarAssignmentForTeacher({ teacherId, assignmentId }) {
  const row = await db.prepare(`
    SELECT
      ga.*,
      c.class_name,
      COUNT(DISTINCT cs.student_id) AS assigned_count,
      COUNT(DISTINCT gas.student_id) AS completed_count
    FROM grammar_assignments ga
    JOIN classes c ON c.id = ga.class_id
    LEFT JOIN class_students cs ON cs.class_id = ga.class_id
    LEFT JOIN grammar_assignment_submissions gas ON gas.assignment_id = ga.id
    WHERE ga.id = ? AND ga.teacher_id = ?
    GROUP BY ga.id
    LIMIT 1
  `).get(assignmentId, teacherId);

  if (!row) throw new NotFoundError('语法任务不存在或无权限查看');
  return toClientTeacherAssignment(row);
}

export async function listGrammarAssignmentSubmissionsForTeacher({ teacherId, assignmentId }) {
  const assignment = await db.prepare(`
    SELECT id, class_id
    FROM grammar_assignments
    WHERE id = ? AND teacher_id = ?
    LIMIT 1
  `).get(assignmentId, teacherId);

  if (!assignment) throw new NotFoundError('语法任务不存在或无权限查看');

  const rows = await db.prepare(`
    SELECT
      u.id,
      u.real_name,
      u.name,
      u.student_no,
      gas.correct_count,
      gas.total_count,
      gas.submitted_at
    FROM class_students cs
    JOIN users u ON u.id = cs.student_id
    LEFT JOIN grammar_assignment_submissions gas
      ON gas.assignment_id = ?
     AND gas.student_id = cs.student_id
    WHERE cs.class_id = ?
    ORDER BY
      CASE WHEN gas.id IS NULL THEN 1 ELSE 0 END,
      gas.submitted_at DESC,
      u.student_no ASC,
      u.real_name ASC
  `).all(assignmentId, assignment.class_id);

  return rows.map((row) => ({
    studentId: row.id,
    realName: row.real_name || row.name || '未命名',
    studentNo: row.student_no || '',
    status: row.submitted_at ? 'submitted' : 'pending',
    correctCount: row.submitted_at ? Number(row.correct_count || 0) : null,
    totalCount: row.submitted_at ? Number(row.total_count || 0) : null,
    submittedAt: row.submitted_at ? Number(row.submitted_at) : null,
  }));
}

export async function listGrammarTasksForStudent({ student }) {
  if (!student?.id) return [];
  const userRow = await db.prepare('SELECT class_id FROM users WHERE id = ? LIMIT 1').get(student.id);
  const classId = userRow?.class_id || null;
  if (!classId) return [];
  const rows = await db.prepare(`
    SELECT
      ga.*,
      c.class_name,
      u.real_name AS teacher_name,
      gas.id AS submission_id,
      gas.correct_count,
      gas.total_count,
      gas.submitted_at
    FROM grammar_assignments ga
    JOIN classes c ON c.id = ga.class_id
    LEFT JOIN users u ON u.id = ga.teacher_id
    LEFT JOIN grammar_assignment_submissions gas
      ON gas.assignment_id = ga.id
     AND gas.student_id = ?
    WHERE ga.class_id = ?
      AND ga.status = 'published'
    ORDER BY
      CASE WHEN gas.id IS NULL THEN 0 ELSE 1 END,
      COALESCE(ga.due_at, ga.created_at) ASC,
      ga.created_at DESC
  `).all(student.id, classId);

  return rows.map((row) => toClientStudentTask(row));
}

export async function submitGrammarAssignment({ student, assignmentId, correctCount, totalCount }) {
  validateScoreCounts(correctCount, totalCount);

  return withConnection(async (connection) => {
    const assignment = await queryOne(connection, `
      SELECT ga.*, cs.student_id
      FROM grammar_assignments ga
      LEFT JOIN class_students cs
        ON cs.class_id = ga.class_id
       AND cs.student_id = ?
      WHERE ga.id = ?
      LIMIT 1
    `, [student.id, assignmentId]);

    if (!assignment) throw new NotFoundError('语法任务不存在');
    if (assignment.student_id !== student.id) throw new ForbiddenError('无权限提交该语法任务');

    const now = Date.now();
    const dueAt = assignment.due_at ? Number(assignment.due_at) : null;
    if (dueAt && dueAt < now && !assignment.allow_late) {
      throw new ValidationError('该语法任务已截止，不能补交');
    }

    const existing = await queryOne(
      connection,
      'SELECT id FROM grammar_assignment_submissions WHERE assignment_id = ? AND student_id = ? LIMIT 1',
      [assignmentId, student.id]
    );
    if (existing) throw new ValidationError('该语法任务已提交，不能重复作答');

    const id = nanoid();
    await runSql(connection, `
      INSERT INTO grammar_assignment_submissions
        (id, assignment_id, student_id, correct_count, total_count, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, assignmentId, student.id, Number(correctCount || 0), Number(totalCount || 0), now]);

    await savePracticeRecord({
      userId: student.id,
      grammarPoint: assignment.grammar_point,
      quizType: assignment.quiz_type,
      stage: assignment.stage || DEFAULT_STAGE,
      difficulty: assignment.difficulty || DEFAULT_DIFFICULTY,
      correctCount: Number(correctCount || 0),
      totalCount: Number(totalCount || 0),
      connection,
    });

    return { id: assignmentId, submittedAt: now };
  });
}
