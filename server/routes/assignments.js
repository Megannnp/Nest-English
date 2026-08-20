import { Router } from 'express';

import crudRouter from './assignmentRoutes/crud.js';
import exportRouter from './assignmentRoutes/export.js';
import statusRouter from './assignmentRoutes/status.js';

const router = Router();

router.use(crudRouter);
router.use(statusRouter);
router.use(exportRouter);

export default router;
