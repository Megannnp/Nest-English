/**
 * Migration 059: leads captured from the public "英语断点诊断" (/plan) landing page.
 * Phase 1 is lead-capture only — no payment/plan generation yet.
 */
export default {
  version: '059',
  name: 'plan-diagnosis-leads',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plan_diagnosis_leads (
        id           VARCHAR(64)  PRIMARY KEY,
        child_grade  VARCHAR(32)  NOT NULL DEFAULT '',
        main_problem VARCHAR(255) NOT NULL DEFAULT '',
        daily_time   VARCHAR(32)  NOT NULL DEFAULT '',
        contact      VARCHAR(128) NOT NULL,
        note         TEXT,
        source       VARCHAR(64)  NOT NULL DEFAULT 'plan_page',
        user_id      VARCHAR(64)  DEFAULT NULL,
        status       VARCHAR(24)  NOT NULL DEFAULT 'new',
        created_at   BIGINT       NOT NULL,
        INDEX idx_plan_leads_created (created_at),
        INDEX idx_plan_leads_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
