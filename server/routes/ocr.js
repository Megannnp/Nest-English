import { Router } from 'express';
import multer from 'multer';

import { enforceGuestAIBudget } from '../middleware/aiGuestBudget.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from '../services/adminControlService.js';
import { recognizeTextFromImage } from '../services/aiOcrService.js';
import {
  classifyAIError,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../services/aiProviderService.js';
import { logError } from '../utils/logger.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(new Error('仅支持 PNG、JPG/JPEG、WEBP 图片'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

function handleUploadError(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, msg: '图片不能超过10MB' });
  }
  return res.status(400).json({ success: false, msg: err.message || '图片上传失败' });
}

router.post(
  '/reading',
  optionalAuth,
  enforceGuestAIBudget('recognize_text'),
  upload.single('file'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, msg: '请上传图片文件' });
      }

      await ensureAICircuitAvailable('recognize_text');
      await assertAIBudgetAvailable({ feature: 'recognize_text', user: req.user });
      const { text } = await recognizeTextFromImage({
        image: {
          base64: req.file.buffer.toString('base64'),
          mediaType: req.file.mimetype,
          name: req.file.originalname,
        },
        type: 'reading_passage',
      });
      await recordAISuccess('recognize_text');
      await recordAIUsageEvent({ feature: 'recognize_text', user: req.user, source: req.requestId });
      return res.json({ success: true, text });
    } catch (err) {
      if (err.status && err.status < 500) {
        return res.status(err.status).json({ success: false, msg: err.message });
      }
      const errorInfo = classifyAIError(err);
      void recordAIFailure(err, 'recognize_text');
      logError('reading_ocr_failed', {
        errorCode: errorInfo.code,
        message: err.message,
        requestId: req.requestId,
        userId: req.user?.id,
      });
      return res.status(errorInfo.status).json({
        success: false,
        msg: process.env.NODE_ENV === 'production' ? '图片识别失败，请稍后重试' : `图片识别失败：${err.message}`,
        errorCode: errorInfo.code,
      });
    }
  },
);

export default router;
