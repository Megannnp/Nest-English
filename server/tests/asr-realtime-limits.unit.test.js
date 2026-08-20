import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isAllowedAsrOrigin,
  releaseAsrConnection,
  reserveAsrConnection,
  validateAsrAudioChunk,
} from '../services/asrRealtimeService.js';

test('ASR connection guard caps concurrent sessions per user', () => {
  const userKey = `unit-user-${Date.now()}`;

  assert.equal(reserveAsrConnection(userKey, 1), true);
  assert.equal(reserveAsrConnection(userKey, 1), false);

  releaseAsrConnection(userKey);
  assert.equal(reserveAsrConnection(userKey, 1), true);
  releaseAsrConnection(userKey);
});

test('ASR audio guard rejects oversized frames and sessions', () => {
  const limits = {
    maxAudioFrameBytes: 10,
    maxAudioBytes: 20,
  };

  assert.deepEqual(
    validateAsrAudioChunk({ chunkBytes: 11, totalAudioBytes: 0, limits }),
    { ok: false, message: '单次语音数据过大，请重新开始录音。', closeCode: 1009 }
  );
  assert.deepEqual(
    validateAsrAudioChunk({ chunkBytes: 10, totalAudioBytes: 11, limits }),
    { ok: false, message: '本次语音输入已达到时长上限，请结束后重新开始。', closeCode: 1009 }
  );
  assert.deepEqual(
    validateAsrAudioChunk({ chunkBytes: 10, totalAudioBytes: 10, limits }),
    { ok: true }
  );
});

test('ASR origin guard only allows configured frontend origins', () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN,
  };

  try {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGIN = 'https://nestenglish.com,https://school.example.com';
    assert.equal(isAllowedAsrOrigin('https://nestenglish.com'), true);
    assert.equal(isAllowedAsrOrigin('https://school.example.com/path'), true);
    assert.equal(isAllowedAsrOrigin('https://evil.example.com'), false);
    assert.equal(isAllowedAsrOrigin('not a url'), false);
    assert.equal(isAllowedAsrOrigin(''), false);

    process.env.NODE_ENV = 'development';
    assert.equal(isAllowedAsrOrigin('http://localhost:5173'), true);
    assert.equal(isAllowedAsrOrigin('http://127.0.0.1:5173'), true);
  } finally {
    if (originalEnv.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv.NODE_ENV;
    if (originalEnv.ALLOWED_ORIGIN === undefined) delete process.env.ALLOWED_ORIGIN;
    else process.env.ALLOWED_ORIGIN = originalEnv.ALLOWED_ORIGIN;
  }
});
