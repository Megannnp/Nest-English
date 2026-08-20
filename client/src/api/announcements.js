/**
 * client/src/api/announcements.js
 *
 * 通过项目统一的 api/client.js 发请求，不裸写 fetch。
 * client.js 已封装：cookie 会话、超时、错误标准化、下载辅助。
 */

import { apiCall, csrfHeaderForOptions } from './client.js';

// ─── 公告 ────────────────────────────────────────────────────────────────────

/** 首页字幕聚合：最新公告 + 我的留言 */
export function fetchTickerData(guestId) {
  return apiCall('/announcements/ticker', {
    headers: guestId ? { 'X-Guest-Id': guestId } : {},
  });
}

/** 公告列表（完整） */
export function fetchAnnouncements() {
  return apiCall('/announcements');
}

/** 单条公告详情 */
export function fetchAnnouncement(id) {
  return apiCall(`/announcements/${id}`);
}

/** 附件下载 URL（在新 tab 打开，由浏览器触发下载） */
export function getFileDownloadUrl(announcementId) {
  return `/api/announcements/${announcementId}/file`;
}

// ─── 用户留言 ────────────────────────────────────────────────────────────────

/** 提交留言（guestId 仅未登录访客需要） */
export function submitMessage(content, guestId) {
  return apiCall('/messages', {
    method: 'POST',
    body: JSON.stringify({ content, ...(guestId ? { guestId } : {}) }),
  });
}

/** 当前用户自己的留言列表（含回复） */
export function fetchMyMessages(guestId) {
  return apiCall('/messages/mine', {
    headers: guestId ? { 'X-Guest-Id': guestId } : {},
  });
}

// ─── 管理员接口（教师角色调用） ───────────────────────────────────────────────

/** 发布公告 */
export function createAnnouncement(title, body) {
  return apiCall('/announcements', {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  });
}

/**
 * 上传附件（multipart，单独用 fetch，不走 apiCall）
 * file — File 对象（来自 <input type="file">）
 */
export async function uploadAnnouncementFile(announcementId, file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`/api/announcements/${announcementId}/file`, {
    method: 'POST',
    headers: csrfHeaderForOptions({ method: 'POST' }),
    credentials: 'include',
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** 审核留言 */
export function reviewMessage(id, status) {
  return apiCall(`/messages/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

/** 回复留言 */
export function replyToMessage(id, reply) {
  return apiCall(`/messages/${id}/reply`, {
    method: 'PUT',
    body: JSON.stringify({ reply }),
  });
}

/** 删除公告 */
export function deleteAnnouncement(id) {
  return apiCall(`/announcements/${id}`, { method: 'DELETE' });
}
