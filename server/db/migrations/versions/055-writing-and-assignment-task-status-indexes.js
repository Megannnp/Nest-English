async function ensureIndex(pool, tableName, indexName, columnsSql) {
  await pool.query(`
    ALTER TABLE ${tableName}
      ADD INDEX IF NOT EXISTS ${indexName} ${columnsSql}
  `).catch(async () => {
    const [rows] = await pool.query(
      `SELECT COUNT(1) AS cnt
         FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = ?
          AND index_name = ?`,
      [tableName, indexName]
    );
    if (rows[0].cnt === 0) {
      await pool.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} ${columnsSql}`);
    }
  });
}

export default {
  version: '055',
  name: 'writing-and-assignment-task-status-indexes',
  async up({ pool }) {
    // claimNextWritingTask polls "WHERE task_type = ? AND (status = ? OR (status = ? AND
    // last_heartbeat_at < ?))" — without an index this becomes a full-table scan that
    // gets slower as historical writing_tasks rows accumulate.
    await ensureIndex(pool, 'writing_tasks', 'idx_writing_tasks_type_status', '(task_type, status)');
    // Exception/dead-letter dashboard counts filter on status alone.
    await ensureIndex(pool, 'writing_tasks', 'idx_writing_tasks_status', '(status)');

    // Teacher workbench dashboards join assignment_tasks to assignments on assignment_id
    // and then filter/aggregate by status; without this composite index each of those
    // per-assignment status checks falls back to a row lookup per joined task.
    await ensureIndex(pool, 'assignment_tasks', 'idx_assignment_tasks_assignment_status', '(assignment_id, status)');
  },
};
