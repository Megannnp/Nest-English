/**
 * api/client.js
 * Central fetch wrapper with robust SSE support
 */

const SESSION_FLAG_KEY = 'nest_has_session';
const CSRF_COOKIE_KEY = 'nest_csrf';
let memoryToken = '';
let unauthorizedHandler = null;
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 20000;
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function setSessionFlag(enabled) {
  if (typeof document === 'undefined') return;

  if (enabled) {
    document.cookie = `${SESSION_FLAG_KEY}=1; Path=/; SameSite=Lax`;
    return;
  }

  document.cookie = `${SESSION_FLAG_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function clearSessionFlag() {
  setSessionFlag(false);
}

export function hasSessionFlag() {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((chunk) => chunk.trim() === `${SESSION_FLAG_KEY}=1`);
}

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : '';
}

export function csrfHeaderForOptions(options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const token = readCookie(CSRF_COOKIE_KEY);
  return UNSAFE_METHODS.has(method) && token ? { 'X-CSRF-Token': token } : {};
}

export function getToken() {
  return memoryToken;
}
export function setToken(t) {
  memoryToken = t || '';
  setSessionFlag(Boolean(t));
}
export function clearToken() {
  memoryToken = '';
  setSessionFlag(false);
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

function notifyUnauthorized() {
  if (!memoryToken && !hasSessionFlag()) return;
  unauthorizedHandler?.();
}

function createTimeoutError(message) {
  const timeoutError = new Error(message);
  timeoutError.timeout = true;
  return timeoutError;
}

function createApiError(body, status) {
  const error = new Error(body.msg || `请求失败 (${status})`);
  error.statusCode = status;
  error.code = body.code || status;
  error.detail = body.detail || '';
  error.serviceUnavailable = status === 503;
  return error;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiCall(path, options = {}) {
  const token = getToken();
  const { timeoutMs, skipUnauthorizedHandler = false, ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...csrfHeaderForOptions(options),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetchWithTimeout(`/api${path}`, { ...fetchOptions, headers, credentials: 'include' }, timeoutMs || DEFAULT_REQUEST_TIMEOUT_MS);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createTimeoutError('请求超时，请确认服务已启动后重试');
    }
    throw new Error('网络连接失败，请检查网络');
  }

  const body = await res.json().catch(() => ({ msg: `服务器错误 (${res.status})` }));

  if (!res.ok) {
    const error = createApiError(body, res.status);
    if (res.status === 401 && !skipUnauthorizedHandler) {
      notifyUnauthorized();
    }
    throw error;
  }

  return body.data !== undefined ? body.data : body;
}

export async function apiDownload(path, options = {}) {
  const token = getToken();
  const { skipUnauthorizedHandler = false, ...fetchOptions } = options;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...csrfHeaderForOptions(options),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetchWithTimeout(
      `/api${path}`,
      { ...fetchOptions, headers, credentials: 'include' },
      DEFAULT_DOWNLOAD_TIMEOUT_MS
    );
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('下载超时，请稍后重试');
    }
    throw new Error('网络连接失败，请检查网络');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ msg: `请求失败 (${res.status})` }));
    const error = new Error(body.msg || `请求失败 (${res.status})`);
    error.statusCode = res.status;
    if (res.status === 401 && !skipUnauthorizedHandler) {
      notifyUnauthorized();
    }
    throw error;
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i) || disposition.match(/filename="?([^"]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : 'download';

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);

  return { filename };
}

function buildStreamHeaders(options) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...csrfHeaderForOptions(options),
    ...(options.headers || {}),
  };
}

function notifyStreamFetchError(error, onError) {
  if (error.name === 'AbortError') {
    onError?.('请求已取消');
    return;
  }
  onError?.('网络连接失败，请检查网络');
}

async function fetchStreamResponse(path, options, controller, onError) {
  const signal = options.signal || controller.signal;

  try {
    return await fetch(`/api${path}`, {
      ...options,
      headers: buildStreamHeaders(options),
      signal,
      credentials: 'include',
    });
  } catch (error) {
    notifyStreamFetchError(error, onError);
    return null;
  }
}

async function reportStreamHttpError(res, onError) {
  try {
    const body = await res.json();
    onError?.(body.msg || `请求失败 (${res.status})`);
  } catch {
    onError?.(`请求失败 (${res.status})`);
  }
}

function parseStreamData(dataContent) {
  try {
    return JSON.parse(dataContent);
  } catch {
    return { chunk: dataContent };
  }
}

function isStreamDoneLine(line) {
  return line === 'data: [DONE]' || line === 'data:[DONE]';
}

async function handleStreamLine(line, reader, onChunk, onDone, onError) {
  const trimmedLine = line.trim();
  if (!trimmedLine) return false;

  if (isStreamDoneLine(trimmedLine)) {
    onDone?.();
    return true;
  }

  if (!trimmedLine.startsWith('data:')) return false;

  const parsedData = parseStreamData(trimmedLine.slice(5).trim());
  if (parsedData.error) {
    onError?.(parsedData.error);
    await reader.cancel();
    return true;
  }

  onChunk?.(parsedData);
  return false;
}

async function processStreamReader(reader, onChunk, onDone, onError) {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();

    for (const line of lines) {
      const shouldStop = await handleStreamLine(line, reader, onChunk, onDone, onError);
      if (shouldStop) return;
    }
  }

  if (buffer.trim()) {
    const shouldStop = await handleStreamLine(buffer, reader, onChunk, onDone, onError);
    if (shouldStop) return;
  }

  onDone?.();
}

async function cancelStreamReader(reader) {
  try {
    await reader.cancel();
  } catch (_error) {
    // Reader may already be closed after a normal stream completion.
  }
}

/**
 * Stream API call for SSE (Server-Sent Events)
 * - 支持纯文本和 JSON 两种 SSE 格式
 * - 正确处理换行符 \r\n
 * - 返回 AbortController 支持取消请求
 */
export async function apiCallStream(path, options = {}, onChunk, onDone, onError) {
  const controller = new AbortController();

  let settled = false;
  const done = () => { if (!settled) { settled = true; onDone?.(); } };
  const fail = (msg) => { if (!settled) { settled = true; onError?.(msg); } };

  const res = await fetchStreamResponse(path, options, controller, fail);

  if (!res) {
    fail('网络连接失败，请检查网络');
    return controller;
  }

  if (!res.body) {
    fail('响应体为空，无法建立流式连接');
    return controller;
  }

  if (!res.ok) {
    await reportStreamHttpError(res, fail);
    return controller;
  }

  const reader = res.body.getReader();
  try {
    await processStreamReader(reader, onChunk, done, fail);
  } catch (error) {
    if (error.name === 'AbortError') {
      settled = true;
    } else {
      fail('流式数据解析失败: ' + error.message);
    }
  } finally {
    await cancelStreamReader(reader);
  }

  return controller;
}
