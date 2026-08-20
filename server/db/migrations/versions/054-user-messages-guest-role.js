export default {
  version: '054',
  name: 'user-messages-guest-role',
  async up({ pool }) {
    await pool.query(`
      ALTER TABLE user_messages
      MODIFY COLUMN role ENUM('teacher','student','parent','guest') NOT NULL
    `);
  },
};
