import './testSetup.js';
import jwt from 'jsonwebtoken';
import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';

import { createApp } from '../app.js';
import db, { setDatabaseReadyForTests } from '../db/database.js';
import {
  createJoinClassHttpFixture,
  createRosterImportHttpFixture,
  createRosterLinkHttpFixture,
  createRosterUnlinkHttpFixture,
} from './fixtures/contractFixtures.js';
import { stubAuthUserLookup } from './helpers/stubAuthUserLookup.js';

function createToken(overrides = {}) {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign({
    id: 'teacher-test',
    role: 'teacher',
    name: '测试教师',
    realName: '测试教师',
    ...overrides,
  }, secret);
}

const canBindLocalPort = await new Promise((resolve) => {
  const probe = net.createServer();
  probe.once('error', () => resolve(false));
  probe.listen(0, '127.0.0.1', () => {
    probe.close(() => resolve(true));
  });
});

async function withServer(t, run) {
  if (!canBindLocalPort) {
    t.skip('当前沙箱环境不允许监听本地端口，接口测试在本机可正常执行');
    return;
  }

  setDatabaseReadyForTests(true);
  stubAuthUserLookup(t);
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
}

const classJoinFixture = createJoinClassHttpFixture();
const rosterImportFixture = createRosterImportHttpFixture();
const rosterLinkFixture = createRosterLinkHttpFixture();
const rosterUnlinkFixture = createRosterUnlinkHttpFixture();

function assertAuthErrorBody(body, { code, errorCode, messagePattern }) {
  assert.equal(body.code, code);
  if (errorCode) {
    assert.equal(body.errorCode, errorCode);
  }
  assert.match(body.msg, messagePattern);
}

function mockJoinClassDatabase(fixture) {
  const originalPrepare = db.prepare;
  const originalGetConnection = db.pool.getConnection;

  db.prepare = (sql) => ({
    async get(...params) {
      if (sql.includes('FROM classes WHERE id = ?')) {
        assert.equal(params[0], fixture.classRow.id);
        return fixture.classRow;
      }
      if (sql.includes('FROM users WHERE id = ?')) {
        assert.equal(params[0], fixture.joinedUserRow.id);
        return fixture.joinedUserRow;
      }
      throw new Error(`unexpected prepare.get SQL: ${sql}`);
    },
    async all() {
      throw new Error(`unexpected prepare.all SQL: ${sql}`);
    },
    async run() {
      throw new Error(`unexpected prepare.run SQL: ${sql}`);
    },
  });

  db.pool.getConnection = async () => ({
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, params = []) {
      if (sql.includes('FROM users WHERE id = ? LIMIT 1')) {
        assert.equal(params[0], fixture.preJoinUserRow.id);
        return [[fixture.preJoinUserRow]];
      }
      if (sql.includes('FROM student_roster') && sql.includes('student_no')) {
        return [[]];
      }
      if (
        sql.startsWith('INSERT INTO class_students')
        || sql.startsWith('UPDATE users SET class_id')
        || sql.startsWith('UPDATE classes SET password')
      ) {
        return [{ affectedRows: 1 }];
      }
      throw new Error(`unexpected connection SQL: ${sql}`);
    },
  });

  return () => {
    db.prepare = originalPrepare;
    db.pool.getConnection = originalGetConnection;
  };
}

const unauthenticatedRouteCases = [
  {
    name: 'GET /api/classes/search requires auth token',
    path: '/api/classes/search?code=DEMO',
    method: 'GET',
  },
  {
    name: 'GET /api/classes/:id requires auth token',
    path: '/api/classes/class-1',
    method: 'GET',
  },
  {
    name: 'POST /api/classes/:id/join requires auth token',
    path: `/api/classes/${classJoinFixture.classRow.id}/join`,
    method: 'POST',
    body: { password: classJoinFixture.classRow.password },
  },
  {
    name: 'POST /api/classes/:id/roster/import requires auth token',
    path: `/api/classes/${rosterImportFixture.classId}/roster/import`,
    method: 'POST',
    body: rosterImportFixture.requestBody,
  },
];

