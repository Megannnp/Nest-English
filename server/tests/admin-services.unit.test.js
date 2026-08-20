import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import { requireAdmin } from '../middleware/authMiddleware.js';
import {
  countOperationLogsByAction,
  listOperationLogRows,
  saveIntegrationAccountRow,
  upsertSystemSettingRow,
} from '../services/adminControlRepository.js';
import { __test__ as budgetTestHelpers } from '../services/adminControlService.js';
import { __test__ as adminStatsDomainTest } from '../services/adminStatsDomain.js';
import {
  getAdminDashboardBaseRows,
  getAdminUserDetailBaseRow,
  getAdminUserDetailExtraRows,
  getAdminUserListRows,
} from '../services/adminStatsRepository.js';
import {
  buildNonTestClassWhere,
  buildNonTestUserWhere,
  mapTestDataFlag,
  shouldIncludeTestData,
} from '../services/adminStatsService.js';

test('admin data scope defaults to hiding test data', () => {
  assert.equal(shouldIncludeTestData(undefined), false);
  assert.equal(shouldIncludeTestData('0'), false);
  assert.equal(shouldIncludeTestData('false'), false);
  assert.equal(shouldIncludeTestData('1'), true);
  assert.equal(shouldIncludeTestData('true'), true);
  assert.equal(shouldIncludeTestData(true), true);
});

test('admin data scope uses normalized is_test_data flags instead of name guessing', () => {
  assert.equal(buildNonTestUserWhere('u'), 'COALESCE(u.is_test_data, 0) = 0');
  assert.equal(buildNonTestClassWhere('c'), 'COALESCE(c.is_test_data, 0) = 0');
});

test('admin user mapper exposes test data flag from database column', () => {
  assert.equal(mapTestDataFlag({ is_test_data: 1 }), true);
  assert.equal(mapTestDataFlag({ is_test_data: '1' }), true);
  assert.equal(mapTestDataFlag({ is_test_data: 0 }), false);
  assert.equal(mapTestDataFlag({ email: 'student-flow-demo@example.com' }), false);
});

test('requireAdmin allows only users with database-backed admin flag', async () => {
  const originalPrepare = db.prepare;
  db.prepare = (sql) => ({
    get: (id) => {
      assert.match(sql, /SELECT is_admin FROM users/);
      assert.equal(id, 'admin-1');
      return { is_admin: 1 };
    },
  });

  let nextCalled = false;
  try {
    await requireAdmin(
      { user: { id: 'admin-1', is_admin: 1 } },
      {},
      () => { nextCalled = true; }
    );
    assert.equal(nextCalled, true);
  } finally {
    db.prepare = originalPrepare;
  }

  let statusCode = 0;
  let payload = null;
  await requireAdmin(
    { user: { id: 'teacher-1', role: 'teacher' } },
    {
      status(code) {
        statusCode = code;
        return {
          json(body) {
            payload = body;
          },
        };
      },
    },
    () => {
      throw new Error('non-admin should not pass');
    }
  );
  assert.equal(statusCode, 403);
  assert.equal(payload.errorCode, undefined);
  assert.match(payload.msg, /管理员权限/);
});

test('budget usage helper computes warning and exceeded states with percentages', () => {
  const usage = budgetTestHelpers.buildPolicyUsage({
    daily_limit: 10,
    monthly_limit: 100,
    total_limit: null,
  }, {
    todayUsed: 8,
    monthUsed: 100,
    totalUsed: 120,
  }, 80);

  assert.equal(usage.dailyUsagePercent, 80);
  assert.equal(usage.monthlyUsagePercent, 100);
  assert.equal(usage.totalUsagePercent, null);
  assert.equal(usage.dailyRemaining, 2);
  assert.equal(usage.monthlyRemaining, 0);
  assert.equal(usage.status, 'exceeded');
});

