import { Router } from 'express';

import {
  getQuestionAnalysisQueueMetrics as getQuestionAnalysisQueueMetricsViaService,
  startQuestionAnalysisRecoveryLoop as startQuestionAnalysisRecoveryLoopViaService,
} from '../services/questionAnalysisQueueService.js';
import analysisRouter from './writingRoutes/analysis.js';
import manageRouter from './writingRoutes/manage.js';
import queryRouter from './writingRoutes/query.js';
import submissionRouter from './writingRoutes/submission.js';

const router = Router();

export function startQuestionAnalysisRecoveryLoop() {
  return startQuestionAnalysisRecoveryLoopViaService();
}

export function getQuestionAnalysisQueueMetrics() {
  return getQuestionAnalysisQueueMetricsViaService();
}

router.use(submissionRouter);
router.use(analysisRouter);
router.use(manageRouter);
router.use(queryRouter);

export default router;
