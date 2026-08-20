/**
 * api/index.js
 */
import { apiCall, apiCallStream, apiDownload, csrfHeaderForOptions, setToken, clearToken, getToken, hasSessionFlag, clearSessionFlag, setUnauthorizedHandler } from './client.js';

// ── Auth ─────────────────────────────────────────────────────────
export const authAPI = {
  register: (payload) =>
    apiCall('/auth/register', { 
      method:'POST', 
      body: JSON.stringify(payload) 
    }),
  login: (account, password) =>
    apiCall('/auth/login', { method:'POST', body: JSON.stringify({ account, password }) }),
  logout: () => apiCall('/auth/logout', { method: 'POST' }),
  me: () => apiCall('/auth/me', { skipUnauthorizedHandler: true }),
  forgotPassword: (account, type) => apiCall('/auth/forgot-password', { 
    method: 'POST', 
    body: JSON.stringify({ account, type }) 
  }),
  resetPassword: (account, type, code, newPassword) => apiCall('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ account, type, code, newPassword })
  }),
  sendPhoneCode: (phone) => apiCall('/auth/send-phone-code', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  }),
  phoneCodeAuth: (phone, code, realName, role) => apiCall('/auth/phone-code-auth', {
    method: 'POST',
    body: JSON.stringify({ phone, code, realName, role }),
  }),
  sendEmailLoginCode: (email) => apiCall('/auth/send-email-login-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  emailCodeAuth: (email, code, realName, role, preferences) => apiCall('/auth/email-code-auth', {
    method: 'POST',
    body: JSON.stringify({ email, code, realName, role, preferences }),
  }),
};

// ── Users ─────────────────────────────────────────────────────────
export const usersAPI = {
  getProfile: () => apiCall('/auth/me', { skipUnauthorizedHandler: true }),
  updateProfile: (payload) =>
    apiCall('/users/profile', { method:'PUT', body: JSON.stringify(payload) }),
  listStudents: () => apiCall('/users'),
  getUser: (id) => apiCall(`/users/${id}`),
  getPointsSummary: () => apiCall('/users/me/points'),
  checkIn: () => apiCall('/users/me/points/check-in', { method: 'POST' }),
  recordLearningEvent: (payload) =>
    apiCall('/users/me/points/learning-events', { method: 'POST', body: JSON.stringify(payload) }),
  claimPendingPoints: () => apiCall('/users/me/points/claim-pending', { method: 'POST' }),
  redeemPoints: (rewardCode) =>
    apiCall('/users/me/points/redeem', { method: 'POST', body: JSON.stringify({ rewardCode }) }),
  getEntitlementLedger: (unit, { limit = 50, offset = 0 } = {}) =>
    apiCall(`/users/me/entitlements/${encodeURIComponent(unit)}/ledger?limit=${limit}&offset=${offset}`),
};

export const paymentsAPI = {
  products: () => apiCall('/payments/products'),
  orders: () => apiCall('/payments/orders'),
  createOrder: (productCode, proofNote = '') =>
    apiCall('/payments/orders', {
      method: 'POST',
      body: JSON.stringify({ productCode, paymentMethod: 'manual_qr', proofNote }),
    }),
  closeOrder: (orderId) => apiCall(`/payments/orders/${encodeURIComponent(orderId)}/close`, { method: 'POST' }),
};

export const planLeadsAPI = {
  submit: (payload) =>
    apiCall('/plan-leads', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipUnauthorizedHandler: true,
    }),
  list: () => apiCall('/plan-leads'),
};

