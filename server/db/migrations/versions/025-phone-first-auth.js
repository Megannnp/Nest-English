export default {
  version: '025',
  name: 'phone-first-auth',
  async up({ pool }) {
    // Allow phone-only accounts: email and password can now be NULL.
    // Existing rows are unaffected; the UNIQUE constraint on email is preserved
    // (MySQL treats each NULL as distinct, so multiple NULL emails are allowed).
    await pool.query(`
      ALTER TABLE users
        MODIFY COLUMN email    VARCHAR(128) DEFAULT NULL,
        MODIFY COLUMN password VARCHAR(256) DEFAULT NULL
    `);
  },
};
