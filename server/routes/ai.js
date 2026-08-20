import { Router } from 'express';

import { getAICircuitMetrics } from '../services/aiProviderService.js';
import completeRouter from './aiRoutes/complete.js';
import ocrRouter from './aiRoutes/ocr.js';
import questionAnalysisRouter from './aiRoutes/questionAnalysis.js';
import tagsRouter from './aiRoutes/tags.js';

const router = Router();

router.use(completeRouter);
router.use(tagsRouter);
router.use(ocrRouter);
router.use(questionAnalysisRouter);

export { getAICircuitMetrics };
export default router;
