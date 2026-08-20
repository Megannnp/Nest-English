import './testSetup.js';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import db from '../db/database.js';

function cacheKey(text, voice = 'BV406_streaming', speed = 1) {
  return crypto.createHash('sha256').update(`${text}|${voice}|${speed}`).digest('hex');
}

function withEnv(values, callback) {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
  return Promise.resolve(callback()).finally(() => {
    for (const [key, value] of previous.entries()) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

async function importFreshTtsService(label) {
  return import(`../services/ttsService.js?${label}-${Date.now()}-${Math.random()}`);
}

test('TTS_CACHE_MAX_AGE_MS=0 disables private cache cleanup', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nest-tts-cache-'));

  try {
    await withEnv({ TTS_DATA_DIR: tmpDir, TTS_CACHE_MAX_AGE_MS: '0' }, async () => {
      const { getAudioFilePath, synthesizeSpeech } = await importFreshTtsService('private-cache-zero');
      const oldKey = '1'.repeat(64);
      const oldPath = getAudioFilePath(oldKey);
      fs.mkdirSync(path.dirname(oldPath), { recursive: true });
      fs.writeFileSync(oldPath, 'old-private');
      fs.utimesSync(oldPath, new Date(0), new Date(0));

      const text = `cached target ${Date.now()}`;
      fs.writeFileSync(getAudioFilePath(cacheKey(text, 'test_voice')), 'target-private');

      await synthesizeSpeech(text, { voice: 'test_voice' });
      assert.equal(fs.existsSync(oldPath), true);
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('old unreferenced public audio is cleaned while referenced public audio is kept', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nest-tts-public-'));
  const referencedId = '2'.repeat(32);
  t.mock.method(db, 'prepare', (sql) => ({
    get: async (url) => (
      sql.includes('materials') && url === `/api/tts/public/${referencedId}`
        ? { id: 'material-1' }
        : null
    ),
  }));

  try {
    await withEnv({ TTS_DATA_DIR: tmpDir, TTS_PUBLIC_UNREFERENCED_MAX_AGE_MS: '1' }, async () => {
      const { getAudioFilePath, getPublicAudioFilePath, synthesizeSpeech } = await importFreshTtsService('public-cleanup');
      const unreferencedPath = getPublicAudioFilePath('3'.repeat(32));
      const referencedPath = getPublicAudioFilePath(referencedId);
      fs.mkdirSync(path.dirname(unreferencedPath), { recursive: true });
      fs.writeFileSync(unreferencedPath, 'old-public-unreferenced');
      fs.writeFileSync(referencedPath, 'old-public-referenced');
      fs.utimesSync(unreferencedPath, new Date(0), new Date(0));
      fs.utimesSync(referencedPath, new Date(0), new Date(0));

      const text = `cached target ${Date.now()}`;
      fs.mkdirSync(path.dirname(getAudioFilePath(cacheKey(text, 'test_voice'))), { recursive: true });
      fs.writeFileSync(getAudioFilePath(cacheKey(text, 'test_voice')), 'target-private');

      await synthesizeSpeech(text, { voice: 'test_voice' });
      assert.equal(fs.existsSync(unreferencedPath), false);
      assert.equal(fs.existsSync(referencedPath), true);
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('public audio cleanup keeps files when reference lookup fails', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nest-tts-public-failsafe-'));
  const publicId = '4'.repeat(32);
  t.mock.method(db, 'prepare', () => {
    throw new Error('db unavailable');
  });

  try {
    await withEnv({ TTS_DATA_DIR: tmpDir, TTS_PUBLIC_UNREFERENCED_MAX_AGE_MS: '1' }, async () => {
      const { getAudioFilePath, getPublicAudioFilePath, synthesizeSpeech } = await importFreshTtsService('public-cleanup-failsafe');
      const publicPath = getPublicAudioFilePath(publicId);
      fs.mkdirSync(path.dirname(publicPath), { recursive: true });
      fs.writeFileSync(publicPath, 'old-public');
      fs.utimesSync(publicPath, new Date(0), new Date(0));

      const text = `cached target ${Date.now()}`;
      fs.mkdirSync(path.dirname(getAudioFilePath(cacheKey(text, 'test_voice'))), { recursive: true });
      fs.writeFileSync(getAudioFilePath(cacheKey(text, 'test_voice')), 'target-private');

      await synthesizeSpeech(text, { voice: 'test_voice' });
      assert.equal(fs.existsSync(publicPath), true);
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('private cache hits refresh mtime so hot audio is not aged out', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nest-tts-touch-'));

  try {
    await withEnv({ TTS_DATA_DIR: tmpDir, TTS_CACHE_MAX_AGE_MS: '1000000000' }, async () => {
      const { getAudioFilePath, synthesizeSpeech } = await importFreshTtsService('private-cache-touch');
      const text = `cached hot target ${Date.now()}`;
      const key = cacheKey(text, 'test_voice');
      const filePath = getAudioFilePath(key);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, 'target-private');
      // Age the file so a refresh is observable, but keep it inside
      // TTS_CACHE_MAX_AGE_MS — otherwise the cleanup pass that runs at the top
      // of synthesizeSpeech deletes it first and the "cache hit" never happens.
      const staleMtime = new Date(Date.now() - 60 * 60 * 1000);
      fs.utimesSync(filePath, staleMtime, staleMtime);

      await synthesizeSpeech(text, { voice: 'test_voice' });
      assert.equal(fs.existsSync(filePath), true);
      assert.ok(fs.statSync(filePath).mtimeMs > staleMtime.getTime());
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