export const campAPI = {
  listCourses: () => apiCall('/camp/courses', { skipUnauthorizedHandler: true }),
  getCourse: (id) => apiCall(`/camp/courses/${encodeURIComponent(id)}`, { skipUnauthorizedHandler: true }),
  mockPay: (id) => apiCall(`/camp/courses/${encodeURIComponent(id)}/mock-pay`, { method: 'POST' }),
  listMyCourses: () => apiCall('/camp/my-courses'),
  getMyCourse: (id) => apiCall(`/camp/my-courses/${encodeURIComponent(id)}`),
  recordProgress: (id, payload) => apiCall(`/camp/my-courses/${encodeURIComponent(id)}/progress`, { method: 'POST', body: JSON.stringify(payload) }),
  redeem: (code) => apiCall('/camp/redeem', { method: 'POST', body: JSON.stringify({ code }) }),
  me: () => apiCall('/camp/me', { skipUnauthorizedHandler: true }),
  adminListCourses: () => apiCall('/camp/admin/courses'),
  adminGetCourse: (id) => apiCall(`/camp/admin/courses/${encodeURIComponent(id)}`),
  adminCreateCourse: (payload) => apiCall('/camp/admin/courses', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateCourse: (id, payload) => apiCall(`/camp/admin/courses/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminSaveContent: (id, payload) => apiCall(`/camp/admin/courses/${encodeURIComponent(id)}/content`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminUploadCover: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const res = await fetch(`/api/camp/admin/courses/${encodeURIComponent(id)}/cover`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...csrfHeaderForOptions({ method: 'POST' }),
      },
      credentials: 'include',
      body: formData,
    });
    const body = await res.json().catch(() => ({ msg: `请求失败 (${res.status})` }));
    if (!res.ok) throw new Error(body.msg || `请求失败 (${res.status})`);
    return body.data !== undefined ? body.data : body;
  },
  adminDuplicateCourse: (id) => apiCall(`/camp/admin/courses/${encodeURIComponent(id)}/duplicate`, { method: 'POST' }),
  adminPublishCourse: (id) => apiCall(`/camp/admin/courses/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
  adminArchiveCourse: (id) => apiCall(`/camp/admin/courses/${encodeURIComponent(id)}/archive`, { method: 'POST' }),
  adminGetOperations: (id) => apiCall(`/camp/admin/courses/${encodeURIComponent(id)}/operations`),
  adminCreateRedemptionCode: (id, payload) => apiCall(`/camp/admin/courses/${encodeURIComponent(id)}/redemption-codes`, { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateRedemptionCode: (id, codeId, payload) => apiCall(`/camp/admin/courses/${encodeURIComponent(id)}/redemption-codes/${encodeURIComponent(codeId)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  teacherListCourses: () => campAPI.adminListCourses(),
  teacherGetCourse: (id) => campAPI.adminGetCourse(id),
  teacherCreateCourse: (payload) => campAPI.adminCreateCourse(payload),
  teacherUpdateCourse: (id, payload) => campAPI.adminUpdateCourse(id, payload),
  teacherSaveContent: (id, payload) => campAPI.adminSaveContent(id, payload),
  teacherDuplicateCourse: (id) => campAPI.adminDuplicateCourse(id),
  teacherPublishCourse: (id) => campAPI.adminPublishCourse(id),
  teacherArchiveCourse: (id) => campAPI.adminArchiveCourse(id),
};

// ── Classes ───────────────────────────────────────────────────────
export const classesAPI = {
  list: () => apiCall('/classes'),
  search: (code) => apiCall(`/classes/search?code=${encodeURIComponent(code)}`),
  create: (className, password) =>
    apiCall('/classes', { method:'POST', body: JSON.stringify({ className, password }) }),
  updatePassword: (classId, password) =>
    apiCall(`/classes/${classId}/password`, { method:'PUT', body: JSON.stringify({ password }) }),
  join: (classId, password) =>
    apiCall(`/classes/${classId}/join`, { method:'POST', body: JSON.stringify({ password }) }),
  bindTeacherClass: (classId) =>
    apiCall(`/classes/${classId}/bind-teacher`, { method:'POST' }),
  getStudents: (classId) => apiCall(`/classes/${classId}/students`),
  getWritings: (classId) => apiCall(`/classes/${classId}/writings`),
  // Roster management
  getRoster: (classId) =>
    apiCall(`/classes/${classId}/roster`),
  getUnmatchedUsers: (classId) =>
    apiCall(`/classes/${classId}/roster/unmatched`),
  importRoster: (classId, items) =>
    apiCall(`/classes/${classId}/roster/import`, { method: 'POST', body: JSON.stringify({ items }) }),
  createAndLinkRosterUser: (classId, userId) =>
    apiCall(`/classes/${classId}/roster/create-and-link`, { method: 'POST', body: JSON.stringify({ userId }) }),
  linkRosterUser: (classId, userId) =>
    apiCall(`/classes/${classId}/roster/link`, { method: 'POST', body: JSON.stringify({ userId }) }),
  linkSpecificRosterUser: (classId, rosterId, userId) =>
    apiCall(`/classes/${classId}/roster/${encodeURIComponent(rosterId)}/link`, { method: 'POST', body: JSON.stringify({ userId }) }),
  unlinkRosterUser: (classId, rosterId) =>
    apiCall(`/classes/${classId}/roster/${encodeURIComponent(rosterId)}`, { method: 'DELETE' }),
};

// ── Questions ─────────────────────────────────────────────────────
export const questionsAPI = {
  list: ({ systemId = '' } = {}) => {
    const params = new URLSearchParams();
    if (systemId) params.set('systemId', systemId);
    const query = params.toString();
    return apiCall(`/questions${query ? `?${query}` : ''}`);
  },
  create: (q) => apiCall('/questions', { method:'POST', body: JSON.stringify(q) }),
  bulkImport: (items) => apiCall('/questions/bulk-import', { method:'POST', body: JSON.stringify({ items }) }),
  duplicate: (id) => apiCall(`/questions/${id}/duplicate`, { method:'POST' }),
  update: (id, q) => apiCall(`/questions/${id}`, { method:'PUT', body: JSON.stringify(q) }),
  delete: (id) => apiCall(`/questions/${id}`, { method:'DELETE' }),
  getTags: () => apiCall('/questions/tags', { method:'GET' }),
};

// ── Assignments ───────────────────────────────────────────────────
export const assignmentsAPI = {
  list: (classId) => apiCall(`/assignments${classId ? `?classId=${encodeURIComponent(classId)}` : ''}`),
  get: (id) => apiCall(`/assignments/${id}`),
  getExportData: (id) => apiCall(`/assignments/${id}/export-data`),
  create: (payload) => apiCall('/assignments', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiCall(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  publish: (id) => apiCall(`/assignments/${id}/publish`, { method: 'POST' }),
  close: (id) => apiCall(`/assignments/${id}/close`, { method: 'POST' }),
  archive: (id) => apiCall(`/assignments/${id}/archive`, { method: 'POST' }),
  export: (id, type = 'detail') => apiDownload(`/assignments/${id}/export?type=${encodeURIComponent(type)}`),
};

export const batchGradingAPI = {
  createJob: (payload) =>
    apiCall('/batch-grading/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  listJobs: ({ limit = 8, filter = 'active', classId = '', assignmentId = '' } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (filter) params.set('filter', filter);
    if (classId) params.set('classId', String(classId));
    if (assignmentId) params.set('assignmentId', String(assignmentId));
    return apiCall(`/batch-grading/jobs${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getJob: (id) => apiCall(`/batch-grading/jobs/${id}`),
  pauseJob: (id) => apiCall(`/batch-grading/jobs/${id}/pause`, { method: 'POST' }),
  resumeJob: (id) => apiCall(`/batch-grading/jobs/${id}/resume`, { method: 'POST' }),
  cancelJob: (id) => apiCall(`/batch-grading/jobs/${id}/cancel`, { method: 'POST' }),
  retryFailed: (id) => apiCall(`/batch-grading/jobs/${id}/retry-failed`, { method: 'POST' }),
  continueIncomplete: (id) => apiCall(`/batch-grading/jobs/${id}/continue-incomplete`, { method: 'POST' }),
};

export const teacherWorkbenchAPI = {
  overview: () => apiCall('/teacher/workbench/overview'),
  drafts: () => apiCall('/teacher/workbench/drafts'),
  dueSoon: () => apiCall('/teacher/workbench/due-soon'),
  gradings: () => apiCall('/teacher/workbench/gradings'),
  pendingComments: () => apiCall('/teacher/workbench/pending-comments'),
  exceptions: () => apiCall('/teacher/workbench/exceptions'),
};

export const teacherDataAPI = {
  overview: () => apiCall('/teacher/data/overview'),
  classDetail: (classId) => apiCall(`/teacher/data/classes/${encodeURIComponent(classId)}`),
};

export const parentAPI = {
  overview: () => apiCall('/parent/overview'),
  childTasks: (childId) => apiCall(`/parent/children/${encodeURIComponent(childId)}/tasks`),
  childProgress: (childId) => apiCall(`/parent/children/${encodeURIComponent(childId)}/progress`),
  childEntitlements: (childId) => apiCall(`/parent/children/${encodeURIComponent(childId)}/entitlements`),
  bindChild: (studentBindCode) =>
    apiCall('/parent/children', {
      method: 'POST',
      body: JSON.stringify({ studentBindCode }),
    }),
  getStudentBindCode: () => apiCall('/parent/student-bind-code'),
  regenerateStudentBindCode: () =>
    apiCall('/parent/student-bind-code/regenerate', { method: 'POST' }),
};

// ── Assignment Tasks ──────────────────────────────────────────────
export const assignmentTasksAPI = {
  listMine: () => apiCall('/assignment-tasks/my'),
  get: (id) => apiCall(`/assignment-tasks/${id}`),
};
// ── Module Assignments ────────────────────────────────────────────
export const moduleAssignmentsAPI = {
  listMine: () => apiCall('/module-assignments/my'),
  submit: (id) => apiCall(`/module-assignments/${id}/submit`, { method: 'POST' }),
  list: ({ moduleType = '', classId = '' } = {}) => {
    const params = new URLSearchParams();
    if (moduleType) params.set('module', moduleType);
    if (classId) params.set('classId', classId);
    const qs = params.toString();
    return apiCall(`/module-assignments${qs ? '?' + qs : ''}`);
  },
  create: (payload) =>
    apiCall('/module-assignments', { method: 'POST', body: JSON.stringify(payload) }),
};


// ── Writings ──────────────────────────────────────────────────────
export const writingsAPI = {
  list: () => apiCall('/writings'),
  listByUser: (uid) => apiCall(`/writings/user/${uid}`),
  get: (id) => apiCall(`/writings/${id}`),
  getTasks: (id) => apiCall(`/writings/${id}/tasks`),
  create: (payload) => apiCall('/writings', { method:'POST', body: JSON.stringify(payload) }),
  delete: (id) => apiCall(`/writings/${id}`, { method:'DELETE' }),
  updateFeedback: (id, feedback) =>
    apiCall(`/writings/${id}/feedback`, { method:'PUT', body: JSON.stringify({ feedback }) }),
  retryQuestionAnalysis: (id) =>
    apiCall(`/writings/${id}/question-analysis/retry`, { method:'POST' }),
  replayQuestionAnalysisDeadLetter: (id) =>
    apiCall(`/writings/${id}/question-analysis/replay-dead-letter`, { method:'POST' }),
};

// ── Feedback ──────────────────────────────────────────────────────
export const feedbackAPI = {
  get: (writingId) => apiCall(`/writings/${writingId}/feedback`),
  getStatus: (writingId) => apiCall(`/writings/${writingId}/feedback/status`),
  requestQuick: (writingId) =>
    apiCall(`/writings/${writingId}/feedback/quick`, { method: 'POST' }),
  requestDetailed: (writingId) =>
    apiCall(`/writings/${writingId}/feedback/detailed`, { method: 'POST' }),
  retryDetailed: (writingId) =>
    apiCall(`/writings/${writingId}/feedback/detailed/retry`, { method: 'POST' }),
  retrySupplemental: (writingId) =>
    apiCall(`/writings/${writingId}/feedback/supplemental/retry`, { method: 'POST' }),
  saveTeacherComment: (writingId, content, annotatedImage) =>
    apiCall(`/writings/${writingId}/feedback/comment`, { method: 'PUT', body: JSON.stringify({ content, annotatedImage }) }),
  streamQuick: (writingId, onChunk, onDone, onError, options = {}) =>
    apiCallStream(
      `/writings/${writingId}/feedback/quick-stream`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, ...options },
      (data) => { if (data.error) { onError?.(data.error); return; } onChunk?.(data); },
      onDone,
      onError,
    ),
};

// ── AI ────────────────────────────────────────────────────────────
export const aiAPI = {
  complete: (payload, options = {}) =>
    apiCall('/ai/complete', { method:'POST', body: JSON.stringify(payload), ...options }),

  questionAnalysis: (payload) =>
    apiCall('/ai/question-analysis', { method:'POST', body: JSON.stringify(payload) }),

  // 修复：简化流式处理，直接透传后端返回的 chunk/complete/done 格式
  completeStream: (payload, onChunk, onDone, onError) => {
    return apiCallStream(
      '/ai/complete-stream',
      {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      },
      // onChunk：直接透传后端返回的数据 {chunk, complete, done}
      (data) => {
        if (data.error) {
          onError?.(data.error);
          return;
        }
        // 直接调用 onChunk，让组件自己处理 data.chunk / data.complete / data.done
        onChunk?.(data);
      },
      // onDone
      () => {
        onDone?.();
      },
      // onError
      (err) => {
        console.error('AI Stream Error:', err);
        onError?.(typeof err === 'string' ? err : (err?.message || 'AI 流式接口调用失败'));
      }
    );
  },

  analyzeTags: (payload) =>
    apiCall('/ai/analyze-tags', { method:'POST', body: JSON.stringify(payload) }),

  recognizeText: (payload) =>
    apiCall('/ai/recognize-text', { method:'POST', body: JSON.stringify(payload) }),
};

// ── Writing progress ──────────────────────────────────────────────
export const writingProgressAPI = {
  progress: () => apiCall('/writings/progress'),
  saveStructureProgress: (payload) =>
    apiCall('/writings/structure/progress', { method: 'POST', body: JSON.stringify(payload) }),
  favorites: (limit = 50) => apiCall(`/writings/favorites?limit=${encodeURIComponent(limit)}`),
  saveFavorite: (payload) =>
    apiCall('/writings/favorites', { method: 'POST', body: JSON.stringify(payload) }),
};

// ── Reading ───────────────────────────────────────────────────────
export const readingAPI = {
  analyze: (payload) =>
    apiCall('/reading/analyze', { method: 'POST', body: JSON.stringify(payload), timeoutMs: 60000 }),
  generateQuiz: (payload) =>
    apiCall('/reading/quiz', { method: 'POST', body: JSON.stringify(payload), timeoutMs: 60000 }),
  practicePassages: ({ genre = '随机', count = 100, systemId = '' } = {}) => {
    const params = new URLSearchParams({ genre: String(genre), count: String(count) });
    if (systemId) params.set('systemId', systemId);
    return apiCall(`/reading/practice/passages?${params.toString()}`);
  },
  practiceQuestions: ({ type = '随机', count = 100, systemId = '' } = {}) => {
    const params = new URLSearchParams({ type: String(type), count: String(count) });
    if (systemId) params.set('systemId', systemId);
    return apiCall(`/reading/practice/questions?${params.toString()}`);
  },
  recordPractice: (payload) =>
    apiCall('/reading/practice/records', { method: 'POST', body: JSON.stringify(payload) }),
  practiceProgress: () =>
    apiCall('/reading/practice/progress'),
  courseProgress: () =>
    apiCall('/reading/courses/progress'),
  saveCourseProgress: (payload) =>
    apiCall('/reading/courses/progress', { method: 'POST', body: JSON.stringify(payload) }),
  analysisDetail: (analysisId) =>
    apiCall(`/reading/analyses/${encodeURIComponent(analysisId)}`),
  teacherClassProgress: (classId) =>
    apiCall(`/reading/teacher/class-progress?classId=${encodeURIComponent(classId)}`),
  recognizeImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/ocr/reading', {
      method: 'POST',
      headers: csrfHeaderForOptions({ method: 'POST' }),
      credentials: 'include',
      body: formData,
    });
    const body = await res.json().catch(() => ({ msg: `服务器错误 (${res.status})` }));
    if (!res.ok) {
      throw new Error(body.msg || body.error || `图片识别失败 (${res.status})`);
    }
    return body.data !== undefined ? body.data : body;
  },
};

// ── Listening ─────────────────────────────────────────────────────
export const listeningAPI = {
  content: ({ systemId = '' } = {}) => {
    const params = new URLSearchParams();
    if (systemId) params.set('systemId', systemId);
    return apiCall(`/listening/content${params.toString() ? `?${params.toString()}` : ''}`, { skipUnauthorizedHandler: true });
  },
  recordProgress: (payload) =>
    apiCall('/listening/progress/records', { method: 'POST', body: JSON.stringify(payload) }),
  progress: () =>
    apiCall('/listening/progress'),
  teacherClassProgress: (classId) =>
    apiCall(`/listening/teacher/class-progress?classId=${encodeURIComponent(classId)}`),
};

// ── Speaking ──────────────────────────────────────────────────────
export const speakingAPI = {
  questions: (limit = 20, { systemId = '' } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (systemId) params.set('systemId', systemId);
    return apiCall(`/speaking/questions?${params.toString()}`, { skipUnauthorizedHandler: true });
  },
  recordProgress: (payload) =>
    apiCall('/speaking/progress/records', { method: 'POST', body: JSON.stringify(payload) }),
  progress: () =>
    apiCall('/speaking/progress'),
  teacherClassProgress: (classId) =>
    apiCall(`/speaking/teacher/class-progress?classId=${encodeURIComponent(classId)}`),
};

// ── Vocabulary ────────────────────────────────────────────────────
export const vocabularyAPI = {
  recordProgress: (payload) =>
    apiCall('/vocabulary/progress/records', { method: 'POST', body: JSON.stringify(payload) }),
  progress: () =>
    apiCall('/vocabulary/progress'),
  teacherClasses: () =>
    apiCall('/vocabulary/teacher/classes'),
  teacherClassProgress: (classId) =>
    apiCall(`/vocabulary/teacher/class-progress?classId=${encodeURIComponent(classId)}`),
  favorites: () =>
    apiCall('/vocabulary/favorites'),
  saveFavorite: (payload) =>
    apiCall('/vocabulary/favorites', { method: 'POST', body: JSON.stringify(payload) }),
  analyzeWord: (word) =>
    apiCall('/vocabulary/analyze', { method: 'POST', body: JSON.stringify({ word }), timeoutMs: 60000 }),
  courseProgress: () =>
    apiCall('/vocabulary/courses/progress'),
  saveCourseProgress: (payload) =>
    apiCall('/vocabulary/courses/progress', { method: 'POST', body: JSON.stringify(payload) }),
  content: ({ systemId = '' } = {}) => {
    const params = new URLSearchParams();
    if (systemId) params.set('systemId', systemId);
    return apiCall(`/vocabulary/content${params.toString() ? `?${params.toString()}` : ''}`, { skipUnauthorizedHandler: true });
  },
  saveContent: (payload) =>
    apiCall('/vocabulary/content', { method: 'PUT', body: JSON.stringify(payload) }),
};

// ── Phonetics ─────────────────────────────────────────────────────
export const phoneticsAPI = {
  analyzeText: (payload) =>
    apiCall('/phonetics/analyze', { method: 'POST', body: JSON.stringify(payload), timeoutMs: 120000 }),
  analyzeWord: (payload) =>
    apiCall('/phonetics/word', { method: 'POST', body: JSON.stringify(payload), timeoutMs: 60000 }),
  recordProgress: (payload) =>
    apiCall('/phonetics/progress/records', { method: 'POST', body: JSON.stringify(payload) }),
  progress: () =>
    apiCall('/phonetics/progress'),
  teacherClassProgress: (classId) =>
    apiCall(`/phonetics/teacher/class-progress?classId=${encodeURIComponent(classId)}`),
};

// ── Grammar ───────────────────────────────────────────────────────
export const grammarAPI = {
  analyzeSentence: (payload) =>
    apiCall('/grammar/analyze', { method: 'POST', body: JSON.stringify(payload) }),
  generateQuiz: (payload) =>
    apiCall('/grammar/quiz', { method: 'POST', body: JSON.stringify(payload) }),
  generatePractice: (payload) =>
    apiCall('/grammar/practice', { method: 'POST', body: JSON.stringify(payload), timeoutMs: 60000 }),
  analyzeSentenceTree: (payload) =>
    apiCall('/grammar/tree', { method: 'POST', body: JSON.stringify(payload) }),
  record: (payload) =>
    apiCall('/grammar/record', { method: 'POST', body: JSON.stringify(payload) }),
  progress: () =>
    apiCall('/grammar/progress'),
  myTasks: () =>
    apiCall('/grammar/tasks/my'),
  submitTask: (id, payload) =>
    apiCall(`/grammar/tasks/${encodeURIComponent(id)}/submit`, { method: 'POST', body: JSON.stringify(payload) }),
  teacherClasses: () =>
    apiCall('/grammar/teacher/classes'),
  teacherClassProgress: (classId) =>
    apiCall(`/grammar/teacher/class-progress?classId=${encodeURIComponent(classId)}`),
  teacherAssignments: (classId = '') =>
    apiCall(`/grammar/teacher/assignments${classId ? `?classId=${encodeURIComponent(classId)}` : ''}`),
  teacherAssignmentSubmissions: (id) =>
    apiCall(`/grammar/teacher/assignments/${encodeURIComponent(id)}/submissions`),
  createTeacherAssignment: (payload) =>
    apiCall('/grammar/teacher/assignments', { method: 'POST', body: JSON.stringify(payload) }),
  courseProgress: () =>
    apiCall('/grammar/courses/progress'),
  saveCourseProgress: (payload) =>
    apiCall('/grammar/courses/progress', { method: 'POST', body: JSON.stringify(payload) }),
  favorites: () =>
    apiCall('/grammar/favorites'),
  saveFavorite: (payload) =>
    apiCall('/grammar/favorites', { method: 'POST', body: JSON.stringify(payload) }),
};

export { setToken, clearToken, getToken, hasSessionFlag, clearSessionFlag, setUnauthorizedHandler };
