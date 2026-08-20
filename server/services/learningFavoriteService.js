/* eslint-disable complexity */
import db from '../db/database.js';
import { nanoid } from '../utils/nanoid.js';

const MODULES = new Set(['grammar', 'writing', 'vocab']);
const TYPES = new Set(['grammar-sentence', 'writing-sentence', 'vocab-word']);

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizePayload({ module, favoriteType, title = '', content = '', metadata = null }) {
  const mod = String(module || '').trim();
  const type = String(favoriteType || '').trim();
  const text = String(content || '').trim();
  if (!MODULES.has(mod)) throw validationError('不支持的收藏模块');
  if (!TYPES.has(type)) throw validationError('不支持的收藏类型');
  if (!text) throw validationError('收藏内容不能为空');
  const json = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? JSON.stringify(metadata) : null;
  return {
    module: mod,
    favoriteType: type,
    title: String(title || '').trim().slice(0, 256),
    content: text,
    metadataJson: json && json.length <= 4000 ? json : null,
  };
}

function mapRow(row) {
  return {
    id: row.id,
    module: row.module,
    favoriteType: row.favorite_type,
    title: row.title || '',
    content: row.content || '',
    metadata: parseJson(row.metadata_json),
    createdAt: Number(row.created_at),
  };
}

export async function saveLearningFavorite({ userId, module, favoriteType, title, content, metadata }) {
  if (!userId) throw validationError('缺少用户');
  const item = normalizePayload({ module, favoriteType, title, content, metadata });
  const id = nanoid();
  const createdAt = Date.now();
  await db.prepare(`
    INSERT INTO learning_favorites
      (id, user_id, module, favorite_type, title, content, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, item.module, item.favoriteType, item.title, item.content, item.metadataJson, createdAt);
  return { id, ...item, metadata, createdAt };
}

export async function listLearningFavorites({ userId, module, favoriteType, limit = 10 }) {
  if (!userId) return [];
  const filters = ['user_id = ?'];
  const params = [userId];
  if (module) {
    filters.push('module = ?');
    params.push(module);
  }
  if (favoriteType) {
    filters.push('favorite_type = ?');
    params.push(favoriteType);
  }
  params.push(Math.max(1, Math.min(50, Number(limit) || 10)));
  const rows = await db.prepare(`
    SELECT id, module, favorite_type, title, content, metadata_json, created_at
    FROM learning_favorites
    WHERE ${filters.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ?
  `).all(...params);
  return (rows || []).map(mapRow);
}