test('budget display helpers expose stable labels', () => {
  assert.equal(budgetTestHelpers.getFeatureLabel('recognize_text'), '图片识别');
  assert.equal(budgetTestHelpers.getFeatureLabel('tags'), '标签分析');
  assert.equal(budgetTestHelpers.getScopeLabel('global', ''), '全站');
  assert.equal(budgetTestHelpers.getScopeLabel('role', 'teacher'), '角色 teacher');
});

test('admin stats domain normalizes pagination and keyword filters', () => {
  const result = adminStatsDomainTest.buildAdminUserListFilters({
    page: '0',
    pageSize: '99',
    role: 'teacher',
    status: 'disabled',
    keyword: 'alice',
    includeTestData: 'true',
  });

  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 50);
  assert.equal(result.offset, 0);
  assert.equal(result.includeTestData, true);
  assert.match(result.whereSql, /u\.role = \?/);
  assert.match(result.whereSql, /u\.is_disabled = 1/);
  assert.equal(result.params.length, 8);
  assert.equal(result.params[0], 'teacher');
  assert.equal(result.params[1], '%alice%');
});

test('admin stats domain creates stable recent day windows and user labels', () => {
  const window = adminStatsDomainTest.createRecentDaysWindow(3, Date.parse('2026-04-20T12:00:00Z'));
  assert.equal(window.start, Date.parse('2026-04-17T16:00:00.000Z'));
  assert.deepEqual(window.days.map((item) => item.date), [
    '2026-04-18',
    '2026-04-19',
    '2026-04-20',
  ]);

  const mapped = adminStatsDomainTest.mapUserRow({
    id: 'teacher-1',
    role: 'teacher',
    real_name: 'Alice',
    is_admin: 1,
    is_disabled: 0,
    writing_count: '3',
    class_count: '2',
    is_test_data: '1',
  });
  assert.equal(mapped.roleLabel, '管理员');
  assert.equal(mapped.writingCount, 3);
  assert.equal(mapped.classCount, 2);
  assert.equal(mapped.isTestData, true);
});

