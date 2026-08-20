import { Router } from 'express';

import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';
import {
  assertAIBudgetAvailable,
  getBudgetOverview,
  listIntegrationAccounts,
  listOperationLogs,
  recordAIUsageEvent,
  listSystemSettings,
  saveBudgetPolicy,
  saveIntegrationAccount,
  saveSystemSetting,
  updateIntegrationStatus,
} from '../services/adminControlService.js';
import {
  deleteAdminQuestionBankQuestion,
  deleteAdminSystemQuestion,
  aiNormalizeAdminQuestionBankQuestions,
  fetchAdminQuestionBankQuestionDetail,
  getAdminQuestionBankMetadata,
  importAdminQuestionBankQuestions,
  importAdminSystemQuestions,
  listAdminMaterials,
  listAdminQuestionBankQuestions,
  listAdminQuestionBankResource,
  listAdminSystemQuestions,
  saveAdminMaterial,
  saveAdminQuestionBankQuestion,
  saveAdminQuestionBankResource,
  updateAdminMaterial,
  updateAdminQuestionBankQuestion,
  updateAdminQuestionBankResource,
  updateAdminSystemQuestionDisabled,
  validateAdminQuestionBankQuestions,
} from '../services/adminQuestionBankService.js';

export const adminControlRouter = Router();

adminControlRouter.use(requireAuth, requireAdmin);

adminControlRouter.get('/budget', async (_req, res, next) => {
  try {
    res.json({ ok: true, data: await getBudgetOverview() });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.post('/budget/policies', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await saveBudgetPolicy(req.body, req.user.id) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.get('/integrations', async (_req, res, next) => {
  try {
    res.json({ ok: true, data: await listIntegrationAccounts() });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.post('/integrations', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await saveIntegrationAccount(req.body, req.user.id) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.put('/integrations/:id/status', async (req, res, next) => {
  try {
    res.json({
      ok: true,
      data: await updateIntegrationStatus({
        id: req.params.id,
        status: req.body?.status,
        adminId: req.user.id,
      }),
    });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.get('/operation-logs', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await listOperationLogs(req.query) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.get('/question-bank', async (req, res, next) => {
  try {
    res.json({
      ok: true,
      data: await listAdminSystemQuestions({
        status: req.query.status,
        keyword: String(req.query.keyword || '').trim(),
      }),
    });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.get('/question-bank/metadata', async (_req, res, next) => {
  try {
    res.json({ ok: true, data: await getAdminQuestionBankMetadata() });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.get('/question-bank/resources/:resource', async (req, res, next) => {
  try {
    res.json({
      ok: true,
      data: await listAdminQuestionBankResource(req.params.resource, {
        keyword: String(req.query.keyword || '').trim(),
      }),
    });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.post('/question-bank/resources/:resource', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await saveAdminQuestionBankResource(req.params.resource, req.body || {}) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.put('/question-bank/resources/:resource/:id', async (req, res, next) => {
  try {
    res.json({
      ok: true,
      data: await updateAdminQuestionBankResource(req.params.resource, req.params.id, req.body || {}),
    });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.get('/question-bank/materials', async (req, res, next) => {
  try {
    res.json({
      ok: true,
      data: await listAdminMaterials({
        keyword: String(req.query.keyword || '').trim(),
        moduleId: String(req.query.moduleId || '').trim(),
      }),
    });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.post('/question-bank/materials', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await saveAdminMaterial(req.body || {}, req.user.id) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.put('/question-bank/materials/:id', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await updateAdminMaterial(req.params.id, req.body || {}, req.user.id) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.get('/question-bank/questions', async (req, res, next) => {
  try {
    res.json({
      ok: true,
      data: await listAdminQuestionBankQuestions({
        keyword: String(req.query.keyword || '').trim(),
        moduleId: String(req.query.moduleId || '').trim(),
        systemId: String(req.query.systemId || '').trim(),
        status: String(req.query.status || '').trim(),
      }),
    });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.get('/question-bank/questions/:id', async (req, res, next) => {
  try {
    const data = await fetchAdminQuestionBankQuestionDetail(req.params.id);
    if (!data) return res.status(404).json({ ok: false, message: '题目不存在' });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.post('/question-bank/questions', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await saveAdminQuestionBankQuestion(req.body || {}, req.user.id) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.post('/question-bank/questions/import', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await importAdminQuestionBankQuestions(req.body || {}, req.user.id) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.post('/question-bank/questions/validate', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await validateAdminQuestionBankQuestions(req.body || {}) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.post('/question-bank/questions/ai-normalize', async (req, res, next) => {
  try {
    await assertAIBudgetAvailable({ feature: 'question_bank_normalize', user: req.user });
    const data = await aiNormalizeAdminQuestionBankQuestions(req.body || {}, req.user.id);
    await recordAIUsageEvent({ feature: 'question_bank_normalize', user: req.user, source: req.requestId });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.put('/question-bank/questions/:id', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await updateAdminQuestionBankQuestion(req.params.id, req.body || {}, req.user.id) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.delete('/question-bank/questions/:id', async (req, res, next) => {
  try {
    await deleteAdminQuestionBankQuestion(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.post('/question-bank/import', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await importAdminSystemQuestions(req.body || {}) });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.put('/question-bank/:id/disabled', async (req, res, next) => {
  try {
    res.json({
      ok: true,
      data: await updateAdminSystemQuestionDisabled({
        id: req.params.id,
        disabled: req.body?.disabled === true,
      }),
    });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.delete('/question-bank/:id', async (req, res, next) => {
  try {
    await deleteAdminSystemQuestion(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.get('/settings', async (_req, res, next) => {
  try {
    res.json({ ok: true, data: await listSystemSettings() });
  } catch (err) {
    next(err);
  }
});

adminControlRouter.put('/settings/:key', async (req, res, next) => {
  try {
    res.json({
      ok: true,
      data: await saveSystemSetting({ ...req.body, key: req.params.key }, req.user.id),
    });
  } catch (err) {
    next(err);
  }
});
