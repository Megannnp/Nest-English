import { createHmac, randomBytes } from 'node:crypto';
import { request } from 'node:https';

import { AppError } from '../utils/appError.js';
import { logError } from '../utils/logger.js';

const DEV = process.env.NODE_ENV !== 'production';

function percentEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

// Aliyun RPC v1 signature (HMAC-SHA1)
function buildAliyunRequest({ phone, code }) {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

  const params = {
    Format: 'JSON',
    Version: '2017-05-25',
    AccessKeyId: accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    SignatureVersion: '1.0',
    SignatureNonce: randomBytes(16).toString('hex'),
    Action: 'SendSms',
    PhoneNumbers: phone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
  };

  const sortedKeys = Object.keys(params).sort();
  const canonicalQuery = sortedKeys
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalQuery)}`;
  const signature = createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');

  return `/?${canonicalQuery}&Signature=${percentEncode(signature)}`;
}

function httpsGet(path) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: 'dysmsapi.aliyuncs.com', path, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve({ Code: 'ParseError', Message: body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function isSmsConfigured() {
  return !!(
    process.env.ALIYUN_SMS_ACCESS_KEY_ID &&
    process.env.ALIYUN_SMS_ACCESS_KEY_SECRET &&
    process.env.ALIYUN_SMS_SIGN_NAME &&
    process.env.ALIYUN_SMS_TEMPLATE_CODE
  );
}

/**
 * Sends a 6-digit verification code to the given phone number.
 * In dev mode without SMS credentials, skips the actual send and returns the code directly.
 */
export async function sendSmsCode(phone, code) {
  if (!isSmsConfigured()) {
    if (DEV) {
      // dev: skip real send, caller will surface devCode
      return;
    }
    throw new AppError('短信服务暂未配置', { status: 503, code: 'SMS_NOT_CONFIGURED' });
  }

  const path = buildAliyunRequest({ phone, code });
  let result;
  try {
    result = await httpsGet(path);
  } catch (err) {
    logError('sms_send_error', { phone, message: err.message });
    throw new AppError('短信发送失败，请稍后重试', { status: 503, code: 'SMS_SEND_FAILED' });
  }

  if (result.Code !== 'OK') {
    logError('sms_send_failed', { phone, code: result.Code, message: result.Message });
    throw new AppError('短信发送失败，请稍后重试', { status: 503, code: 'SMS_SEND_FAILED' });
  }
}
