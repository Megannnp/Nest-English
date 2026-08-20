import { gunzipSync, gzipSync } from 'node:zlib';

const PROTOCOL_VERSION = 0x1;
const HEADER_SIZE_WORDS = 0x1;

const MESSAGE_TYPES = {
  FULL_CLIENT_REQUEST: 0x1,
  AUDIO_ONLY_REQUEST: 0x2,
  FULL_SERVER_RESPONSE: 0x9,
  ERROR: 0xf,
};

const FLAGS = {
  NONE: 0x0,
  POSITIVE_SEQUENCE: 0x1,
  LAST_PACKET_NO_SEQUENCE: 0x2,
  LAST_PACKET_NEGATIVE_SEQUENCE: 0x3,
};

const SERIALIZATION = {
  NONE: 0x0,
  JSON: 0x1,
};

const COMPRESSION = {
  NONE: 0x0,
  GZIP: 0x1,
};

function createHeader({ messageType, flags, serialization, compression }) {
  return Buffer.from([
    (PROTOCOL_VERSION << 4) | HEADER_SIZE_WORDS,
    (messageType << 4) | flags,
    (serialization << 4) | compression,
    0x00,
  ]);
}

function uint32Buffer(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
}

export function createFullClientRequestPacket(payload) {
  const body = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'));
  return Buffer.concat([
    createHeader({
      messageType: MESSAGE_TYPES.FULL_CLIENT_REQUEST,
      flags: FLAGS.NONE,
      serialization: SERIALIZATION.JSON,
      compression: COMPRESSION.GZIP,
    }),
    uint32Buffer(body.length),
    body,
  ]);
}

export function createAudioPacket(audioBuffer, { last = false } = {}) {
  const body = gzipSync(Buffer.from(audioBuffer || []));
  return Buffer.concat([
    createHeader({
      messageType: MESSAGE_TYPES.AUDIO_ONLY_REQUEST,
      flags: last ? FLAGS.LAST_PACKET_NO_SEQUENCE : FLAGS.NONE,
      serialization: SERIALIZATION.NONE,
      compression: COMPRESSION.GZIP,
    }),
    uint32Buffer(body.length),
    body,
  ]);
}

function decodePayload(payload, compression) {
  if (compression === COMPRESSION.GZIP) return gunzipSync(payload);
  return payload;
}

export function parseServerPacket(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buffer.length < 8) {
    throw new Error('ASR 返回包长度不足');
  }

  const headerSize = (buffer[0] & 0x0f) * 4;
  const messageType = buffer[1] >> 4;
  const flags = buffer[1] & 0x0f;
  const serialization = buffer[2] >> 4;
  const compression = buffer[2] & 0x0f;

  if (messageType === MESSAGE_TYPES.ERROR) {
    const code = buffer.readUInt32BE(headerSize);
    const messageSize = buffer.readUInt32BE(headerSize + 4);
    const rawMessage = buffer.subarray(headerSize + 8, headerSize + 8 + messageSize);
    return { type: 'error', code, message: rawMessage.toString('utf8') };
  }

  if (messageType !== MESSAGE_TYPES.FULL_SERVER_RESPONSE) {
    return { type: 'unknown', messageType, flags };
  }

  const hasSequence = flags === FLAGS.POSITIVE_SEQUENCE || flags === FLAGS.LAST_PACKET_NEGATIVE_SEQUENCE;
  const payloadSizeOffset = hasSequence ? headerSize + 4 : headerSize;
  const sequence = hasSequence ? buffer.readInt32BE(headerSize) : null;
  const payloadSize = buffer.readUInt32BE(payloadSizeOffset);
  const payloadStart = payloadSizeOffset + 4;
  const payloadBuffer = buffer.subarray(payloadStart, payloadStart + payloadSize);
  const decoded = decodePayload(payloadBuffer, compression);
  const text = decoded.toString('utf8');

  return {
    type: 'result',
    sequence,
    final: flags === FLAGS.LAST_PACKET_NEGATIVE_SEQUENCE,
    payload: serialization === SERIALIZATION.JSON ? JSON.parse(text || '{}') : text,
  };
}

export function buildAsrStartPayload({ language = 'en-US', userId = 'anonymous', enableNonstream = true } = {}) {
  return {
    user: { uid: String(userId || 'anonymous') },
    audio: {
      format: 'pcm',
      codec: 'raw',
      rate: 16000,
      bits: 16,
      channel: 1,
      ...(language ? { language } : {}),
    },
    request: {
      model_name: 'bigmodel',
      enable_nonstream: Boolean(enableNonstream),
      enable_itn: true,
      enable_punc: true,
      enable_ddc: false,
      show_utterances: true,
      end_window_size: 800,
      result_type: 'full',
    },
  };
}
