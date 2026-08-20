
const TARGET_SAMPLE_RATE = 16000;
const FRAME_DURATION_MS = 200;
const SAMPLES_PER_FRAME = TARGET_SAMPLE_RATE * FRAME_DURATION_MS / 1000;

function createAsrWebSocketUrl({ language }) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const params = new URLSearchParams();
  if (language) params.set('language', language);
  // Auth via HttpOnly nest_token cookie sent automatically on WS upgrade — do not put JWT in URL.
  return `${protocol}//${window.location.host}/api/asr/stream${params.toString() ? `?${params.toString()}` : ''}`;
}

function downsampleTo16k(float32Samples, sourceSampleRate) {
  if (sourceSampleRate === TARGET_SAMPLE_RATE) return float32Samples;
  const ratio = sourceSampleRate / TARGET_SAMPLE_RATE;
  const length = Math.floor(float32Samples.length / ratio);
  const result = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), float32Samples.length);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j += 1) {
      sum += float32Samples[j];
      count += 1;
    }
    result[i] = count ? sum / count : 0;
  }
  return result;
}

function floatToPcm16(samples) {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return buffer;
}

function appendSamples(left, right) {
  const next = new Float32Array(left.length + right.length);
  next.set(left, 0);
  next.set(right, left.length);
  return next;
}

export async function createRealtimeAsrSession({
  language = 'en-US',
  onOpen,
  onResult,
  onError,
  onClose,
} = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持麦克风录音。');
  }
  if (typeof WebSocket === 'undefined') {
    throw new Error('当前浏览器不支持实时语音连接。');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextCtor();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const ws = new WebSocket(createAsrWebSocketUrl({ language }));
  ws.binaryType = 'arraybuffer';
  let closed = false;
  let sampleBuffer = new Float32Array(0);
  let ready = false;

  function cleanup({ sendFinish = false } = {}) {
    if (closed) return;
    closed = true;
    try {
      processor.disconnect();
      source.disconnect();
    } catch {
      // Disconnect may throw if the audio graph is already torn down.
    }
    stream.getTracks().forEach((track) => track.stop());
    void audioContext.close?.();
    if (ws.readyState === WebSocket.OPEN) {
      if (sendFinish) ws.send(JSON.stringify({ type: 'finish' }));
      window.setTimeout(() => {
        try { ws.close(); } catch { /* socket may already be closed */ }
      }, sendFinish ? 250 : 0);
    } else {
      try { ws.close(); } catch { /* socket may already be closed */ }
    }
  }

  function flushFrames() {
    while (sampleBuffer.length >= SAMPLES_PER_FRAME && ws.readyState === WebSocket.OPEN && ready) {
      const frame = sampleBuffer.slice(0, SAMPLES_PER_FRAME);
      sampleBuffer = sampleBuffer.slice(SAMPLES_PER_FRAME);
      ws.send(floatToPcm16(frame));
    }
  }

  processor.onaudioprocess = (event) => {
    if (closed) return;
    const input = event.inputBuffer.getChannelData(0);
    const downsampled = downsampleTo16k(input, audioContext.sampleRate);
    sampleBuffer = appendSamples(sampleBuffer, downsampled);
    flushFrames();
  };

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'start', language, enableNonstream: true }));
  };

  ws.onmessage = (event) => {
    let message = null;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type === 'ready') {
      ready = true;
      source.connect(processor);
      processor.connect(audioContext.destination);
      onOpen?.();
      flushFrames();
      return;
    }
    if (message.type === 'result') {
      onResult?.(message);
      return;
    }
    if (message.type === 'error') {
      onError?.(message.message || '语音识别失败');
    }
  };

  ws.onerror = () => {
    onError?.('语音识别连接失败，请稍后重试。');
  };

  ws.onclose = () => {
    onClose?.();
  };

  return {
    stop: () => cleanup({ sendFinish: true }),
    abort: () => cleanup({ sendFinish: false }),
  };
}
