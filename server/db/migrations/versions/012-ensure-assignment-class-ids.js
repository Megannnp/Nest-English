export default {
  version: '012',
  name: 'ensure-assignment-class-ids',
  async up({ pool }) {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'assignments'
        AND COLUMN_NAME = 'class_ids'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE assignments ADD COLUMN class_ids JSON DEFAULT NULL AFTER class_id`);
    }

    // 回填：把现有的 class_id 写入 class_ids
    await pool.query(`
      UPDATE assignments
      SET class_ids = JSON_ARRAY(class_id)
      WHERE class_ids IS NULL AND class_id IS NOT NULL
    `);
  },
};
