export default {
  version: '047',
  name: 'announcement-message-string-user-ids',
  async up({ pool }) {
    await pool.query(`
      ALTER TABLE user_messages
      MODIFY COLUMN user_id VARCHAR(64) NOT NULL,
      MODIFY COLUMN replied_by VARCHAR(64) DEFAULT NULL
    `);

    await pool.query(`
      ALTER TABLE announcements
      MODIFY COLUMN created_by VARCHAR(64) NOT NULL
    `);
  },
};
