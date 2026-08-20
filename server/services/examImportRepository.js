// exam_import_jobs / exam_import_items 的仓库层。
// 领单（claim）使用行级原子 UPDATE，确保多 worker 实例不会重复处理。
import db from '../db/database.js';

export function createExamImportRepository({ dbDependency = db } = {}) {
  const pool = dbDependency?.pool || {};

  return {
    async loadJobRow(jobId) {
      const [rows] = await pool.query(
        'SELECT * FROM exam_import_jobs WHERE id = ? LIMIT 1',
        [jobId]
      );
      return rows[0];
    },

    async loadItemRow(itemId) {
      const [rows] = await pool.query(
        'SELECT * FROM exam_import_items WHERE id = ? LIMIT 1',
        [itemId]
      );
      return rows[0];
    },

    async loadItemRows(jobId) {
      const [rows] = await pool.query(
        'SELECT * FROM exam_import_items WHERE job_id = ? ORDER BY sort_order ASC',
        [jobId]
      );
      return rows;
    },

    async selectNextJobCandidate({ staleBefore }) {
      const [rows] = await pool.query(`
        SELECT * FROM exam_import_jobs
        WHERE status IN ('pending', 'running')
          AND (
            (status = 'pending')
            OR (status = 'running' AND (last_heartbeat_at IS NULL OR last_heartbeat_at < ?))
          )
        ORDER BY created_at ASC
        LIMIT 1
      `, [staleBefore]);
      return rows[0];
    },

    async claimJobCandidate({ jobId, workerId, now, staleBefore, expectedStatuses, nextStatus }) {
      if (!expectedStatuses.length) return { changes: 0 };
      const placeholders = expectedStatuses.map(() => '?').join(', ');
      const [result] = await pool.query(`
        UPDATE exam_import_jobs
        SET status = ?, queue_name = ?, started_at = COALESCE(started_at, ?), last_heartbeat_at = ?, updated_at = ?
        WHERE id = ?
          AND status IN (${placeholders})
          AND (last_heartbeat_at IS NULL OR last_heartbeat_at < ?)
      `, [nextStatus, workerId, now, now, now, jobId, staleBefore]);
      return { changes: result.affectedRows ?? 0 };
    },

    async selectNextItemCandidate({ jobId, staleBefore }) {
      const [rows] = await pool.query(`
        SELECT * FROM exam_import_items
        WHERE job_id = ?
          AND (
            (status = 'pending')
            OR (status = 'running' AND (last_heartbeat_at IS NULL OR last_heartbeat_at < ?))
          )
        ORDER BY sort_order ASC
        LIMIT 1
      `, [jobId, staleBefore]);
      return rows[0];
    },

    async claimItemCandidate({ itemId, attempts, now, staleBefore }) {
      const [result] = await pool.query(`
        UPDATE exam_import_items
        SET status = 'running', attempts = ?, started_at = COALESCE(started_at, ?), last_heartbeat_at = ?, updated_at = ?
        WHERE id = ?
          AND status IN ('pending', 'running')
          AND (last_heartbeat_at IS NULL OR last_heartbeat_at < ?)
      `, [attempts, now, now, now, itemId, staleBefore]);
      return { changes: result.affectedRows ?? 0 };
    },
  };
}

export default createExamImportRepository;