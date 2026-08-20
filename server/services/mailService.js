import nodemailer from 'nodemailer';

import { AppError } from '../utils/appError.js';
import { logWarn } from '../utils/logger.js';

const DEV = process.env.NODE_ENV !== 'production';
const TEST = process.env.NODE_ENV === 'test';

const SMTP_HOST = String(process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').trim()
  ? process.env.SMTP_SECURE === 'true'
  : SMTP_PORT === 465;
const SMTP_USER = String(process.env.SMTP_USER || '').trim();
const SMTP_PASS = String(process.env.SMTP_PASS || '').trim();
const SMTP_FROM_NAME = String(process.env.SMTP_FROM_NAME || 'NEST Writing').trim();
const SMTP_FROM_EMAIL = String(process.env.SMTP_FROM_EMAIL || SMTP_USER).trim();

let transporter = null;
let warnedMissingConfig = false;

function hasSmtpConfig() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM_EMAIL);
}

function assertSmtpConfigured() {
  if (hasSmtpConfig()) return;

  if (DEV || TEST) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      logWarn('smtp_missing_config', {
        message: 'SMTP 未配置，邮箱验证码当前不会真实发出，仅适用于开发/测试环境',
      });
    }
    return;
  }

  throw new AppError('未配置 SMTP 邮件服务，邮箱验证码暂不可用', {
    status: 500,
    code: 'SMTP_CONFIG_ERROR',
  });
}

function createTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

export function buildVerificationEmail({ code, expiresMinutes = 10 }) {
  const subject = 'NEST 密码重置验证码';
  const text = [
    '你正在重置 NEST 账号密码。',
    `验证码：${code}`,
    `有效期：${expiresMinutes} 分钟`,
    '如果这不是你的操作，请忽略本邮件。',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.7;color:#2b2118;">
      <h2 style="margin:0 0 16px;color:#9a641c;">NEST 密码重置</h2>
      <p style="margin:0 0 12px;">你正在重置 NEST 账号密码。</p>
      <p style="margin:0 0 12px;">验证码如下：</p>
      <div style="display:inline-block;padding:12px 18px;border-radius:12px;background:#f7efe3;border:1px solid #e7d2b1;font-size:28px;font-weight:700;letter-spacing:6px;color:#6e4310;">
        ${code}
      </div>
      <p style="margin:16px 0 8px;">验证码有效期 <strong>${expiresMinutes} 分钟</strong>。</p>
      <p style="margin:0;color:#7a6b58;">如果这不是你的操作，请忽略本邮件。</p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendVerificationEmail({ to, code, expiresMinutes = 10 }) {
  assertSmtpConfigured();

  if (!hasSmtpConfig()) {
    return {
      skipped: true,
      reason: 'smtp_not_configured',
    };
  }

  const client = createTransporter();
  const { subject, text, html } = buildVerificationEmail({ code, expiresMinutes });

  await client.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
    to,
    subject,
    text,
    html,
  });

  return {
    skipped: false,
  };
}
