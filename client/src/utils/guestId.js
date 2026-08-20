/**
 * client/src/utils/guestId.js
 *
 * 未登录访客的本机匿名标识，用于留言功能：同一浏览器/设备再次打开时
 * 能看到自己此前提交的留言状态与开发回复。
 */

const GUEST_ID_KEY = 'nest_guest_id';
const GUEST_ID_PATTERN = /^guest_[a-zA-Z0-9]{8,58}$/;

function randomHex(bytes = 16) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID().replace(/-/g, '');
  if (cryptoApi?.getRandomValues) {
    const values = new Uint8Array(bytes);
    cryptoApi.getRandomValues(values);
    return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

export function getOrCreateGuestId() {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(GUEST_ID_KEY);
    if (GUEST_ID_PATTERN.test(existing || '')) return existing;

    const id = `guest_${randomHex()}`.slice(0, 64);
    window.localStorage.setItem(GUEST_ID_KEY, id);
    return id;
  } catch {
    return '';
  }
}
