import { Router } from 'express';

import commentRouter from './feedbackRoutes/comment.js';
import generateRouter from './feedbackRoutes/generate.js';
import readRouter from './feedbackRoutes/read.js';

const router = Router();

router.use(readRouter);
router.use(generateRouter);
router.use(commentRouter);

export default router;