for (const routeCase of unauthenticatedRouteCases) {
  test(routeCase.name, async (t) => {
    await withServer(t, async (baseUrl) => {
      const response = await fetch(`${baseUrl}${routeCase.path}`, {
        method: routeCase.method,
        headers: routeCase.body ? { 'Content-Type': 'application/json' } : {},
        body: routeCase.body ? JSON.stringify(routeCase.body) : undefined,
      });

      assert.equal(response.status, 401);
      const body = await response.json();
      assertAuthErrorBody(body, {
        code: 401,
        errorCode: 'AUTH_MISSING_TOKEN',
        messagePattern: /未登录|登录/,
      });
    });
  });
}

test('GET /api/classes/search rejects invalid token with stable auth error shape', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/classes/search?code=DEMO`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    assert.equal(response.status, 401);
    const body = await response.json();
    assertAuthErrorBody(body, {
      code: 401,
      errorCode: 'AUTH_TOKEN_INVALID',
      messagePattern: /Token|重新登录/,
    });
  });
});

test('GET /api/classes/:id/roster rejects student auth', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/classes/${rosterImportFixture.classId}/roster`, {
      headers: {
        Authorization: `Bearer ${createToken({ id: 'student-test', role: 'student' })}`,
      },
    });

    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.msg, /教师|权限/);
  });
});

test('POST /api/classes/:id/roster/link-user rejects student auth', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/classes/${rosterLinkFixture.classId}/roster/link-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken({ id: 'student-test', role: 'student' })}`,
      },
      body: JSON.stringify(rosterLinkFixture.requestBody),
    });

    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.msg, /教师|权限/);
  });
});

const teacherOnlyRouteCases = [
  {
    name: 'POST /api/classes/:id/roster/import rejects student auth',
    path: `/api/classes/${rosterImportFixture.classId}/roster/import`,
    method: 'POST',
    body: rosterImportFixture.requestBody,
  },
  {
    name: 'POST /api/classes/:id/roster/:rosterId/unlink-user rejects student auth',
    path: `/api/classes/${rosterUnlinkFixture.classId}/roster/${rosterUnlinkFixture.rosterId}/unlink-user`,
    method: 'POST',
  },
  {
    name: 'GET /api/classes/:id/unmatched-users rejects student auth',
    path: `/api/classes/${rosterImportFixture.classId}/unmatched-users`,
    method: 'GET',
  },
  {
    name: 'GET /api/classes/:id/writings rejects student auth',
    path: `/api/classes/${rosterImportFixture.classId}/writings`,
    method: 'GET',
  },
];

for (const routeCase of teacherOnlyRouteCases) {
  test(routeCase.name, async (t) => {
    await withServer(t, async (baseUrl) => {
      const response = await fetch(`${baseUrl}${routeCase.path}`, {
        method: routeCase.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createToken({ id: 'student-test', role: 'student' })}`,
        },
        body: routeCase.body ? JSON.stringify(routeCase.body) : undefined,
      });

      assert.equal(response.status, 403);
      const body = await response.json();
      assert.match(body.msg, /教师|权限/);
    });
  });
}

test('POST /api/classes/:id/join allows student auth to reach service layer', async (t) => {
  const restoreDb = mockJoinClassDatabase(classJoinFixture);
  t.after(restoreDb);

  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/classes/${classJoinFixture.classRow.id}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken({ id: 'student-test', role: 'student' })}`,
      },
      body: JSON.stringify({ password: classJoinFixture.classRow.password }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.code, 200);
    assert.equal(body.data.classId, classJoinFixture.classRow.id);
    assert.equal(body.data.className, classJoinFixture.classRow.class_name);
    assert.deepEqual(body.data.user, classJoinFixture.expectedResponse.user);
  });
});
