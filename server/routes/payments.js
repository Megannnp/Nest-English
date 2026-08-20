import { Router } from 'express';

import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';
import {
  closeMyPaymentOrder,
  closeManualPaymentOrderByAdmin,
  confirmManualPaymentOrder,
  createPaymentOrder,
  listAdminPaymentOrders,
  listMyPaymentOrders,
  listPaymentProducts,
  markManualPaymentOrderFailedByAdmin,
  markManualPaymentOrderRefundedByAdmin,
} from '../services/paymentOrderService.js';

const router = Router();

router.get('/products', requireAuth, async (_req, res, next) => {
  try {
    res.json({ code: 200, msg: 'ok', data: listPaymentProducts() });
  } catch (error) {
    next(error);
  }
});

router.get('/orders', requireAuth, async (req, res, next) => {
  try {
    const data = await listMyPaymentOrders(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.post('/orders', requireAuth, async (req, res, next) => {
  try {
    const productCode = String(req.body?.productCode || '').trim();
    if (!productCode) {
      return res.status(400).json({ code: 400, msg: '缺少购买项目编码' });
    }
    if (productCode.length > 64) {
      return res.status(400).json({ code: 400, msg: '购买项目编码不合法' });
    }
    const paymentMethod = String(req.body?.paymentMethod || 'manual_qr').trim();
    if (paymentMethod !== 'manual_qr') {
      return res.status(400).json({ code: 400, msg: '当前仅支持手动二维码付款' });
    }
    const proofNote = String(req.body?.proofNote || '').trim().slice(0, 512);

    const data = await createPaymentOrder({
      userId: req.user.id,
      productCode,
      paymentMethod,
      proofNote,
    });
    res.json({ code: 200, msg: '订单已创建', data });
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:id/close', requireAuth, async (req, res, next) => {
  try {
    const data = await closeMyPaymentOrder({
      userId: req.user.id,
      orderId: req.params.id,
    });
    res.json({ code: 200, msg: '订单已关闭', data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/orders', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await listAdminPaymentOrders({
      status: req.query.status,
      keyword: req.query.keyword,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/orders/:id/confirm', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await confirmManualPaymentOrder({
      orderId: req.params.id,
      adminUserId: req.user.id,
    });
    res.json({ code: 200, msg: data.status === 'paid' ? '订单已确认' : '订单已关闭', data });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/orders/:id/close', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await closeManualPaymentOrderByAdmin({
      orderId: req.params.id,
    });
    res.json({ code: 200, msg: '订单已关闭', data });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/orders/:id/fail', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await markManualPaymentOrderFailedByAdmin({
      orderId: req.params.id,
    });
    res.json({ code: 200, msg: '订单已标记异常', data });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/orders/:id/refund', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await markManualPaymentOrderRefundedByAdmin({
      orderId: req.params.id,
    });
    res.json({ code: 200, msg: '订单已标记退款', data });
  } catch (error) {
    next(error);
  }
});

export default router;
