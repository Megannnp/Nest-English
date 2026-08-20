/**
 * server/scripts/seed-admin.js
 *
 * 创建内置管理员账号，仅执行一次。
 * 用法：
 *   node scripts/seed-admin.js
 *   ADMIN_RESET_PASSWORD=1 ADMIN_PASSWORD='new-password' node scripts/seed-admin.js
 *
 * 账号：admin@nest.local
 * 密码：运行时从环境变量 ADMIN_PASSWORD 读取，或使用默认值（请修改）
 */

import '../utils/env.js';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';

import { pool } from '../db/client.js';

const EMAIL    = 'admin@nest.local';

async function passwordHashForReset({ adminPassword, hashPassword }) {
  if (!adminPassword) {
    throw new Error('重置现有管理员密码时必须设置 ADMIN_PASSWORD');
  }
  return hashPassword(adminPassword, 10);
}

export async function seedAdmin({
  dbPool = pool,
  env = process.env,
  hashPassword = bcrypt.hash,
  now = Date.now,
  random = Math.random,
  logger = console,
} = {}) {
  const password = env.ADMIN_PASSWORD || 'NestAdmin2026!';
  const shouldResetPassword = env.ADMIN_RESET_PASSWORD === '1';

  // 检查是否已存在
  const [existing] = await dbPool.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [EMAIL]
  );

  if (existing.length > 0) {
    if (shouldResetPassword) {
      await dbPool.query(
        "UPDATE users SET password = ?, role = 'teacher', is_admin = 1 WHERE email = ?",
        [await passwordHashForReset({ adminPassword: env.ADMIN_PASSWORD, hashPassword }), EMAIL]
      );
      logger.log('✅ 管理员账号已存在，已重置密码并确认 is_admin = 1');
    } else {
      // 已存在则只确保 is_admin = 1，避免误覆盖真实线上密码。
      await dbPool.query(
        'UPDATE users SET is_admin = 1 WHERE email = ?',
        [EMAIL]
      );
      logger.log('✅ 管理员账号已存在，已确认 is_admin = 1；密码未修改');
      logger.log('   如需重置密码，请设置 ADMIN_RESET_PASSWORD=1 和 ADMIN_PASSWORD 后再运行。');
    }
    await dbPool.end();
    return;
  }

  // 生成唯一 account_code
  let accountCode;
  for (let i = 0; i < 20; i++) {
    const code = String(Math.floor(random() * 1000000)).padStart(6, '0');
    const [rows] = await dbPool.query(
      'SELECT id FROM users WHERE account_code = ? LIMIT 1',
      [code]
    );
    if (!rows.length) { accountCode = code; break; }
  }
  if (!accountCode) throw new Error('生成 account_code 失败');

  const passwordHash = await hashPassword(password, 10);
  const createdAt = now();
  const id  = `admin_${createdAt}`;

  await dbPool.query(
    `INSERT INTO users
      (id, email, password, role, real_name, nick_name, account_code, is_admin, created_at)
    VALUES (?, ?, ?, 'teacher', '管理员', '管理员', ?, 1, ?)`,
    [id, EMAIL, passwordHash, accountCode, createdAt]
  );

  logger.log('✅ 管理员账号创建成功');
  logger.log(`   邮箱：${EMAIL}`);
  logger.log(`   密码：${password}`);
  logger.log('   请妥善保管密码，登录后可在设置中修改。');

  await dbPool.end();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedAdmin().catch((err) => {
  console.error('❌ 创建失败：', err.message);
  process.exit(1);
  });
}
