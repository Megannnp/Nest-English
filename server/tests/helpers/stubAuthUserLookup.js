import db from '../../db/database.js';

/**
 * Isolates the `users.is_disabled` lookup that requireAuth/optionalAuth perform
 * on every authenticated request.
 *
 * Contract tests sign tokens for fixture identities like `teacher-test` that
 * have no row in any database. Without this stub the lookup either resolves to
 * "no row" — which auth correctly treats as revoked, turning an expected 200
 * into a 403 — or opens a real connection and leaves the test process hanging
 * on an open pool handle.
 *
 * Only the revocation query is intercepted; every other statement falls through
 * to the real db.prepare so a test still sees genuine behaviour elsewhere.
 */
export function stubAuthUserLookup(t, { disabled = false } = {}) {
  const originalPrepare = db.prepare.bind(db);

  t.mock.method(db, 'prepare', (sql, ...rest) => {
    const isRevocationLookup = /\bis_disabled\b/i.test(String(sql)) && /\bfrom\s+users\b/i.test(String(sql));
    if (isRevocationLookup) {
      return { get: async () => ({ is_disabled: disabled ? 1 : 0 }) };
    }
    return originalPrepare(sql, ...rest);
  });
}
