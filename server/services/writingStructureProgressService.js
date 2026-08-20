import db from '../db/database.js';
import { nanoid } from '../utils/nanoid.js';

const STRUCTURE_TOTALS = {
  argumentative: { label: '议论文', total: 3 },
  narrative: { label: '记叙文 / 读后续写', total: 3 },
  applied: { label: '应用文', total: 2 },
  summary: { label: '概要写作', total: 2 },
  speech: { label: '演讲稿', total: 2 },
  expository: { label: '说明文', total: 2 },
};

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

export async function saveWritingStructureProgress({ userId, typeId, sectionId }) {
  if (!userId) throw validationError('缺少用户');
  const normalizedType = String(typeId || '').trim();
  const normalizedSection = String(sectionId || '').trim();
  if (!STRUCTURE_TOTALS[normalizedType]) throw validationError('不支持的写作建构文体');
  if (!normalizedSection) throw validationError('缺少建构小节');
  const createdAt = Date.now();
  // Direct insert (not recordLearningEvent): structure-section completion is a
  // progress marker only. It must not award writing points — those share a
  // daily limit with real submissions — and a write failure must surface to the
  // caller so the client can retry rather than silently losing progress.
  await db.prepare(`
    INSERT INTO learning_events
      (id, user_id, module, event_type, score, duration_ms, metadata, created_at)
    VALUES (?, ?, 'writing', 'structure_section_complete', NULL, NULL, ?, ?)
  `).run(nanoid(), userId, JSON.stringify({ typeId: normalizedType, sectionId: normalizedSection }), createdAt);
  return { typeId: normalizedType, sectionId: normalizedSection, createdAt };
}

export async function getWritingStructureProgress(userId) {
  const defaults = Object.entries(STRUCTURE_TOTALS).map(([typeId, item]) => ({
    typeId,
    label: item.label,
    completed: 0,
    total: item.total,
    percent: 0,
  }));
  if (!userId) return defaults;

  const rows = await db.prepare(`
    SELECT
      JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.typeId')) AS type_id,
      COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.sectionId'))) AS completed
    FROM learning_events
    WHERE user_id = ?
      AND module = 'writing'
      AND event_type = 'structure_section_complete'
    GROUP BY type_id
  `).all(userId);

  const byType = new Map((rows || []).map((row) => [row.type_id, Number(row.completed || 0)]));
  return defaults.map((item) => {
    const completed = Math.min(item.total, byType.get(item.typeId) || 0);
    return {
      ...item,
      completed,
      percent: item.total > 0 ? Math.round((completed / item.total) * 100) : 0,
    };
  });
}
