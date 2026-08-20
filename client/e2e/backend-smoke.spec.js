import { expect, test } from '@playwright/test';

import { createApp } from '../../server/app.js';
import { setDatabaseReadyForTests } from '../../server/db/database.js';

async function withBackend(t, run) {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.SKIP_DB_INIT = '1';
  setDatabaseReadyForTests(true);

  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test('真实后端 smoke：健康、鉴权和请求校验可用', async ({ request }, testInfo) => {
  await withBackend(testInfo, async (baseUrl) => {
    const health = await request.get(`${baseUrl}/api/health`);
    expect(health.status()).toBe(200);
    expect(health.headers()['x-request-id']).toBeTruthy();

    const protectedResponse = await request.get(`${baseUrl}/api/users/me/points`);
    expect(protectedResponse.status()).toBe(401);

    const malformedRegister = await request.post(`${baseUrl}/api/auth/register`, {
      data: {
        email: 'bad-email',
        password: '123',
        confirmPassword: '456',
        realName: 'A',
      },
    });
    expect(malformedRegister.status()).toBe(400);
  });
});
