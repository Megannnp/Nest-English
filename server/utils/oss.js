import './env.js';
import OSS from 'ali-oss';

import { logError } from './logger.js';

let client = null;

function getOSSClient() {
  if (client) return client;

  const { OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET } = process.env;
  if (!OSS_REGION || !OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET) {
    throw new Error('OSS 配置缺失，请检查 OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET');
  }

  client = new OSS({
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
  });

  return client;
}

/**
 * 上传 base64 图片到 OSS
 * @param {string} base64 - 图片 base64 字符串
 * @param {string} mediaType - 图片类型 image/jpeg image/png
 * @param {string} folder - 存储目录 writings/questions
 * @returns {string} 图片 URL
 */
export async function uploadBase64ToOSS(base64, mediaType, folder = 'writings') {
  const oss = getOSSClient();
  const ext = mediaType.split('/')[1] || 'jpg';
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(base64, 'base64');

  const result = await oss.put(filename, buffer, {
    headers: { 'Content-Type': mediaType }
  });

  return result.url;
}

/**
 * 生成临时访问 URL（私有 bucket 用）
 * @param {string} url - OSS 原始 URL
 * @param {number} expires - 有效期秒数，默认1小时
 */
export async function getSignedUrl(ossUrl, expires = 3600) {
  try {
    const oss = getOSSClient();
    const urlObj = new URL(ossUrl);
    const key = urlObj.pathname.slice(1);
    return oss.signatureUrl(key, { expires });
  } catch {
    return ossUrl;
  }
}

/**
 * 删除 OSS 文件
 * @param {string} url - OSS 原始 URL
 */
export async function deleteFromOSS(ossUrl) {
  try {
    const oss = getOSSClient();
    const urlObj = new URL(ossUrl);
    const key = urlObj.pathname.slice(1);
    await oss.delete(key);
  } catch (err) {
    logError('oss_delete_failed', { message: err.message });
  }
}

/**
 * 上传 Buffer 到 OSS（用于公告附件等非 base64 场景）
 * @param {string} key - OSS 对象路径
 * @param {Buffer} buffer - 文件内容
 * @param {string} contentType - MIME 类型
 * @returns {string} 文件访问 URL
 */
export async function uploadBufferToOSS(key, buffer, contentType) {
  const oss = getOSSClient();
  const result = await oss.put(key, buffer, {
    headers: { 'Content-Type': contentType },
  });
  return result.url;
}

/**
 * 按 key 生成临时签名 URL
 * @param {string} key - OSS 对象路径
 * @param {number} expires - 有效期秒数
 */
export function getSignedUrlByKey(key, expires = 3600) {
  const oss = getOSSClient();
  return oss.signatureUrl(key, { expires });
}

/**
 * 按 key 删除 OSS 文件（静默失败，不阻断主流程）
 * @param {string} key - OSS 对象路径
 */
export async function deleteKeyFromOSS(key) {
  try {
    const oss = getOSSClient();
    await oss.delete(key);
  } catch (err) {
    logError('oss_delete_key_failed', { key, message: err.message });
  }
}

/**
 * 返回 OSS 是否已配置（用于条件性降级）
 */
export function isOSSConfigured() {
  const { OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET } = process.env;
  return Boolean(OSS_REGION && OSS_ACCESS_KEY_ID && OSS_ACCESS_KEY_SECRET && OSS_BUCKET);
}
