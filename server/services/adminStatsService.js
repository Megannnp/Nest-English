import { recordAdminOperation } from './adminControlService.js';
import {
  buildAdminUserListFilters,
  buildNonTestClassWhere,
  buildNonTestUserWhere,
  createRecentDaysWindow,
  mapTestDataFlag,
  mapUserRow,
  shouldIncludeTestData,
} from './adminStatsDomain.js';
import {
  getAdminDashboardBaseRows,
  getAdminUserDetailBaseRow,
  getAdminUserDetailExtraRows,
  getAdminUserListRows,
  getAdminUserStatusRow,
  updateAdminUserDisabledRow,
} from './adminStatsRepository.js';
import { getAIRequestMetrics } from './aiProvider/metrics.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/appError.js';

const AI_LABELS = {
  grading: '作文批改',
  detailed_feedback: '精批补充',
  question_analysis: '题目分析',
  complete: '通用生成',
  complete_stream: '流式生成',
  ocr: '图片识别',
  tags: '标签分析',
  general: '通用调用',
};

function buildDashboardScopes(includeTestData) {
  return {
    userScope: includeTestData ? '1 = 1' : buildNonTestUserWhere('u'),
    classScope: includeTestData ? '1 = 1' : buildNonTestClassWhere('c'),
    writingScope: includeTestData ? '1 = 1' : 'COALESCE(w.is_test_data, 0) = 0',
  };
}

function applySubmissionRowsToDays(submissionRows, days, dayIndex) {
  submissionRows.forEach((row) => {
    const index = dayIndex.get(row.day);
    if (index != null) days[index].count = Number(row.total || 0);
  });
}

function buildAiUsageRows(taskAiRows, eventAiRows) {
  const runtimeMetrics = getAIRequestMetrics();
  const runtimeRows = Object.entries(runtimeMetrics).map(([scope, metric]) => ({
    scope,
    total: Number(metric.total || 0),
  }));
  const aiUsageMap = new Map();
  [...taskAiRows, ...eventAiRows, ...runtimeRows].forEach((row) => {
    const scope = row.scope || 'general';
    aiUsageMap.set(scope, (aiUsageMap.get(scope) || 0) + Number(row.total || 0));
  });
  return Array.from(aiUsageMap.entries())
    .map(([scope, total]) => ({ scope, label: AI_LABELS[scope] || scope, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function buildDashboardOverview({ userSummary, writingSummary, classSummary, aiUsage, includeTestData }) {
  return {
    users: Number(userSummary?.total || 0),
    teachers: Number(userSummary?.teachers || 0),
    students: Number(userSummary?.students || 0),
    disabledUsers: Number(userSummary?.disabled || 0),
    writings: Number(writingSummary?.total || 0),
    classes: Number(classSummary?.total || 0),
    aiCalls: aiUsage.reduce((sum, item) => sum + item.total, 0),
    includeTestData,
  };
}

function buildTeacherRankings(teacherRows) {
  return teacherRows.map((row) => ({
    id: row.id,
    name: row.real_name || row.email || '未命名教师',
    classCount: Number(row.class_count || 0),
    writingCount: Number(row.writing_count || 0),
    lastActiveAt: row.last_active_at || null,
  }));
}

function buildClassRankings(classRows) {
  return classRows.map((row) => ({
    id: row.id,
    name: row.class_name || '未命名班级',
    teacherName: row.teacher_name || '',
    studentCount: Number(row.student_count || 0),
    writingCount: Number(row.writing_count || 0),
    lastActiveAt: row.last_active_at || null,
  }));
}

export async function getAdminDashboard(query = {}) {
  const includeTestData = shouldIncludeTestData(query.includeTestData);
  const { userScope, classScope, writingScope } = buildDashboardScopes(includeTestData);
  const { start, days, dayIndex } = createRecentDaysWindow(7, Date.now());

  const {
    userSummary,
    writingSummary,
    classSummary,
    taskAiRows,
    eventAiRows,
    submissionRows,
    teacherRows,
    classRows,
  } = await getAdminDashboardBaseRows({
    userScope,
    classScope,
    writingScope,
    includeTestData,
    start,
  });

  applySubmissionRowsToDays(submissionRows, days, dayIndex);
  const aiUsage = buildAiUsageRows(taskAiRows, eventAiRows);

  return {
    overview: buildDashboardOverview({
      userSummary,
      writingSummary,
      classSummary,
      aiUsage,
      includeTestData,
    }),
    submissions7d: days,
    aiUsage,
    rankings: {
      teachers: buildTeacherRankings(teacherRows),
      classes: buildClassRankings(classRows),
    },
  };
}

export async function listAdminUsers(query = {}) {
  const { page, pageSize, params, whereSql, offset } = buildAdminUserListFilters(query);
  const { totalRow, rows } = await getAdminUserListRows({
    whereSql,
    params,
    pageSize,
    offset,
  });

  return {
    list: rows.map(mapUserRow),
    page,
    pageSize,
    total: Number(totalRow?.total || 0),
    totalPages: Math.max(1, Math.ceil(Number(totalRow?.total || 0) / pageSize)),
  };
}

export async function getAdminUserDetail(userId) {
  const row = await getAdminUserDetailBaseRow(userId);
  if (!row) throw new NotFoundError('用户不存在');

  const { teacherStats, aiRows, recentWritings } = await getAdminUserDetailExtraRows(userId);

  return {
    ...mapUserRow(row),
    teacherStudentCount: Number(teacherStats?.student_count || 0),
    aiUsage: aiRows.map((item) => ({
      scope: item.scope,
      label: AI_LABELS[item.scope] || item.scope,
      total: Number(item.total || 0),
      lastUsedAt: item.last_used_at || null,
    })),
    recentWritings: recentWritings.map((item) => ({
      id: item.id,
      title: item.writing_title || '未命名作文',
      type: item.selected_type || '',
      createdAt: item.created_at || 0,
    })),
  };
}

export async function updateAdminUserDisabled({ userId, disabled, adminId }) {
  if (!userId) throw new ValidationError('缺少用户 ID');
  if (userId === adminId && disabled) throw new ForbiddenError('不能禁用当前登录的管理员账号');
  const row = await getAdminUserStatusRow(userId);
  if (!row) throw new NotFoundError('用户不存在');
  if (row.is_admin === 1 && disabled) throw new ForbiddenError('不能在这里禁用管理员账号');

  await updateAdminUserDisabledRow({
    userId,
    disabled,
    adminId,
    timestamp: Date.now(),
  });

  await recordAdminOperation({
    adminId,
    action: disabled ? 'user_disabled' : 'user_enabled',
    targetType: 'user',
    targetId: userId,
    detail: { previousDisabled: row.is_disabled === 1, nextDisabled: disabled },
  });

  return getAdminUserDetail(userId);
}

export {
  buildNonTestClassWhere,
  buildNonTestUserWhere,
  mapTestDataFlag,
  shouldIncludeTestData,
};
