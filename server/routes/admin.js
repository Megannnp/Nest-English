/**
 * server/routes/admin.js
 *
 * 挂载点：app.use('/api/admin', adminRouter)
 * 所有接口都需要 is_admin = 1
 */

import { Router } from 'express';

import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';
import * as svc from '../services/announcementService.js';
import { announcementFileUpload, isValidAnnouncementUpload } from '../utils/announcementUpload.js';

export const adminRouter = Router();

// ─── 公告管理 ─────────────────────────────────────────────────────────────────

/** GET /api/admin/announcements — 所有公告（含未发布） */
adminRouter.get('/announcements', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const list = await svc.listAllAnnouncements();
    res.json({ ok: true, data: list });
  } catch (err) { next(err); }
});

/** POST /api/admin/announcements — 发布公告 */
adminRouter.post('/announcements', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { title, body } = req.body;
    const result = await svc.createAnnouncement({ title, body, createdBy: req.user.id });
    res.status(201).json({ ok: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/admin/announcements/:id/file — 上传附件 */
adminRouter.post(
  '/announcements/:id/file',
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

/** DELETE /api/admin/announcements/:id — 删除公告 */
adminRouter.delete('/announcements/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await svc.deleteAnnouncement(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─── 留言管理 ─────────────────────────────────────────────────────────────────

/** GET /api/admin/messages — 所有留言 */
adminRouter.get('/messages', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await svc.adminListMessages({
      status: req.query.status,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    res.json({ ok: true, data });
  } catch (err) { next(err); }
});

/** PUT /api/admin/messages/:id/reply — 回复留言（自动 approve） */
adminRouter.put('/messages/:id/reply', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await svc.replyToMessage(Number(req.params.id), {
      reply:     req.body.reply,
      repliedBy: req.user.id,
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/** PUT /api/admin/messages/:id/review — 审核（approve/reject） */
adminRouter.put('/messages/:id/review', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await svc.reviewMessage(Number(req.params.id), req.body.status);
    res.json({ ok: true });
  } catch (err) { next(err); }
});
