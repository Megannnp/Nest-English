const DAY_MS = 24 * 60 * 60 * 1000;

const ROLE_LABELS = {
  teacher: '教师',
  student: '学生',
  parent: '家长',
};

export function toInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function startOfLocalDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatDay(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeStatusFilter(status) {
  return status === 'disabled' || status === 'active' ? status : '';
}

export function normalizeRoleFilter(role) {
  return role === 'teacher' || role === 'student' || role === 'parent' ? role : '';
}

export function shouldIncludeTestData(value) {
  return value === true || value === '1' || value === 'true';
}

export function buildNonTestUserWhere(alias = 'u') {
  return `COALESCE(${alias}.is_test_data, 0) = 0`;
}

export function buildNonTestClassWhere(alias = 'c') {
  return `COALESCE(${alias}.is_test_data, 0) = 0`;
}

export function mapTestDataFlag(row) {
  return row?.is_test_data === 1 || row?.is_test_data === true || row?.is_test_data === '1';
}

function resolveUserRole(row) {
  return row.role || 'student';
}

function resolveUserRoleLabel(role) {
  return ROLE_LABELS[role] || role || '用户';
}

function resolveUserRealName(row) {
  return row.real_name || row.nick_name || '';
}

function resolveUserCounts(row) {
  return {
    writingCount: Number(row.writing_count || 0),
    classCount: Number(row.class_count || 0),
  };
}

function resolveUserFlags(row) {
  return {
    isAdmin: row.is_admin === 1,
    isDisabled: row.is_disabled === 1,
    isTestData: mapTestDataFlag(row),
  };
}

export function mapUserRow(row) {
  const role = resolveUserRole(row);
  const counts = resolveUserCounts(row);
  const flags = resolveUserFlags(row);
  return {
    id: row.id,
    accountCode: row.account_code || '',
    email: row.email || '',
    phone: row.phone || '',
    role,
    roleLabel: flags.isAdmin ? '管理员' : resolveUserRoleLabel(role),
    realName: resolveUserRealName(row),
    studentNo: row.student_no || '',
    classId: row.class_id || null,
    className: row.class_name || '',
    createdAt: row.created_at || 0,
    isAdmin: flags.isAdmin,
    isDisabled: flags.isDisabled,
    disabledAt: row.disabled_at || null,
    writingCount: counts.writingCount,
    classCount: counts.classCount,
    lastWritingAt: row.last_writing_at || null,
    isTestData: flags.isTestData,
  };
}

export function createRecentDaysWindow(dayCount = 7, now = Date.now()) {
  const start = startOfLocalDay(now - (dayCount - 1) * DAY_MS);
  const days = Array.from({ length: dayCount }, (_, index) => {
    const timestamp = start + index * DAY_MS;
    return { date: formatDay(timestamp), label: formatDay(timestamp).slice(5), count: 0 };
  });
  return {
    start,
    days,
    dayIndex: new Map(days.map((item, index) => [item.date, index])),
  };
}

export function buildAdminUserListFilters(query = {}) {
  const page = toInteger(query.page, 1, 1, 9999);
  const pageSize = toInteger(query.pageSize, 12, 5, 50);
  const role = normalizeRoleFilter(query.role);
  const status = normalizeStatusFilter(query.status);
  const includeTestData = shouldIncludeTestData(query.includeTestData);
  const keyword = String(query.keyword || '').trim();
  const where = [];
  const params = [];

  if (!includeTestData) {
    where.push(buildNonTestUserWhere('u'));
  }
  if (role) {
    where.push('u.role = ?');
    params.push(role);
  }
  if (status === 'disabled') where.push('u.is_disabled = 1');
  if (status === 'active') where.push('u.is_disabled = 0');
  if (keyword) {
    const like = `%${keyword}%`;
    where.push(`(
      u.real_name LIKE ?
      OR u.nick_name LIKE ?
      OR u.email LIKE ?
      OR u.phone LIKE ?
      OR u.account_code LIKE ?
      OR u.student_no LIKE ?
      OR u.class_name LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like);
  }

  return {
    page,
    pageSize,
    role,
    status,
    includeTestData,
    keyword,
    where,
    params,
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    offset: (page - 1) * pageSize,
  };
}

export const __test__ = {
  buildAdminUserListFilters,
  createRecentDaysWindow,
  formatDay,
  mapUserRow,
  normalizeRoleFilter,
  normalizeStatusFilter,
  startOfLocalDay,
  toInteger,
};
