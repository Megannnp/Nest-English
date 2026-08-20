/**
 * utils/nanoid.js — 最终版（无重复声明，适配 Node.js 24+）
 */
// 只导入一次 randomBytes，无重复声明
import { randomBytes } from 'node:crypto';

// 唯一的 ID 生成函数
export function nanoid(size = 21) {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = randomBytes(size);
  let id = '';
  for (let i = 0; i < size; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

// 仅导出一次，无冗余
export default nanoid;