import { randomUUID } from 'node:crypto';

import db from '../db/database.js';

export async function insertPlanLead(input) {
  const lead = {
    id: randomUUID(),
    childGrade: input.childGrade || '',
    mainProblem: input.mainProblem || '',
    dailyTime: input.dailyTime || '',
    contact: input.contact,
    note: input.note || null,
    source: input.source || 'plan_page',
    userId: input.userId || null,
    createdAt: Date.now(),
  };

  await db
    .prepare(
      `INSERT INTO plan_diagnosis_leads
        (id, child_grade, main_problem, daily_time, contact, note, source, user_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`
    )
    .run(
      lead.id,
      lead.childGrade,
      lead.mainProblem,
      lead.dailyTime,
      lead.contact,
      lead.note,
      lead.source,
      lead.userId,
      lead.createdAt
    );

  return { id: lead.id };
}

export async function listPlanLeads(limit = 200) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 500) : 200;
  return db
    .prepare(`SELECT * FROM plan_diagnosis_leads ORDER BY created_at DESC LIMIT ?`)
    .all(safeLimit);
}
