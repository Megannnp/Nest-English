import { Router } from 'express';

import { optionalAuth, requireAdmin, requireAuth } from '../middleware/authMiddleware.js';
import * as svc from '../services/announcementService.js';
import { announcementFileUpload, isValidAnnouncementUpload } from '../utils/announcementUpload.js';
import { getSignedUrlByKey, isOSSConfigured } from '../utils/oss.js';

const GUEST_ID_PATTERN = /^guest_[a-zA-Z0-9]{8,58}$/;

function resolveGuestId(rawGuestId) {
  return typeof rawGuestId === 'string' && GUEST_ID_PATTERN.test(rawGuestId) ? rawGuestId : null;
}

export function resolveRequestGuestId(req) {
  return resolveGuestId(req.headers['x-guest-id'] || req.body?.guestId || req.query.guestId);
}

// ─── /api/announcements ──────────────────────────────────────────────────────

export const announcementRouter = Router();

announcementRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const list = await svc.listAnnouncements();
    res.json({ ok: true, data: list });
  } catch (err) { next(err); }
});

announcementRouter.get('/ticker', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? resolveRequestGuestId(req);
    const data   = await svc.getTickerData(userId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
});

announcementRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await svc.getAnnouncement(Number(req.params.id));
    res.json({ ok: true, data: item });
  } catch (err) { next(err); }
});

announcementRouter.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { title, body } = req.body;
    const result = await svc.createAnnouncement({ title, body, createdBy: req.user.id });
    res.status(201).json({ ok: true, data: result });
  } catch (err) { next(err); }
});

announcementRouter.post(
  '/:id/file',
  requireAuth,
  requireAdmin,
  announcementFileUpload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ ok: false, error: '未收到文件' });
      if (!isValidAnnouncementUpload(req.file)) {
        return res.status(400).json({ ok: false, error: '文件内容与声明类型不符，请上传真实文件' });
      }
      const result = await svc.attachFileToAnnouncement(
        Number(req.params.id),
        {
          fileBuffer:   req.file.buffer,
          originalName: req.file.originalname,
          mimeType:     req.file.mimetype,
        }
      );
      res.json({ ok: true, data: result });
    } catch (err) { next(err); }
  }
);

announcementRouter.get('/:id/file', requireAuth, async (req, res, next) => {
  try {
    const item = await svc.getAnnouncement(Number(req.params.id));
    if (!item.file_key) return res.status(404).json({ ok: false, error: '该公告没有附件' });

    if (isOSSConfigured()) {
      const url = getSignedUrlByKey(item.file_key, 300);
      return res.redirect(url);
    }

    const { createReadStream } = await import('fs');
    const filePath = svc.getLocalAnnouncementFilePath(item.file_key);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(item.file_name)}`);
    createReadStream(filePath)
      .on('error', () => res.status(404).json({ ok: false, error: '文件不存在' }))
      .pipe(res);
  } catch (err) { next(err); }
});

announcementRouter.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await svc.deleteAnnouncement(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─── /api/messages ───────────────────────────────────────────────────────────

export const messageRouter = Router();

messageRouter.post('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? resolveRequestGuestId(req);
    const role   = req.user?.role ?? 'guest';
    if (!userId) return res.status(400).json({ ok: false, error: '缺少有效的访客标识' });

    const result = await svc.submitMessage({ userId, role, content: req.body.content });
    res.status(201).json({ ok: true, data: result });
  } catch (err) { next(err); }
});

messageRouter.get('/mine', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? resolveRequestGuestId(req);
    if (!userId) return res.json({ ok: true, data: [] });

    const list = await svc.getMyMessages(userId);
    res.json({ ok: true, data: list });
  } catch (err) { next(err); }
});

messageRouter.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await svc.adminListMessages({
      status: req.query.status,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    res.json({ ok: true, data });
  } catch (err) { next(err); }
});

messageRouter.put('/:id/review', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await svc.reviewMessage(Number(req.params.id), req.body.status);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

messageRouter.put('/:id/reply', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await svc.replyToMessage(Number(req.params.id), {
      reply:     req.body.reply,
      repliedBy: req.user.id,
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
