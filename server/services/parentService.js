import crypto from 'crypto';

import { listAssignmentTasksForStudent } from './assignmentService.js';
import { listGrammarTasksForStudent } from './grammar/assignmentService.js';
import { getPracticeStats as getGrammarPracticeStats } from './grammar/practiceRecordService.js';
import { getRecentLearningEvents } from './learningEventService.js';
import { getListeningProgressStats } from './listeningProgressService.js';
import { listModuleTasksForStudent } from './moduleAssignmentService.js';
import { getPhoneticsProgressStats } from './phoneticsProgressService.js';
import { getPointsSummary, toDateKey } from './pointsService.js';
import { getReadingAnalysisStats } from './reading/analysisRecordService.js';
import { getReadingPracticeStats } from './reading/practiceService.js';
import { getVocabularyProgressStats } from './vocabularyProgressService.js';
import db from '../db/database.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/appError.js';

const BIND_CODE_TTL_MS = 24 * 60 * 60 * 1000;
const BIND_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function requireParent(user) {
  if (user?.role !== 'parent') {
    throw new ForbiddenError('无权限，需要家长身份');
  }
}

function requireStudent(user) {
  if (user?.role !== 'student') {
    throw new ForbiddenError('无权限，需要学生身份');
  }
}

async function assertParentChildAccess({ parentId, childId, user }) {
  requireParent(user);
  const child = await db.prepare(`
    SELECT u.id, u.account_code, u.real_name, u.nick_name, u.email, u.phone, u.student_no, u.class_name
    FROM parent_student_links l
    JOIN users u ON u.id = l.student_user_id
    WHERE l.parent_user_id = ? AND l.student_user_id = ? AND l.status = 'active' AND u.role = 'student'
    LIMIT 1
  `).get(parentId, childId);

  if (!child) throw new NotFoundError('未找到已绑定的学生');
  return child;
}

function normalizeBindCode(value) {
  return String(value || '').trim().toUpperCase();
}

function createBindCode() {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += BIND_CODE_ALPHABET[crypto.randomInt(0, BIND_CODE_ALPHABET.length)];
  }
  return code;
}

async function createUniqueBindCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = createBindCode();
    const existed = await db.prepare('SELECT id FROM parent_binding_codes WHERE code = ? LIMIT 1').get(code);
    if (!existed) return code;
  }
  throw new Error('生成绑定码失败，请重试');
}

async function loadWritingSummary(studentId) {
  const row = await db.prepare(`
    SELECT
      COUNT(*) AS total_writings,
      AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.totalScore')) AS DECIMAL(10, 2))) AS average_score
    FROM writings
    WHERE user_id = ?
  `).get(studentId);
  return {
    totalWritings: Number(row?.total_writings || 0),
    averageScore: row?.average_score == null ? 0 : Math.round(Number(row.average_score) * 10) / 10,
  };
}

async function loadRecentWritings(studentId) {
  const rows = await db.prepare(`
    SELECT
      id,
      writing_title,
      prompt_text,
      created_at,
      JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.totalScore')) AS total_score
    FROM writings
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `).all(studentId);

  return rows.map((row) => ({
    id: row.id,
    writingTitle: row.writing_title || '',
    promptText: row.prompt_text || '',
    createdAt: row.created_at,
    feedback: row.total_score == null ? null : { totalScore: Number(row.total_score) },
  }));
}

function normalizeParentTask(task, taskType) {
  return { ...task, taskType: task.taskType || taskType };
}

function getTaskStatusRank(status) {
  const ranks = {
    pending: 0,
    overdue: 1,
    submitted: 2,
    grading: 3,
    returned: 4,
    completed: 5,
  };
  return ranks[status] ?? 9;
}

function isPendingParentTask(task) {
  return ['pending', 'overdue', 'submitted', 'grading'].includes(task?.status);
}

function getAffectedRows(result) {
  return Number(result?.changes ?? result?.affectedRows ?? result?.rowCount ?? 0);
}

async function loadAllStudentTasks(studentId) {
  const student = { id: studentId, role: 'student' };
  const results = await Promise.allSettled([
    listAssignmentTasksForStudent(studentId),
    listGrammarTasksForStudent({ student }),
    listModuleTasksForStudent({ student }),
  ]);
  const [writingTasks, grammarTasks, moduleTasks] = results.map((result) => (
    result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []
  ));
  return [
    ...writingTasks.map((task) => normalizeParentTask(task, 'writing')),
    ...grammarTasks.map((task) => normalizeParentTask(task, 'grammar')),
    ...moduleTasks.map((task) => normalizeParentTask(task, 'module')),
  ].sort((a, b) => getTaskStatusRank(a.status) - getTaskStatusRank(b.status));
}

