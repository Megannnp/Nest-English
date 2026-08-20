import { Router } from 'express';

import { requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import {
  checkInToday,
  claimPendingPointRewards,
  getEntitlementLedger,
  getPointsSummary,
  redeemPoints,
} from '../services/pointsService.js';
import {
  getUserForViewer,
  listUsersForTeacher,
  updateCurrentUserProfile,
} from '../services/userService.js';

const router = Router();

export function buildClientLearningSourceId(module, idempotencyKey) {
  const normalizedModule = String(module || '').trim().toLowerCase().slice(0, 32);
  const sourcePrefix = `client:${normalizedModule}:`;
  return `${sourcePrefix}${String(idempotencyKey || '').trim().slice(0, Math.max(1, 128 - sourcePrefix.length))}`;
}

router.get('/', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listUsersForTeacher(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const data = await updateCurrentUserProfile({
      userId: req.user.id,
      payload: req.body,
    });
    res.json({ code: 200, msg: '更新成功', data });
  } catch (err) {
    next(err);
  }
});

router.get('/me/points', requireAuth, async (req, res, next) => {
  try {
    const data = await getPointsSummary(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.post('/me/points/check-in', requireAuth, async (req, res, next) => {
  try {
    const data = await checkInToday(req.user.id);
    res.json({ code: 200, msg: '签到成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/me/points/learning-events', requireAuth, async (req, res, next) => {
  try {
    res.status(410).json({ code: 410, msg: '客户端学习积分上报已停用，请通过模块完成记录自动发放积分' });
  } catch (err) {
    next(err);
  }
});

router.post('/me/points/redeem', requireAuth, async (req, res, next) => {
  try {
    const data = await redeemPoints({
      userId: req.user.id,
      rewardCode: req.body?.rewardCode,
    });
    res.json({ code: 200, msg: '兑换成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/me/points/claim-pending', requireAuth, async (req, res, next) => {
  try {
    const data = await claimPendingPointRewards(req.user.id);
    res.json({ code: 200, msg: '领取成功', data });
  } catch (err) {
    next(err);
  }
});

router.get('/me/entitlements/:unit/ledger', requireAuth, async (req, res, next) => {
  try {
    const data = await getEntitlementLedger(req.user.id, req.params.unit, {
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = await getUserForViewer({
      viewer: req.user,
      targetUserId: req.params.id,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

export default router;
