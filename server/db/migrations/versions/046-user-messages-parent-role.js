export default {
  version: '046',
  name: 'announcement-message-user-columns',
  async up({ pool }) {
    await pool.query(`
      ALTER TABLE user_messages
      MODIFY COLUMN user_id VARCHAR(64) NOT NULL,
      MODIFY COLUMN role ENUM('teacher','student','parent') NOT NULL,
      MODIFY COLUMN replied_by VARCHAR(64) DEFAULT NULL
    `);

    await pool.query(`
      ALTER TABLE announcements
      MODIFY COLUMN created_by VARCHAR(64) NOT NULL
    `);
  },
};
