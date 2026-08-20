/**
 * server/services/announcementService.js
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import db from '../db/database.js';
import { AppError } from '../utils/appError.js';
import {
  deleteKeyFromOSS,
  getSignedUrlByKey,
  isOSSConfigured,
  uploadBufferToOSS,
} from '../utils/oss.js';
import { sanitizeFilename } from '../utils/validateFileMagicBytes.js';

const ANNOUNCEMENT_TITLE_MAX = 200;
const ANNOUNCEMENT_BODY_MAX = 10000;
const LOCAL_UPLOAD_ROOT = new URL('../../uploads/', import.meta.url);

export function getLocalAnnouncementFilePath(fileKey) {
  return new URL(fileKey, LOCAL_UPLOAD_ROOT).pathname;
}

async function writeLocalAnnouncementFile(fileKey, fileBuffer) {
  const filePath = getLocalAnnouncementFilePath(fileKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, fileBuffer);
}

async function deleteAnnouncementFile(fileKey) {
  if (!fileKey) return;
  if (isOSSConfigured()) {
    await deleteKeyFromOSS(fileKey);
    return;
  }
  await fs.unlink(getLocalAnnouncementFilePath(fileKey)).catch((err) => {
    if (err?.code !== 'ENOENT') throw err;
  });
}

// ─── 公告 ────────────────────────────────────────────────────────────────────

export async function listAnnouncements() {
  return db.prepare(`
    SELECT id, title, body, file_name, file_size, file_url, created_at
    FROM announcements
    WHERE is_published = 1
    ORDER BY created_at DESC
    LIMIT 50
  `).all();
}

export async function listAllAnnouncements() {
  return db.prepare(`
    SELECT id, title, body, file_name, file_size, file_url, is_published, created_at
    FROM announcements
    ORDER BY created_at DESC
    LIMIT 100
  `).all();
}

export async function getAnnouncement(id) {
  const item = await db.prepare(`
    SELECT id, title, body, file_name, file_key, file_size, file_url, created_at
    FROM announcements
    WHERE id = ? AND is_published = 1
  `).get(id);
  if (!item) throw new AppError('公告不存在', 404);
  return item;
}

export async function createAnnouncement({ title, body, createdBy }) {
  const trimmedTitle = String(title || '').trim();
  const trimmedBody  = String(body  || '').trim();
  if (!trimmedTitle) throw new AppError('标题不能为空', 400);
  if (!trimmedBody)  throw new AppError('内容不能为空', 400);
  if (trimmedTitle.length > ANNOUNCEMENT_TITLE_MAX) {
    throw new AppError(`标题不能超过 ${ANNOUNCEMENT_TITLE_MAX} 个字符`, 400);
  }
  if (trimmedBody.length > ANNOUNCEMENT_BODY_MAX) {
    throw new AppError(`内容不能超过 ${ANNOUNCEMENT_BODY_MAX} 个字符`, 400);
  }

  const result = await db.prepare(`
    INSERT INTO announcements (title, body, created_by) VALUES (?, ?, ?)
  `).run(trimmedTitle, trimmedBody, createdBy);

  return { id: result.lastInsertRowid };
}

export async function attachFileToAnnouncement(announcementId, {
  fileBuffer,
  originalName,
  mimeType,
}) {
  const existing = await db.prepare(
    `SELECT id, file_key FROM announcements WHERE id = ?`
  ).get(announcementId);
  if (!existing) throw new AppError('公告不存在', 404);

  if (existing.file_key) {
    await deleteAnnouncementFile(existing.file_key);
  }

  const safeFilename = sanitizeFilename(originalName);
  const ext      = path.extname(safeFilename).toLowerCase() || '';
  const uid      = crypto.randomBytes(8).toString('hex');
  const fileKey  = `announcements/${announcementId}/${uid}${ext}`;
  const fileSize = fileBuffer.length;

  let fileUrl = null;
  if (isOSSConfigured()) {
    await uploadBufferToOSS(fileKey, fileBuffer, mimeType);
    fileUrl = getSignedUrlByKey(fileKey, 3600 * 24 * 7);
  } else {
    await writeLocalAnnouncementFile(fileKey, fileBuffer);
  }

  await db.prepare(`
    UPDATE announcements
    SET file_name = ?, file_key = ?, file_size = ?, file_url = ?
    WHERE id = ?
  `).run(safeFilename, fileKey, fileSize, fileUrl, announcementId);

  return { fileKey, fileSize, originalName: safeFilename };
}

export async function deleteAnnouncement(id) {
  // Fetch file_key before soft-deleting so we can clean up OSS
  const item = await db.prepare(
    `SELECT file_key FROM announcements WHERE id = ? AND is_published = 1`
  ).get(id);
  if (!item) throw new AppError('公告不存在', 404);

  await db.prepare(
    `UPDATE announcements SET is_published = 0 WHERE id = ?`
  ).run(id);

  if (item.file_key) {
    await deleteAnnouncementFile(item.file_key).catch((err) => {
      console.error('[announcement] file cleanup failed:', item.file_key, err?.message);
    });
  }
}

// ─── 用户留言 ────────────────────────────────────────────────────────────────

export async function submitMessage({ userId, role, content }) {
  if (!content?.trim()) throw new AppError('留言内容不能为空', 400);
  if (content.trim().length > 500) throw new AppError('留言内容不能超过 500 字', 400);

  const result = await db.prepare(`
    INSERT INTO user_messages (user_id, role, content) VALUES (?, ?, ?)
  `).run(userId, role, content.trim());

  return { id: result.lastInsertRowid };
}

export async function getMyMessages(userId) {
  return db.prepare(`
    SELECT id, content, status, reply, replied_at, created_at
    FROM user_messages
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).all(userId);
}

export async function adminListMessages({ status, page, pageSize } = {}) {
  const normalizedPage     = Math.max(1, Number.parseInt(page, 10) || 1);
  const normalizedPageSize = Math.min(100, Math.max(1, Number.parseInt(pageSize, 10) || 50));
  const offset = (normalizedPage - 1) * normalizedPageSize;

  const whereClause = status ? 'WHERE m.status = ?' : '';
  const params      = status ? [status] : [];

  const countRow = await db.prepare(`
    SELECT COUNT(*) AS total FROM user_messages m ${whereClause}
  `).get(...params);
  const total = Number(countRow?.total || 0);

  const rows = await db.prepare(`
    SELECT m.id, m.content, m.status, m.reply, m.replied_at, m.created_at,
           u.real_name, u.email, m.role
    FROM user_messages m
    LEFT JOIN users u ON u.id = m.user_id
    ${whereClause}
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, normalizedPageSize, offset);

  return {
    list: rows,
    total,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalPages: Math.max(1, Math.ceil(total / normalizedPageSize)),
  };
}

export async function reviewMessage(id, status) {
  if (!['approved', 'rejected'].includes(status))
    throw new AppError('status 只能是 approved 或 rejected', 400);

  const result = await db.prepare(
    `UPDATE user_messages SET status = ? WHERE id = ?`
  ).run(status, id);
  if (!result.changes) throw new AppError('留言不存在', 404);
}

export async function replyToMessage(id, { reply, repliedBy }) {
  if (!reply?.trim()) throw new AppError('回复内容不能为空', 400);

  const result = await db.prepare(`
    UPDATE user_messages
    SET reply = ?, replied_at = NOW(), replied_by = ?, status = 'approved'
    WHERE id = ?
  `).run(reply.trim(), repliedBy, id);
  if (!result.changes) throw new AppError('留言不存在', 404);
}

export async function getTickerData(userId) {
  const announcements = await db.prepare(`
    SELECT id, title, body, file_name, file_size, created_at
    FROM announcements
    WHERE is_published = 1
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  let myMessages = [];
  if (userId) {
    myMessages = await db.prepare(`
      SELECT id, content, status, reply, replied_at, created_at
      FROM user_messages
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 3
    `).all(userId);
  }

  return { announcements, myMessages };
}
