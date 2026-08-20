/**
 * client/src/api/admin.js
 */

import { apiCall, csrfHeaderForOptions } from './client.js';

export function fetchAdminAnnouncements() {
  return apiCall('/admin/announcements');
}

export function createAdminAnnouncement(title, body) {
  return apiCall('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  });
}

export async function uploadAdminFile(announcementId, file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`/api/admin/announcements/${announcementId}/file`, {
    method: 'POST',
    headers: csrfHeaderForOptions({ method: 'POST' }),
    credentials: 'include',
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function deleteAdminAnnouncement(id) {
  return apiCall(`/admin/announcements/${id}`, { method: 'DELETE' });
}

export function fetchAdminMessages(status = '') {
  const q = status ? `?status=${status}` : '';
  return apiCall(`/admin/messages${q}`);
}

export function replyAdminMessage(id, reply) {
  return apiCall(`/admin/messages/${id}/reply`, {
    method: 'PUT',
    body: JSON.stringify({ reply }),
  });
}

export function reviewAdminMessage(id, status) {
  return apiCall(`/admin/messages/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function fetchAdminDashboard(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return apiCall(`/admin/stats/dashboard${query ? `?${query}` : ''}`);
}

export function fetchAdminUsers(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return apiCall(`/admin/users${query ? `?${query}` : ''}`);
}

export function fetchAdminUserDetail(id) {
  return apiCall(`/admin/users/${id}`);
}

export function updateAdminUserStatus(id, disabled) {
  return apiCall(`/admin/users/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ disabled }),
  });
}

export function fetchAdminBudget() {
  return apiCall('/admin/budget');
}

export function saveAdminBudgetPolicy(policy) {
  return apiCall('/admin/budget/policies', {
    method: 'POST',
    body: JSON.stringify(policy),
  });
}

export function fetchAdminIntegrations() {
  return apiCall('/admin/integrations');
}

export function saveAdminIntegration(account) {
  return apiCall('/admin/integrations', {
    method: 'POST',
    body: JSON.stringify(account),
  });
}

export function updateAdminIntegrationStatus(id, status) {
  return apiCall(`/admin/integrations/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function fetchAdminOperationLogs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return apiCall(`/admin/operation-logs${query ? `?${query}` : ''}`);
}

export function generateAdminAudio(payload) {
  return apiCall('/tts/admin/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: 60000,
  });
}

export function fetchAdminPaymentOrders(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return apiCall(`/payments/admin/orders${query ? `?${query}` : ''}`);
}

export function confirmAdminPaymentOrder(id) {
  return apiCall(`/payments/admin/orders/${encodeURIComponent(id)}/confirm`, { method: 'POST' });
}

export function closeAdminPaymentOrder(id) {
  return apiCall(`/payments/admin/orders/${encodeURIComponent(id)}/close`, { method: 'POST' });
}

export function failAdminPaymentOrder(id) {
  return apiCall(`/payments/admin/orders/${encodeURIComponent(id)}/fail`, { method: 'POST' });
}

export function refundAdminPaymentOrder(id) {
  return apiCall(`/payments/admin/orders/${encodeURIComponent(id)}/refund`, { method: 'POST' });
}

export function fetchAdminSettings() {
  return apiCall('/admin/settings');
}

export function saveAdminSetting(setting) {
  return apiCall(`/admin/settings/${encodeURIComponent(setting.key)}`, {
    method: 'PUT',
    body: JSON.stringify(setting),
  });
}

export function fetchAdminQuestionBank(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return apiCall(`/admin/question-bank${query ? `?${query}` : ''}`);
}

export function fetchAdminQuestionBankMetadata() {
  return apiCall('/admin/question-bank/metadata');
}

export function fetchAdminQuestionBankResource(resource, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return apiCall(`/admin/question-bank/resources/${encodeURIComponent(resource)}${query ? `?${query}` : ''}`);
}

export function saveAdminQuestionBankResource(resource, payload) {
  return apiCall(`/admin/question-bank/resources/${encodeURIComponent(resource)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminQuestionBankResource(resource, id, payload) {
  return apiCall(`/admin/question-bank/resources/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function fetchAdminQuestionBankMaterials(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return apiCall(`/admin/question-bank/materials${query ? `?${query}` : ''}`);
}

export function saveAdminQuestionBankMaterial(payload) {
  return apiCall('/admin/question-bank/materials', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminQuestionBankMaterial(id, payload) {
  return apiCall(`/admin/question-bank/materials/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function fetchAdminQuestionBankQuestions(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return apiCall(`/admin/question-bank/questions${query ? `?${query}` : ''}`);
}

export function fetchAdminQuestionBankQuestionDetail(id) {
  return apiCall(`/admin/question-bank/questions/${encodeURIComponent(id)}`);
}

export function saveAdminQuestionBankQuestion(payload) {
  return apiCall('/admin/question-bank/questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function importAdminQuestionBankQuestions(items) {
  return apiCall('/admin/question-bank/questions/import', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function validateAdminQuestionBankQuestions(items) {
  return apiCall('/admin/question-bank/questions/validate', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function aiNormalizeAdminQuestionBankQuestions(payload) {
  return apiCall('/admin/question-bank/questions/ai-normalize', {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: 60000,
  });
}

export function updateAdminQuestionBankQuestion(id, payload) {
  return apiCall(`/admin/question-bank/questions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function importAdminQuestionBank(items) {
  return apiCall('/admin/question-bank/import', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function updateAdminQuestionDisabled(id, disabled) {
  return apiCall(`/admin/question-bank/${encodeURIComponent(id)}/disabled`, {
    method: 'PUT',
    body: JSON.stringify({ disabled }),
  });
}

export function deleteAdminQuestion(id) {
  return apiCall(`/admin/question-bank/questions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
