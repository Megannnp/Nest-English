import { getClassForTeacher, listClassMemberIds } from './classRepository.js';
import db from '../db/database.js';
import { NotFoundError, ValidationError } from '../utils/appError.js';
import { nanoid } from '../utils/nanoid.js';

export const MODULE_META = {
  reading:                  { label: '阅读练习',   group: '阅读', page: 'reading-practice' },
  'reading-paper':          { label: '阅读模拟卷', group: '阅读', page: 'reading-paper' },
  'reading-courses':        { label: '阅读课程',   group: '阅读', page: 'reading-courses' },
  vocab:                    { label: '词汇检测',   group: '词汇', page: 'vocab-quiz' },
  'vocab-analyzer':         { label: '单词分析',   group: '词汇', page: 'vocab-analyzer' },
  'vocab-courses':          { label: '词汇精讲',   group: '词汇', page: 'vocab-courses' },
  listening:                { label: '模拟练习',   group: '听读', page: 'listening-practice' },
  'listening-basics':       { label: '基础辨音',   group: '听读', page: 'listening-basics' },
  'listening-advanced':     { label: '篇章精听',   group: '听读', page: 'listening-advanced' },
  phonetics:                { label: '音素训练',   group: '语音', page: 'phonetics-sound' },
  'phonetics-combos':       { label: '拼读组合',   group: '语音', page: 'phonetics-combos' },
  'phonetics-syllable':     { label: '音节训练',   group: '语音', page: 'phonetics-syllable' },
  'phonetics-words':        { label: '词汇发音',   group: '语音', page: 'phonetics-words' },
  'phonetics-sentence':     { label: '句子朗读',   group: '语音', page: 'phonetics-sentence' },
  speaking:                 { label: '口语练习',   group: '口语', page: 'speaking' },
  'writing-refine-sentence':  { label: '句子润色', group: '写作精炼', page: 'writing-refine-sentence' },
  'writing-refine-structure': { label: '结构调整', group: '写作精炼', page: 'writing-refine-structure' },
};

const VALID_MODULES = new Set(Object.keys(MODULE_META));

function assertValidModule(moduleType) {
  if (!VALID_MODULES.has(moduleType)) {
    throw new ValidationError(`无效的模块类型: ${moduleType}`);
  }
}

export function isAssignableModule(moduleType) {
  const meta = MODULE_META[moduleType];
  return Boolean(meta) && meta.assignable !== false && meta.status !== 'reserved';
}

export function getAssignableModuleMeta() {
  return Object.fromEntries(
    Object.entries(MODULE_META).filter(([moduleType]) => isAssignableModule(moduleType)),
  );
}

function assertAssignableModule(moduleType) {
  assertValidModule(moduleType);
  if (!isAssignableModule(moduleType)) {
    throw new ValidationError(`模块暂不可布置: ${moduleType}`);
  }
}

