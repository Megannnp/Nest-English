import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import { getDatabaseHealth, isDatabaseReady } from './db/database.js';
import { accessLogger } from './middleware/accessLogger.js';
import { requireAuth, requireTeacher } from './middleware/authMiddleware.js';
import { csrfProtection } from './middleware/csrfProtection.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestContext } from './middleware/requestContext.js';
import { adminRouter } from './routes/admin.js';
import { adminControlRouter } from './routes/adminControl.js';
import { adminStatsRouter } from './routes/adminStats.js';
import aiRouter from './routes/ai.js';
import { announcementRouter, messageRouter } from './routes/announcements.js';
import assignmentsRouter from './routes/assignments.js';
import assignmentTasksRouter from './routes/assignmentTasks.js';
import authRouter from './routes/auth.js';
import batchGradingRouter from './routes/batchGrading.js';
import campRouter from './routes/camp.js';
import classesRouter from './routes/classes.js';
import examImportRouter from './routes/examImport.js';
import feedbackRouter from './routes/feedback.js';
import grammarRouter from './routes/grammar.js';
import listeningRouter from './routes/listening.js';
import moduleAssignmentsRouter from './routes/moduleAssignments.js';
import ocrRouter from './routes/ocr.js';
import parentRouter from './routes/parent.js';
import paymentsRouter from './routes/payments.js';
import phoneticsRouter from './routes/phonetics.js';
import planLeadsRouter from './routes/planLeads.js';
import questionsRouter from './routes/questions.js';
import readingRouter from './routes/reading.js';
import speakingRouter from './routes/speaking.js';
import teacherDataRouter from './routes/teacherData.js';
import teacherWorkbenchRouter from './routes/teacherWorkbench.js';
import ttsRouter from './routes/tts.js';
import usersRouter from './routes/users.js';
import vocabularyRouter from './routes/vocabulary.js';
import writingsRouter from './routes/writings.js';
import {
  buildObservabilityMetricsSnapshot,
  buildObservabilitySnapshot,
  isInternalObservabilityEnabled,
} from './services/observabilityService.js';
import { logAudit } from './utils/logger.js';
import { buildMessageRateLimitKey } from './utils/rateLimitKeys.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV = process.env.NODE_ENV !== 'production';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://nestenglish.com')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
// 任意一个 allowed origin 使用 http:// 时，关闭强制 HTTPS 的安全头，
// 以便 IP 直连或内测 HTTP 环境正常访问。
const HTTPS_ONLY = ALLOWED_ORIGINS.every((o) => o.startsWith('https://'));

function isLocalDevRequest(req) {
  if (!DEV) return false;
  const forwardedFor = req.headers['x-forwarded-for'];
  const candidate = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : (forwardedFor || req.ip || req.socket?.remoteAddress || '');

  return ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].some((value) =>
    String(candidate).includes(value)
  );
}

function isReadOnlyRequest(req) {
  return ['GET', 'HEAD', 'OPTIONS'].includes(String(req.method || '').toUpperCase());
}

function allowInternalObservability(req, res, next) {
  const enabled = isInternalObservabilityEnabled();
  const allowed = DEV ? (enabled && isLocalDevRequest(req)) : enabled;
  if (allowed) {
    return next();
  }
  return res.status(404).json({ code: 404, msg: 'Not Found' });
}

function createRateLimitExceededHandler(scope) {
  return (req, res) => {
    logAudit('rate_limit_exceeded', {
      scope,
      requestId: req.requestId || null,
      method: req.method,
      path: req.originalUrl || req.url,
      userId: req.user?.id || null,
      role: req.user?.role || null,
      ip: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    });
    return res.status(429).json({ code: 429, msg: scope === 'auth' ? '登录尝试太频繁，请稍后再试' : '请求太频繁，请稍后再试' });
  };
}

function urlOrigin(value) {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}

