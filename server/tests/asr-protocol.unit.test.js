import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

import {
  buildAsrStartPayload,
  createAudioPacket,
  createFullClientRequestPacket,
  parseServerPacket,
} from '../services/asrProtocolService.js';

test('ASR protocol builds gzip JSON full client request', () => {
  const packet = createFullClientRequestPacket(buildAsrStartPayload({ language: 'en-US', userId: 'u1' }));
  assert.equal(packet[0], 0x11);
  assert.equal(packet[1], 0x10);
  assert.equal(packet[2], 0x11);
  assert.ok(packet.readUInt32BE(4) > 0);
});

test('ASR protocol marks final audio packet with last-packet flag', () => {
  const packet = createAudioPacket(Buffer.from([1, 2, 3]), { last: true });
  assert.equal(packet[0], 0x11);
  assert.equal(packet[1], 0x22);
  assert.equal(packet[2], 0x01);
});

test('ASR protocol parses gzip JSON server response', () => {
  const payload = gzipSync(Buffer.from(JSON.stringify({ result: { text: 'hello' } }), 'utf8'));
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length);
  const sequence = Buffer.alloc(4);
  sequence.writeInt32BE(1);
  const packet = Buffer.concat([
    Buffer.from([0x11, 0x91, 0x11, 0x00]),
    sequence,
    size,
    payload,
  ]);

  const parsed = parseServerPacket(packet);
  assert.equal(parsed.type, 'result');
  assert.equal(parsed.sequence, 1);
  assert.equal(parsed.payload.result.text, 'hello');
});
