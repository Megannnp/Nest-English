export default {
  version: '016',
  name: 'add-is-admin',
  async up({ pool }) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0
    `).catch((err) => {
      if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
    });
  },
};
