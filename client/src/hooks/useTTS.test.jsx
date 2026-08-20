import { describe, expect, it } from 'vitest';

import { fetchTTSAudioUrl, resolveTTSAudioUrl } from './useTTS.js';
import { clearToken, setToken } from '../api/client.js';

describe('resolveTTSAudioUrl', () => {
  it('keeps relative audio URLs on the current origin when no API base is configured', () => {
    expect(resolveTTSAudioUrl('/api/tts/audio/key', '')).toBe('/api/tts/audio/key');
  });

  it('prefixes backend audio URLs with the configured API base', () => {
    expect(resolveTTSAudioUrl('/api/tts/audio/key', 'https://api.example.com')).toBe(
      'https://api.example.com/api/tts/audio/key'
    );
  });

  it('does not rewrite absolute audio URLs', () => {
    expect(resolveTTSAudioUrl('https://cdn.example.com/audio.mp3', 'https://api.example.com')).toBe(
      'https://cdn.example.com/audio.mp3'
    );
  });

  it('sends the csrf header when the csrf cookie exists', async () => {
    document.cookie = 'nest_csrf=test-csrf-token; Path=/';
    const originalFetch = globalThis.fetch;
    let capturedOptions;
    globalThis.fetch = async (_url, options) => {
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ code: 200, url: '/api/tts/audio/abc' }),
      };
    };

    try {
      await fetchTTSAudioUrl('csrf-test-word', 0.8);
      expect(capturedOptions.headers['X-CSRF-Token']).toBe('test-csrf-token');
    } finally {
      globalThis.fetch = originalFetch;
      document.cookie = 'nest_csrf=; Path=/; Max-Age=0';
    }
  });

  it('sends bearer auth and includes credentials for protected backend TTS', async () => {
    const originalFetch = globalThis.fetch;
    let capturedOptions;
    setToken('tts-auth-token');
    globalThis.fetch = async (_url, options) => {
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ code: 200, url: '/api/tts/audio/auth' }),
      };
    };

    try {
      await fetchTTSAudioUrl('auth-test-word', 0.8);
      expect(capturedOptions.headers.Authorization).toBe('Bearer tts-auth-token');
      expect(capturedOptions.credentials).toBe('include');
    } finally {
      globalThis.fetch = originalFetch;
      clearToken();
    }
  });

  it('requests the backend on repeated plays so sentence reading quota is counted per use', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount += 1;
      return {
        ok: true,
        json: async () => ({ code: 200, url: `/api/tts/audio/repeat-${callCount}` }),
      };
    };

    try {
      await fetchTTSAudioUrl('repeat-word', 0.8);
      await fetchTTSAudioUrl('repeat-word', 0.8);
      expect(callCount).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('maps auth and quota failures to user-facing speech messages', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ code: 401, msg: '未登录，请先登录' }),
    });

    try {
      await expect(fetchTTSAudioUrl('needs-login-word', 0.8)).rejects.toThrow('请先登录后使用在线朗读功能。');
    } finally {
      globalThis.fetch = originalFetch;
    }

    globalThis.fetch = async () => ({
      ok: false,
      status: 409,
      json: async () => ({ code: 409, msg: '权益额度不足，请兑换积分、购买加油包或升级会员' }),
    });

    try {
      await expect(fetchTTSAudioUrl('quota-word', 0.8)).rejects.toThrow('权益额度不足');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