async function buildChildOverview(child) {
  const [writingSummary, recentWritings, tasks] = await Promise.all([
    loadWritingSummary(child.id),
    loadRecentWritings(child.id),
    loadAllStudentTasks(child.id),
  ]);

  return {
    id: child.id,
    accountCode: child.account_code,
    name: child.real_name || child.nick_name || child.email || child.phone || '未命名学生',
    studentNo: child.student_no || '',
    className: child.class_name || '',
    summary: {
      ...writingSummary,
      pendingTasks: tasks.filter(isPendingParentTask).length,
      returnedTasks: tasks.filter((task) => ['returned', 'completed'].includes(task.status)).length,
    },
    recentWritings,
    tasks: tasks.slice(0, 5),
  };
}

export async function getParentOverview({ parentId, user }) {
  requireParent(user);
  const children = await db.prepare(`
    SELECT u.id, u.account_code, u.real_name, u.nick_name, u.email, u.phone, u.student_no, u.class_name
    FROM parent_student_links l
    JOIN users u ON u.id = l.student_user_id
    WHERE l.parent_user_id = ? AND l.status = 'active' AND u.role = 'student'
    ORDER BY l.created_at ASC
  `).all(parentId);

  const childOverviews = await Promise.all(children.map(buildChildOverview));
  return {
    children: childOverviews,
    summary: {
      childCount: childOverviews.length,
      totalWritings: childOverviews.reduce((sum, child) => sum + child.summary.totalWritings, 0),
      pendingTasks: childOverviews.reduce((sum, child) => sum + child.summary.pendingTasks, 0),
    },
  };
}

export async function bindParentStudent({ parentId, user, studentBindCode }) {
  requireParent(user);
  const bindCode = normalizeBindCode(studentBindCode);
  if (!bindCode) throw new ValidationError('请输入学生绑定码');

  const codeRow = await db.prepare(`
    SELECT c.id AS code_id, c.student_user_id, u.role
    FROM parent_binding_codes c
    JOIN users u ON u.id = c.student_user_id
    WHERE c.code = ? AND c.used_at IS NULL AND c.expires_at > ?
    LIMIT 1
  `).get(bindCode, Date.now());

  if (!codeRow || codeRow.role !== 'student') {
    throw new NotFoundError('绑定码无效或已过期');
  }
  if (codeRow.student_user_id === parentId) {
    throw new ValidationError('不能绑定自己的账号');
  }

  const now = Date.now();
  const consumeResult = await db.prepare(`
    UPDATE parent_binding_codes
    SET used_at = ?, updated_at = ?
    WHERE id = ? AND used_at IS NULL
  `).run(now, now, codeRow.code_id);
  if (getAffectedRows(consumeResult) === 0) {
    throw new NotFoundError('绑定码无效或已过期');
  }

  await db.prepare(`
    INSERT INTO parent_student_links (id, parent_user_id, student_user_id, status, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?)
    ON DUPLICATE KEY UPDATE status = 'active', updated_at = VALUES(updated_at)
  `).run(crypto.randomUUID(), parentId, codeRow.student_user_id, now, now);

  return getParentOverview({ parentId, user });
}

