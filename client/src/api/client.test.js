import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCall, apiCallStream, clearSessionFlag } from './client.js';

function createSseResponse(chunks, init = {}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
    ...init,
  });
}

describe('api client infrastructure', () => {
  beforeEach(() => {
    clearSessionFlag();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('surfaces request timeout with a stable user-facing error', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url, options = {}) => (
      new Promise((_, reject) => {
        options.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        }, { once: true });
      })
    ));

    const request = expect(apiCall('/timeout-check')).rejects.toMatchObject({
      message: '请求超时，请确认服务已启动后重试',
      timeout: true,
    });
    await vi.advanceTimersByTimeAsync(15000);
    await request;
  });

  it('parses SSE chunks across split frames and completes cleanly', async () => {
    const onChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    global.fetch = vi.fn().mockResolvedValue(
      createSseResponse([
        'data: {"chunk":"Hel',
        'lo"}\n\n',
        'data: plain text\n\n',
        'data:[DONE]\n\n',
      ])
    );

    await apiCallStream('/stream-check', {}, onChunk, onDone, onError);

    expect(onChunk).toHaveBeenNthCalledWith(1, { chunk: 'Hello' });
    expect(onChunk).toHaveBeenNthCalledWith(2, { chunk: 'plain text' });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports server-side SSE errors without crashing the reader loop', async () => {
    const onChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    global.fetch = vi.fn().mockResolvedValue(
      createSseResponse(['data: {"error":"队列繁忙"}\n\n'])
    );

    await apiCallStream('/stream-check', {}, onChunk, onDone, onError);

    expect(onChunk).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('队列繁忙');
  });

  it('falls back to status-based SSE error when error body is not JSON', async () => {
    const onError = vi.fn();

    global.fetch = vi.fn().mockResolvedValue(
      new Response('service unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    await apiCallStream('/stream-check', {}, vi.fn(), vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith('请求失败 (503)');
  });
});