test('admin control repository countOperationLogsByAction omits params without filter', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    get: (...args) => {
      calls.push({ sql, args });
      return { total: 12 };
    },
  });

  try {
    const result = await countOperationLogsByAction('');
    assert.equal(result.total, 12);
    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0].sql, /WHERE l\.action = \?/);
    assert.deepEqual(calls[0].args, []);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('admin control repository log row query keeps action param ahead of pagination', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    all: (...args) => {
      calls.push({ sql, args });
      return [];
    },
  });

  try {
    await listOperationLogRows({ action: 'system_setting_updated', pageSize: 20, offset: 40 });
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /WHERE l\.action = \?/);
    assert.deepEqual(calls[0].args, ['system_setting_updated', 20, 40]);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('admin control repository inserts integration rows when no existing account is present', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    run: (...args) => {
      calls.push({ sql, args });
      return { changes: 1 };
    },
  });

  try {
    await saveIntegrationAccountRow({
      existing: null,
      id: 'integration-1',
      provider: 'openai',
      displayName: 'Primary OpenAI',
      accountIdentifier: 'acct-1',
      secretRef: 'OPENAI_API_KEY',
      notes: 'main',
      status: 'active',
      timestamp: 123,
    });
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /INSERT INTO integration_accounts/);
    assert.deepEqual(calls[0].args, [
      'integration-1',
      'openai',
      'Primary OpenAI',
      'acct-1',
      'OPENAI_API_KEY',
      'main',
      'active',
      123,
      123,
    ]);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('admin control repository updates integration rows when account already exists', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    run: (...args) => {
      calls.push({ sql, args });
      return { changes: 1 };
    },
  });

  try {
    await saveIntegrationAccountRow({
      existing: { id: 'integration-1' },
      id: 'integration-1',
      provider: 'openai',
      displayName: 'Primary OpenAI',
      accountIdentifier: 'acct-1',
      secretRef: 'OPENAI_API_KEY',
      notes: 'updated',
      status: 'paused',
      timestamp: 456,
    });
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /UPDATE integration_accounts/);
    assert.deepEqual(calls[0].args, [
      'openai',
      'Primary OpenAI',
      'acct-1',
      'OPENAI_API_KEY',
      'updated',
      'paused',
      456,
      'integration-1',
    ]);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('admin control repository upserts system settings with description and updater', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    run: (...args) => {
      calls.push({ sql, args });
      return { changes: 1 };
    },
  });

  try {
    await upsertSystemSettingRow({
      key: 'site_maintenance',
      value: 'true',
      valueType: 'boolean',
      description: '维护中',
      adminId: 'admin-1',
      timestamp: 789,
    });
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /INSERT INTO system_settings/);
    assert.match(calls[0].sql, /ON DUPLICATE KEY UPDATE/);
    assert.deepEqual(calls[0].args, [
      'site_maintenance',
      'true',
      'boolean',
      '维护中',
      'admin-1',
      789,
    ]);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('admin stats repository user list query keeps filter params before pagination', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    get: (...args) => {
      calls.push({ kind: 'get', sql, args });
      return { total: 5 };
    },
    all: (...args) => {
      calls.push({ kind: 'all', sql, args });
      return [];
    },
  });

  try {
    const result = await getAdminUserListRows({
      whereSql: 'WHERE u.role = ? AND u.is_disabled = 0',
      params: ['teacher'],
      pageSize: 12,
      offset: 24,
    });
    assert.equal(result.totalRow.total, 5);
    assert.equal(calls.length, 2);
    assert.match(calls[0].sql, /SELECT COUNT\(\*\) AS total/);
    assert.deepEqual(calls[0].args, ['teacher']);
    assert.match(calls[1].sql, /LIMIT \? OFFSET \?/);
    assert.deepEqual(calls[1].args, ['teacher', 12, 24]);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('admin stats repository user detail queries keep user id scoped across base and extra rows', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    get: (...args) => {
      calls.push({ kind: 'get', sql, args });
      if (/COUNT\(DISTINCT cs\.student_id\)/.test(sql)) return { student_count: 9 };
      return { id: 'user-1' };
    },
    all: (...args) => {
      calls.push({ kind: 'all', sql, args });
      return [];
    },
  });

  try {
    const baseRow = await getAdminUserDetailBaseRow('user-1');
    const extraRows = await getAdminUserDetailExtraRows('user-1');
    assert.equal(baseRow.id, 'user-1');
    assert.equal(extraRows.teacherStats.student_count, 9);
    assert.equal(calls[0].args[0], 'user-1');
    assert.equal(calls[1].args[0], 'user-1');
    assert.equal(calls[2].args[0], 'user-1');
    assert.equal(calls[3].args[0], 'user-1');
  } finally {
    db.prepare = originalPrepare;
  }
});

test('admin stats repository dashboard query passes start timestamp only to submission trend query', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    get: (...args) => {
      calls.push({ kind: 'get', sql, args });
      return { total: 0 };
    },
    all: (...args) => {
      calls.push({ kind: 'all', sql, args });
      return [];
    },
  });

  try {
    await getAdminDashboardBaseRows({
      userScope: '1 = 1',
      classScope: '1 = 1',
      writingScope: 'COALESCE(w.is_test_data, 0) = 0',
      includeTestData: false,
      start: 123456,
    });
    const submissionCall = calls.find((entry) => /DATE_FORMAT\(FROM_UNIXTIME/.test(entry.sql));
    assert.ok(submissionCall);
    assert.deepEqual(submissionCall.args, [123456]);
    const taskCall = calls.find((entry) => /FROM writing_tasks wt/.test(entry.sql));
    assert.ok(taskCall);
    assert.deepEqual(taskCall.args, []);
  } finally {
    db.prepare = originalPrepare;
  }
});
