import db, { createUserAccountCode } from '../db/database.js';

const AUTH_USER_COLUMNS =
  'id, account_code, email, phone, password, role, real_name, nick_name, ' +
  'class_id, class_name, preferences, created_at, is_admin';

export async function findUserByEmail(email) {
  return db.prepare(`SELECT ${AUTH_USER_COLUMNS} FROM users WHERE email = ?`).get(email);
}

export async function findUserByPhone(phone) {
  return db.prepare(`SELECT ${AUTH_USER_COLUMNS} FROM users WHERE phone = ?`).get(phone);
}

export async function findUserById(userId) {
  return db.prepare(
    'SELECT id, account_code, email, phone, role, real_name, nick_name, class_id, class_name, preferences, created_at, is_admin FROM users WHERE id = ?'
  ).get(userId);
}

export async function insertUser({
  id,
  realName,
  email,
  phone,
  passwordHash,
  role,
  preferences = null,
  createdAt,
}) {
  // generateUniqueAccountCode uses check-then-insert which is non-atomic.
  // If two concurrent registrations generate the same code the second INSERT
  // will fail with ER_DUP_ENTRY on the UNIQUE account_code column.  Retry up
  // to 5 times to get a fresh code before surfacing as an error.
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const accountCode = await createUserAccountCode();
    try {
      await db.prepare(`
        INSERT INTO users (id, account_code, nick_name, email, phone, password, role, real_name, class_id, class_name, preferences, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, '', ?, ?)
      `).run(id, accountCode, realName, email, phone, passwordHash, role, realName, preferences ? JSON.stringify(preferences) : null, createdAt);
      return findUserById(id);
    } catch (err) {
      // MySQL 1062 / ER_DUP_ENTRY on account_code → retry with a new code.
      const isDupEntry =
        err.errno === 1062 ||
        err.code === 'ER_DUP_ENTRY' ||
        (err.message && err.message.includes('Duplicate entry'));
      if (isDupEntry && err.message && err.message.includes('account_code')) {
        continue; // try again with a freshly generated code
      }
      throw err; // duplicate email/phone or other error — surface immediately
    }
  }
  throw new Error('生成账号编号失败，请重试');
}

export async function insertUserByPhone({ id, realName, phone, role, createdAt }) {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const accountCode = await createUserAccountCode();
    try {
      await db.prepare(`
        INSERT INTO users (id, account_code, nick_name, email, phone, password, role, real_name, class_id, class_name, preferences, created_at)
        VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, NULL, '', NULL, ?)
      `).run(id, accountCode, realName, phone, role, realName, createdAt);
      return findUserById(id);
    } catch (err) {
      const isDupEntry =
        err.errno === 1062 ||
        err.code === 'ER_DUP_ENTRY' ||
        (err.message && err.message.includes('Duplicate entry'));
      if (isDupEntry && err.message && err.message.includes('account_code')) {
        continue;
      }
      throw err;
    }
  }
  throw new Error('生成账号编号失败，请重试');
}

export async function updatePasswordByEmail(email, passwordHash) {
  await db.prepare('UPDATE users SET password = ? WHERE email = ?').run(passwordHash, email);
}

export async function updatePasswordByPhone(phone, passwordHash) {
  await db.prepare('UPDATE users SET password = ? WHERE phone = ?').run(passwordHash, phone);
}