function toTimestamp(value) {
  if (!value) return null;
  const ts = Number(value);
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

function toClient(row) {
  const meta = MODULE_META[row.module_type] || { label: row.module_type, group: '', page: '' };
  return {
    id: row.id,
    moduleType: row.module_type,
    moduleLabel: meta.label,
    moduleGroup: meta.group,
    classId: row.class_id,
    className: row.class_name || '',
    title: row.title,
    topic: row.topic || '',
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
  const meta = MODULE_META[row.module_type] || { label: row.module_type, group: '', page: '' };
  return {
    id: row.id,
    taskType: 'module',
    moduleType: row.module_type,
    moduleLabel: meta.label,
    moduleGroup: meta.group,
    status: completed ? 'completed' : overdue ? 'overdue' : 'pending',
    submittedAt: row.completed_at ? Number(row.completed_at) : null,
    completedAt: row.completed_at ? Number(row.completed_at) : null,
    assignment: {
      id: row.id,
      title: row.title,
      classId: row.class_id,
      className: row.class_name || '',
      teacherName: row.teacher_name || '',
      moduleType: row.module_type,
      moduleLabel: meta.label,
      moduleGroup: meta.group,
      entryPage: meta.page,
      topic: row.topic || '',
      dueAt,
      allowLate,
    },
  };
}

export async function createModuleAssignment({ teacher, moduleType, payload }) {
  assertAssignableModule(moduleType);
  const cls = await getClassForTeacher(payload.classId, teacher.id, 'id, class_name');
  if (!cls) throw new NotFoundError('班级不存在或无权限发布任务');
  const studentIds = await listClassMemberIds(cls.id);
  if (!studentIds.length) throw new ValidationError('当前班级暂无学生，无法发布任务');

  const id = nanoid();
  const now = Date.now();
  await db.prepare(`
    INSERT INTO module_assignments
      (id, module_type, teacher_id, class_id, title, topic, due_at, allow_late, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
  `).run(id, moduleType, teacher.id, cls.id, payload.title, payload.topic || '',
    toTimestamp(payload.dueAt), payload.allowLate ? 1 : 0, now, now);

  return listModuleAssignmentsForTeacher({ teacherId: teacher.id, classId: cls.id })
    .then((rows) => rows.find((r) => r.id === id) || rows[0]);
}

export async function listModuleAssignmentsForTeacher({ teacherId, moduleType = '', classId = '' }) {
  if (moduleType) assertValidModule(moduleType);
  const params = [teacherId];
  const filters = [];
  if (moduleType) { filters.push('ma.module_type = ?'); params.push(moduleType); }
  if (classId) {
    const cls = await getClassForTeacher(classId, teacherId, 'id');
    if (!cls) throw new NotFoundError('班级不存在或无权限查看');
    filters.push('ma.class_id = ?');
    params.push(classId);
  }
  const where = filters.length ? `AND ${filters.join(' AND ')}` : '';
  const rows = await db.prepare(`
    SELECT ma.*, c.class_name,
      COUNT(DISTINCT cs.student_id) AS assigned_count,
      COUNT(DISTINCT mas.student_id) AS completed_count
    FROM module_assignments ma
    JOIN classes c ON c.id = ma.class_id
    LEFT JOIN class_students cs ON cs.class_id = ma.class_id
    LEFT JOIN module_assignment_submissions mas ON mas.assignment_id = ma.id
    WHERE ma.teacher_id = ? ${where}
    GROUP BY ma.id ORDER BY ma.created_at DESC LIMIT 200
  `).all(...params);
  return rows.map(toClient);
}

export async function listModuleTasksForStudent({ student }) {
  if (!student?.id) return [];
  const userRow = await db.prepare('SELECT class_id FROM users WHERE id = ? LIMIT 1').get(student.id);
  const classId = userRow?.class_id || null;
  if (!classId) return [];
  const rows = await db.prepare(`
    SELECT ma.*, c.class_name, u.real_name AS teacher_name,
      mas.id AS submission_id, mas.completed_at
    FROM module_assignments ma
    JOIN classes c ON c.id = ma.class_id
    LEFT JOIN users u ON u.id = ma.teacher_id
    LEFT JOIN module_assignment_submissions mas
      ON mas.assignment_id = ma.id AND mas.student_id = ?
    WHERE ma.class_id = ? AND ma.status = 'published'
    ORDER BY CASE WHEN mas.id IS NULL THEN 0 ELSE 1 END,
      COALESCE(ma.due_at, ma.created_at) ASC, ma.created_at DESC
  `).all(student.id, classId);
  return rows.map((row) => toClientStudentTask(row));
}

export async function submitModuleAssignment({ student, assignmentId }) {
  const assignment = await db.prepare(`
    SELECT ma.*, cs.student_id AS member_id
    FROM module_assignments ma
    LEFT JOIN class_students cs ON cs.class_id = ma.class_id AND cs.student_id = ?
    WHERE ma.id = ? LIMIT 1
  `).get(student.id, assignmentId);

  if (!assignment) throw new NotFoundError('专项任务不存在');
  if (assignment.member_id !== student.id) throw new ValidationError('无权限提交该专项任务');
  if (assignment.status !== 'published') throw new ValidationError('该专项任务当前不可提交');

  const now = Date.now();
  const dueAt = assignment.due_at ? Number(assignment.due_at) : null;
  if (dueAt && dueAt < now && !assignment.allow_late) {
    throw new ValidationError('该专项任务已截止，不能补交');
  }

  const id = nanoid();
  await db.prepare(`
    INSERT INTO module_assignment_submissions
      (id, assignment_id, student_id, status, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, 'completed', ?, ?, ?)
    ON DUPLICATE KEY UPDATE status='completed', completed_at=VALUES(completed_at), updated_at=VALUES(updated_at)
  `).run(id, assignmentId, student.id, now, now, now);

  return { id: assignmentId, status: 'completed', completedAt: now };
}

export async function completeOpenModuleAssignmentsForStudent({ studentId, moduleTypes = [], source = null }) {
  if (!studentId || !moduleTypes.length) return [];
  moduleTypes.forEach(assertAssignableModule);

  const now = Date.now();
  const placeholders = moduleTypes.map(() => '?').join(', ');
  const assignments = await db.prepare(`
    SELECT ma.id
    FROM module_assignments ma
    JOIN class_students cs ON cs.class_id = ma.class_id AND cs.student_id = ?
    LEFT JOIN module_assignment_submissions mas
      ON mas.assignment_id = ma.id AND mas.student_id = cs.student_id
    WHERE ma.status = 'published'
      AND ma.module_type IN (${placeholders})
      AND mas.id IS NULL
      AND (ma.due_at IS NULL OR ma.allow_late = 1 OR ma.due_at >= ?)
    ORDER BY COALESCE(ma.due_at, ma.created_at) ASC, ma.created_at DESC
    LIMIT 1
  `).all(studentId, ...moduleTypes, now);

  const completed = [];
  for (const assignment of assignments || []) {
    const id = nanoid();
    await db.prepare(`
      INSERT INTO module_assignment_submissions
        (id, assignment_id, student_id, status, result_json, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, 'completed', ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status='completed', result_json=VALUES(result_json), completed_at=VALUES(completed_at), updated_at=VALUES(updated_at)
    `).run(id, assignment.id, studentId, source ? JSON.stringify(source) : null, now, now, now);
    completed.push({ id: assignment.id, status: 'completed', completedAt: now });
  }

  return completed;
}
