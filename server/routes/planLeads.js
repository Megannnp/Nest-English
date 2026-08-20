import { Router } from 'express';

import { optionalAuth, requireAdmin, requireAuth } from '../middleware/authMiddleware.js';
import { insertPlanLead, listPlanLeads } from '../services/planLeadRepository.js';

const router = Router();

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

// Public: capture a diagnosis lead from the /plan landing page.
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const contact = clean(body.contact, 128);
    const childGrade = clean(body.childGrade, 32);
    const mainProblem = clean(body.mainProblem, 255);
    const dailyTime = clean(body.dailyTime, 32);
    const note = clean(body.note, 1000);
    const source = clean(body.source, 64) || 'plan_page';

    if (!contact) {
      return res.status(400).json({ code: 400, msg: '请留下微信或手机号，方便老师联系你' });
    }
    if (!childGrade) {
      return res.status(400).json({ code: 400, msg: '请选择孩子的年级' });
    }

    const data = await insertPlanLead({
      childGrade,
      mainProblem,
      dailyTime,
      contact,
      note,
      source,
      userId: req.user?.id || null,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    return next(err);
  }
});

// Admin: list captured leads.
router.get('/', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const data = await listPlanLeads(200);
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    return next(err);
  }
});

export default router;
