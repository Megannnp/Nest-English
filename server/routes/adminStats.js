import { Router } from 'express';

import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';
import {
  getAdminDashboard,
  getAdminUserDetail,
  listAdminUsers,
  updateAdminUserDisabled,
} from '../services/adminStatsService.js';

export const adminStatsRouter = Router();

adminStatsRouter.use(requireAuth, requireAdmin);

adminStatsRouter.get('/stats/dashboard', async (req, res, next) => {
  try {
    const data = await getAdminDashboard(req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

adminStatsRouter.get('/users', async (req, res, next) => {
  try {
    const data = await listAdminUsers(req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

adminStatsRouter.get('/users/:id', async (req, res, next) => {
  try {
    const data = await getAdminUserDetail(req.params.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

adminStatsRouter.put('/users/:id/status', async (req, res, next) => {
  try {
    const data = await updateAdminUserDisabled({
      userId: req.params.id,
      disabled: req.body?.disabled === true,
      adminId: req.user.id,
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});
