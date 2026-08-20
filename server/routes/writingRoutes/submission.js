import { Router } from 'express';

import { requireAuth } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validate.js';
import { createWritingSubmission } from '../../services/writingSubmissionService.js';
import { createWritingBodySchema } from '../../utils/schemas/writingSchemas.js';

const router = Router();

router.post('/', requireAuth, validateRequest({ body: createWritingBodySchema }), async (req, res, next) => {
  try {
    const data = await createWritingSubmission({
      user: req.user,
      payload: req.validated.body,
    });
    res.status(201).json({ code: 201, msg: '保存成功', data });
  } catch (err) {
    next(err);
  }
});

export default router;
