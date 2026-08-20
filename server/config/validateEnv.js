import { AppError } from '../utils/appError.js';

function isBlank(value) {
  return String(value ?? '').trim() === '';
}

function isValidBinaryFlag(value) {
  return value === '' || value === '0' || value === '1' || value == null;
}

export function getMissingProductionEnv(env = process.env) {
  const requiredNames = [
    'MYSQL_PASSWORD',
    'JWT_SECRET',
    'REDIS_URL',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM_EMAIL',
    'AI_DEFAULT_MODEL',
    'AI_API_KEY',
    'MANUAL_PAYMENT_QR_URL',
  ];

  return requiredNames.filter((name) => isBlank(env[name]));
}

export function validateProductionEnv(env = process.env) {
  if (env.NODE_ENV !== 'production') {
    return { ok: true, skipped: true, missing: [] };
  }

  const missing = getMissingProductionEnv(env);
  if (missing.length) {
    throw new AppError(`生产环境配置缺失：${missing.join(', ')}`, {
      status: 500,
      code: 'ENV_CONFIG_ERROR',
      expose: false,
      details: { missing },
    });
  }

  const initMode = String(env.DB_INIT_MODE || '').trim();
  if (initMode && !['migrate', 'connect'].includes(initMode)) {
    throw new AppError('DB_INIT_MODE 只能是 migrate 或 connect', {
      status: 500,
      code: 'ENV_CONFIG_ERROR',
      expose: false,
      details: { invalid: { DB_INIT_MODE: initMode } },
    });
  }

  const internalMetricsEnabled = String(env.INTERNAL_METRICS_ENABLED || '').trim();
  if (!isValidBinaryFlag(internalMetricsEnabled)) {
    throw new AppError('INTERNAL_METRICS_ENABLED 只能是 0 或 1', {
      status: 500,
      code: 'ENV_CONFIG_ERROR',
      expose: false,
      details: { invalid: { INTERNAL_METRICS_ENABLED: internalMetricsEnabled } },
    });
  }

  const embeddedWorker = String(env.QUESTION_ANALYSIS_EMBEDDED_WORKER || '').trim();
  if (!isValidBinaryFlag(embeddedWorker)) {
    throw new AppError('QUESTION_ANALYSIS_EMBEDDED_WORKER 只能是 0 或 1', {
      status: 500,
      code: 'ENV_CONFIG_ERROR',
      expose: false,
      details: { invalid: { QUESTION_ANALYSIS_EMBEDDED_WORKER: embeddedWorker } },
    });
  }

  return { ok: true, skipped: false, missing: [] };
}