export async function getStudentParentBindCode({ studentId, user, regenerate = false }) {
  requireStudent(user);
  if (studentId !== user.id) throw new ForbiddenError('无权限查看该绑定码');

  const now = Date.now();
  if (!regenerate) {
    const existing = await db.prepare(`
      SELECT code, expires_at
      FROM parent_binding_codes
      WHERE student_user_id = ? AND used_at IS NULL AND expires_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(studentId, now);
    if (existing) {
      return { code: existing.code, expiresAt: existing.expires_at };
    }
  }

  const code = await createUniqueBindCode();
  const expiresAt = now + BIND_CODE_TTL_MS;
  if (regenerate) {
    await db.prepare(`
      UPDATE parent_binding_codes
      SET used_at = ?, updated_at = ?
      WHERE student_user_id = ? AND used_at IS NULL
    `).run(now, now, studentId);
  }
  await db.prepare(`
    INSERT INTO parent_binding_codes (id, student_user_id, code, expires_at, used_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, ?, ?)
  `).run(crypto.randomUUID(), studentId, code, expiresAt, now, now);

  return { code, expiresAt };
}

export async function getParentChildTasks({ parentId, childId, user }) {
  const child = await assertParentChildAccess({ parentId, childId, user });
  const tasks = await loadAllStudentTasks(child.id);

  return {
    child: {
      id: child.id,
      name: child.real_name || child.nick_name || child.email || child.phone || '未命名学生',
      className: child.class_name || '',
      studentNo: child.student_no || '',
    },
    tasks,
  };
}

function getWeeklyTaskSummary(tasks) {
  return {
    pending: tasks.filter((task) => task.status === 'pending').length,
    overdue: tasks.filter((task) => task.status === 'overdue').length,
    inProgress: tasks.filter((task) => ['submitted', 'grading'].includes(task.status)).length,
    completed: tasks.filter((task) => ['returned', 'completed'].includes(task.status)).length,
  };
}

function buildWeeklySuggestions({ activeDays, totalEvents, taskSummary, byModule }) {
  const suggestions = [];
  if (taskSummary.overdue > 0) {
    suggestions.push(`优先处理 ${taskSummary.overdue} 个逾期任务，避免学习节奏继续后移。`);
  }
  if (taskSummary.pending > 0) {
    suggestions.push(`本周还有 ${taskSummary.pending} 个待完成任务，建议先完成老师布置内容。`);
  }
  if (totalEvents === 0) {
    suggestions.push('近 7 天暂无学习记录，可以先安排一次短练习恢复节奏。');
  } else if (activeDays < 3) {
    suggestions.push('本周学习集中度偏低，建议分散到至少 3 天完成练习。');
  }
  if (!byModule.writing) {
    suggestions.push('本周还没有写作记录，可补一次短文训练保持输出。');
  }
  return suggestions.slice(0, 3);
}

function getWeeklyEntitlementSummary(pointsSummary = {}) {
  const quotaUsages = Array.isArray(pointsSummary.quotaUsages) ? pointsSummary.quotaUsages : [];
  const entitlements = Array.isArray(pointsSummary.entitlements) ? pointsSummary.entitlements : [];
  return {
    balance: Number(pointsSummary.balance || 0),
    pendingPoints: Number(pointsSummary.pendingPoints || 0),
    totalSpent: Number(pointsSummary.totalSpent || 0),
    entitlementCount: entitlements.length,
    usedQuotaCount: quotaUsages.reduce((sum, item) => sum + Number(item.used || 0), 0),
  };
}

function buildWeeklySummary(events, tasks = [], pointsSummary = {}) {
  const since = Date.now() - WEEK_MS;
  const recent = events.filter((event) => Number(event.createdAt || 0) >= since);
  const byModule = recent.reduce((acc, event) => {
    const key = event.module || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const activeDays = new Set(recent.map((event) => toDateKey(event.createdAt))).size;
  const moduleBreakdown = Object.entries(byModule)
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count);
  const taskSummary = getWeeklyTaskSummary(tasks);
  const topModule = moduleBreakdown[0] || null;
  return {
    totalEvents: recent.length,
    activeDays,
    byModule,
    moduleBreakdown,
    topModule,
    taskSummary,
    suggestions: buildWeeklySuggestions({
      activeDays,
      totalEvents: recent.length,
      taskSummary,
      byModule,
    }),
    entitlementSummary: getWeeklyEntitlementSummary(pointsSummary),
    recent: recent.slice(0, 10),
  };
}

export async function getParentChildProgress({ parentId, childId, user }) {
  const child = await assertParentChildAccess({ parentId, childId, user });
  const [
    writing,
    grammar,
    readingPractice,
    readingAnalyses,
    vocabulary,
    listening,
    phonetics,
    learningEvents,
    tasks,
    pointsSummary,
  ] = await Promise.all([
    loadWritingSummary(child.id),
    getGrammarPracticeStats(child.id),
    getReadingPracticeStats(child.id),
    getReadingAnalysisStats(child.id),
    getVocabularyProgressStats(child.id),
    getListeningProgressStats(child.id),
    getPhoneticsProgressStats(child.id),
    getRecentLearningEvents({ userId: child.id, limit: 100 }),
    loadAllStudentTasks(child.id),
    getPointsSummary(child.id),
  ]);

  return {
    child: {
      id: child.id,
      name: child.real_name || child.nick_name || child.email || child.phone || '未命名学生',
      className: child.class_name || '',
      studentNo: child.student_no || '',
    },
    modules: {
      writing,
      grammar,
      reading: { ...readingPractice, analyses: readingAnalyses },
      vocabulary,
      listening,
      phonetics,
    },
    weekly: buildWeeklySummary(learningEvents, tasks, pointsSummary),
  };
}

export async function getParentChildEntitlements({ parentId, childId, user }) {
  const child = await assertParentChildAccess({ parentId, childId, user });
  const summary = await getPointsSummary(child.id);
  return {
    child: {
      id: child.id,
      name: child.real_name || child.nick_name || child.email || child.phone || '未命名学生',
      className: child.class_name || '',
      studentNo: child.student_no || '',
    },
    balance: Number(summary.balance || 0),
    pendingPoints: Number(summary.pendingPoints || 0),
    totalEarned: Number(summary.totalEarned || 0),
    totalSpent: Number(summary.totalSpent || 0),
    membership: summary.membership || null,
    quotaUsages: Array.isArray(summary.quotaUsages) ? summary.quotaUsages : [],
    entitlements: Array.isArray(summary.entitlements) ? summary.entitlements : [],
  };
}