function buildOssImageOrigins() {
  const { OSS_BUCKET, OSS_REGION } = process.env;
  const configured = [
    process.env.OSS_PUBLIC_BASE_URL,
    process.env.CDN_URL,
    process.env.COURSE_IMAGE_BASE_URL,
  ].map(urlOrigin).filter(Boolean);
  const defaultOss = OSS_BUCKET && OSS_REGION
    ? [`http://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`, `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`]
    : [];
  return [...new Set([...configured, ...defaultOss])];
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.set('etag', false);
  const manualPaymentQrOrigin = urlOrigin(process.env.MANUAL_PAYMENT_QR_URL);
  const ossImageOrigins = buildOssImageOrigins();
  // CSP is applied only on production to avoid blocking Vite HMR / DevTools
  // in development.  The policy is deliberately explicit rather than absent:
  // it blocks inline script injection (XSS second-layer defence) while
  // permitting the SPA's own origins and the Volcengine AI endpoint.
  const cspDirectives = process.env.NODE_ENV === 'production'
    ? {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],   // needed for CSS-in-JS / Vite chunks
        imgSrc: ["'self'", 'data:', 'blob:', ...(manualPaymentQrOrigin ? [manualPaymentQrOrigin] : []), ...ossImageOrigins],
        connectSrc: [
          "'self'",
          ...(process.env.AI_BASE_URL ? [new URL(process.env.AI_BASE_URL).origin] : []),
        ],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        // 仅在全站 HTTPS 时才开启强制升级，HTTP 环境（如 IP 直连内测）下关闭
        ...(HTTPS_ONLY ? { upgradeInsecureRequests: [] } : {}),
      }
    : false;

  app.use(helmet({
    // HSTS 只在全站 HTTPS 时开启，HTTP 环境下不下发该头，避免浏览器锁定 HTTPS
    hsts: (process.env.NODE_ENV === 'production' && HTTPS_ONLY)
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
    contentSecurityPolicy: cspDirectives
      ? { directives: cspDirectives }
      : false,
  }));

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isLocalDevRequest,
    handler: createRateLimitExceededHandler('ai'),
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isLocalDevRequest,
    handler: createRateLimitExceededHandler('auth'),
  });

  const ttsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isLocalDevRequest,
    handler: createRateLimitExceededHandler('tts'),
  });

  const writingsLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isLocalDevRequest(req) || isReadOnlyRequest(req),
    keyGenerator: (req) => req.user?.id || req.ip || '',
    validate: { keyGeneratorIpFallback: false },
    handler: createRateLimitExceededHandler('writings'),
  });

  const parentBindLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isLocalDevRequest,
    keyGenerator: (req) => `${req.user?.id || 'anon'}:${req.ip || ''}`,
    validate: { keyGeneratorIpFallback: false },
    handler: createRateLimitExceededHandler('parent_bind'),
  });

  const messageLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isLocalDevRequest(req) || isReadOnlyRequest(req),
    keyGenerator: buildMessageRateLimitKey,
    validate: { keyGeneratorIpFallback: false },
    handler: createRateLimitExceededHandler('messages'),
  });

  const planLeadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isLocalDevRequest(req) || isReadOnlyRequest(req),
    keyGenerator: (req) => req.ip || 'unknown',
    validate: false,
    handler: createRateLimitExceededHandler('plan-leads'),
  });

  const ocrLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isLocalDevRequest,
    handler: createRateLimitExceededHandler('ocr'),
  });

  const grammarLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isLocalDevRequest,
    handler: createRateLimitExceededHandler('grammar'),
  });

  app.use(requestContext);
  app.use(accessLogger);
  // 4 MB is sufficient for the largest AI payloads (base64 handwriting images).
  // 12 MB was unnecessarily broad and increased the attack surface.
  app.use(express.json({ limit: '4mb', strict: false }));
  app.use(express.urlencoded({ extended: true, limit: '4mb' }));

  app.use(cors({
    origin: DEV
      ? ['http://localhost:5173', 'http://127.0.0.1:5173']
      : ALLOWED_ORIGINS,
    credentials: true,
    exposedHeaders: ['X-Accel-Buffering', 'Cache-Control', 'Connection'],
    maxAge: 86400,
  }));

  app.use('/api/ai', (req, res, next) => {
    if (!res.flush) res.flush = function() {};
    next();
  });

  app.use('/api', csrfProtection);

  app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    if (req.path.startsWith('/ai') || req.path.startsWith('/grammar') || req.path.startsWith('/ocr') || req.path.startsWith('/reading') || req.path.startsWith('/tts')) return next();
    if (isDatabaseReady()) return next();

    return res.status(503).json({
      code: 503,
      msg: '服务暂时不可用，数据库连接未就绪，请稍后重试',
      detail: getDatabaseHealth().error || '数据库初始化失败',
    });
  });

  app.use('/api/tts', ttsLimiter);
  app.use('/api/ai', aiLimiter);
  app.use('/api/auth', authLimiter);
  app.use('/api/writings', writingsLimiter);
  app.post('/api/parent/children', requireAuth, parentBindLimiter);
  app.use('/api/messages', messageLimiter);
  app.use('/api/plan-leads', planLeadLimiter);
  app.use('/api/ocr', ocrLimiter);
  app.use('/api/grammar', grammarLimiter);

  app.use('/api/admin', adminRouter);
  app.use('/api/admin', adminStatsRouter);
  app.use('/api/admin', adminControlRouter);
  app.use('/api/announcements', announcementRouter);
  app.use('/api/messages', messageRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/camp', campRouter);
  app.use('/api/questions', questionsRouter);
  app.use('/api/writings', writingsRouter);
  app.use('/api/classes', classesRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/assignment-tasks', assignmentTasksRouter);
  app.use('/api/module-assignments', moduleAssignmentsRouter);
  app.use('/api/parent', parentRouter);
  app.use('/api/plan-leads', planLeadsRouter);
  app.use('/api', batchGradingRouter);
  app.use('/api/teacher/data', teacherDataRouter);
  app.use('/api/teacher/workbench', teacherWorkbenchRouter);
  app.use('/api', feedbackRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/grammar', grammarRouter);
  app.use('/api/listening', listeningRouter);
  app.use('/api/ocr', ocrRouter);
  app.use('/api/phonetics', phoneticsRouter);
  app.use('/api/reading', readingRouter);
  app.use('/api/speaking', speakingRouter);
  app.use('/api/tts', ttsRouter);
  app.use('/api/exam-import', examImportRouter);
  app.use('/api/vocabulary', vocabularyRouter);

  app.get('/api/health', (_req, res) => {
    res.json({
      code: 200,
      msg: 'ok',
      timestamp: Date.now(),
      ready: isDatabaseReady(),
    });
  });

  app.get('/api/health/details', (req, res, next) => {
    allowInternalObservability(req, res, next);
  }, requireAuth, requireTeacher, (req, res) => {
    if (!DEV && !isDatabaseReady()) {
      return res.status(503).json({
        code: 503,
        msg: '数据库尚未就绪',
        ready: false,
      });
    }

    const snapshot = buildObservabilitySnapshot();
    return res.json({
      code: 200,
      msg: 'ok',
      ...snapshot,
      requester: {
        id: req.user.id,
        role: req.user.role,
      },
    });
  });

  app.get('/api/health/metrics', (req, res, next) => {
    allowInternalObservability(req, res, next);
  }, requireAuth, requireTeacher, (req, res) => {
    return res.json({
      code: 200,
      msg: 'ok',
      metrics: buildObservabilityMetricsSnapshot(),
      requester: {
        id: req.user.id,
        role: req.user.role,
      },
    });
  });

  // Catch unmatched /api/* routes before static serving — prevents Express
  // returning HTML 404 which the frontend can't parse as JSON.
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ code: 404, msg: '接口不存在' });
  });

  const clientDist = path.join(__dirname, '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'), (err) => {
        if (err) res.status(500).send('Server Error');
      });
    });
  }

  app.use(errorHandler);
  return app;
}
