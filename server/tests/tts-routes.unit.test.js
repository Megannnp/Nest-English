import './testSetup.js';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import test from 'node:test';

import db from '../db/database.js';
import ttsRouter, { buildSignedAudioUrl } from '../routes/tts.js';
import { getAudioFilePath, getPublicAudioFilePath } from '../services/ttsService.js';

function dispatchGet(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url, 'http://localhost');
    const req = new EventEmitter();
    req.method = 'GET';
    req.url = url;
    req.originalUrl = `/api/tts${url}`;
    req.headers = {};
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());

    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
      },
      json(body) {
        resolve({ statusCode: this.statusCode, body, headers: this.headers });
      },
      sendFile(filePath) {
        resolve({ statusCode: this.statusCode, filePath, headers: this.headers });
      },
    };

    ttsRouter.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ statusCode: res.statusCode, headers: res.headers });
    });
  });
}

test('GET /audio/:key rejects unsigned private cache access', async () => {
  const key = 'b'.repeat(64);
  const result = await dispatchGet(`/audio/${key}`);

  assert.equal(result.statusCode, 401);
  assert.match(result.body.msg, /失效|重新请求/);
});

test('GET /audio/:key serves private cache only with a valid signature', async () => {
  const key = 'c'.repeat(64);
  const filePath = getAudioFilePath(key);
  fs.mkdirSync(filePath.replace(/\/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(filePath, 'signed-audio');

  try {
    const signedUrl = buildSignedAudioUrl(key).replace('/api/tts', '');
    const result = await dispatchGet(signedUrl);

    assert.equal(result.statusCode, 200);
    assert.equal(result.filePath, filePath);
    assert.equal(result.headers['content-type'], 'audio/mpeg');
  } finally {
    fs.rmSync(filePath, { force: true });
  }
});

test('GET /public/:key serves random public audio copies', async () => {
  const publicId = 'd'.repeat(32);
  const filePath = getPublicAudioFilePath(publicId);
  fs.mkdirSync(filePath.replace(/\/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(filePath, 'public-audio');

  try {
    const result = await dispatchGet(`/public/${publicId}`);

    assert.equal(result.statusCode, 200);
    assert.equal(result.filePath, filePath);
    assert.equal(result.headers['content-type'], 'audio/mpeg');
  } finally {
    fs.rmSync(filePath, { force: true });
  }
});

test('GET /public/:key serves legacy private-cache audio only when referenced by question bank', async (t) => {
  const key = 'e'.repeat(64);
  const filePath = getAudioFilePath(key);
  fs.mkdirSync(filePath.replace(/\/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(filePath, 'legacy-public-audio');
  t.mock.method(db, 'prepare', (sql) => ({
    get: async (url) => (
      sql.includes('materials') && url === `/api/tts/public/${key}`
        ? { id: 'material-1' }
        : null
    ),
  }));

  try {
    const result = await dispatchGet(`/public/${key}`);

    assert.equal(result.statusCode, 200);
    assert.equal(result.filePath, filePath);
    assert.equal(result.headers['content-type'], 'audio/mpeg');
  } finally {
    fs.rmSync(filePath, { force: true });
  }
});
