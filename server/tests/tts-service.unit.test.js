import './testSetup.js';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  getAudioFilePath,
  getPublicAudioFilePath,
  normalizeSpeechText,
  publishPublicAudio,
  synthesizeSpeech,
} from '../services/ttsService.js';

test('normalizeSpeechText turns pause markers into TTS-friendly punctuation', () => {
  assert.equal(
    normalizeSpeechText('Listen[pause]again[pause:1.5s]Now<break time="500ms"/>repeat'),
    'Listen. again.\n\nNow, repeat'
  );
});

test('synthesizeSpeech coalesces concurrent cache misses for the same text', async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.VOLCENGINE_TTS_TOKEN;
  const originalAppId = process.env.VOLCENGINE_TTS_APPID;
  const text = `Concurrent TTS ${Date.now()}`;
  const voice = 'test_voice';
  const speed = 1;
  const key = crypto.createHash('sha256').update(`${text}|${voice}|${speed}`).digest('hex');
  const filePath = getAudioFilePath(key);
  fs.rmSync(filePath, { force: true });

  let calls = 0;
  process.env.VOLCENGINE_TTS_TOKEN = 'test-token';
  process.env.VOLCENGINE_TTS_APPID = 'test-app';
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      ok: true,
      json: async () => ({ code: 3000, data: { audio: Buffer.from('mp3').toString('base64') } }),
    };
  };

  try {
    const results = await Promise.all([
      synthesizeSpeech(text, { voice, speed }),
      synthesizeSpeech(text, { voice, speed }),
    ]);
    assert.deepEqual(results, [key, key]);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken == null) delete process.env.VOLCENGINE_TTS_TOKEN;
    else process.env.VOLCENGINE_TTS_TOKEN = originalToken;
    if (originalAppId == null) delete process.env.VOLCENGINE_TTS_APPID;
    else process.env.VOLCENGINE_TTS_APPID = originalAppId;
    fs.rmSync(filePath, { force: true });
  }
});

test('publishPublicAudio creates a stable random public copy instead of exposing the private key', () => {
  const key = 'a'.repeat(64);
  const privatePath = getAudioFilePath(key);
  fs.mkdirSync(privatePath.replace(/\/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(privatePath, 'public-copy-test');

  let publicId = '';
  try {
    publicId = publishPublicAudio(key);
    const repeatedPublicId = publishPublicAudio(key);
    assert.match(publicId, /^[0-9a-f]{32}$/);
    assert.notEqual(publicId, key);
    assert.equal(repeatedPublicId, publicId);
    assert.equal(fs.readFileSync(getPublicAudioFilePath(publicId), 'utf8'), 'public-copy-test');
  } finally {
    fs.rmSync(privatePath, { force: true });
    if (publicId) {
      const publicPath = getPublicAudioFilePath(publicId);
      fs.rmSync(publicPath, { force: true });
      fs.rmSync(path.join(path.dirname(publicPath), 'index.json'), { force: true });
    }
  }
});
