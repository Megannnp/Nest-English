function getSpeechRecognitionErrorMessage(error) {
  switch (error) {
    case 'not-allowed':
      return '麦克风权限未开启，请允许浏览器访问麦克风后重试。';
    case 'audio-capture':
      return '没有检测到可用麦克风，请检查设备或系统录音权限。';
    case 'network':
    case 'service-not-allowed':
      return '浏览器语音识别服务连接失败，请改用 Chrome/Edge、稳定网络，或键盘/图片输入。';
    case 'language-not-supported':
      return '当前浏览器不支持英语语音识别，请改用键盘或图片输入。';
    case 'no-speech':
      return '没有识别到语音，请靠近麦克风重试。';
    default:
      return '当前浏览器的语音输入不可用，请改用键盘输入或图片识别。';
  }
}

const CONTINUING_VOICE_ACTIONS = new Set(['start', 'continue', 'restart-continue']);

function appendVoiceTranscript({ transcript, target, setPromptText, setText }) {
  if (!transcript) return;
  setPromptText((current) => (
    target === 'prompt'
      ? [current.trim(), transcript].filter(Boolean).join(current.trim() ? '\n' : '')
      : current
  ));
  setText((current) => (
    target === 'writing'
      ? [current.trim(), transcript].filter(Boolean).join(current.trim() ? '\n' : '')
      : current
  ));
}

function applyVoiceEndAction({
  action,
  target,
  restartRecognition,
  setVoiceListeningTarget,
  setVoiceSessionStateByTarget,
  showVoiceStatus,
  VOICE_IDLE,
  VOICE_PAUSED,
}) {
  if (action === 'pause' && target) {
    setVoiceSessionStateByTarget((current) => ({ ...current, [target]: VOICE_PAUSED }));
    showVoiceStatus(target, '录音已暂停', 'muted', 0);
    return 'done';
  }
  if (action === 'complete' && target) {
    setVoiceSessionStateByTarget((current) => ({ ...current, [target]: VOICE_IDLE }));
    showVoiceStatus(target, '录音已完成', 'muted', 1800);
    return 'done';
  }
  if (action === 'restart' && target) {
    restartRecognition(target);
    return 'restarted';
  }
  if (CONTINUING_VOICE_ACTIONS.has(action) && target) {
    restartRecognition(target);
    return 'restarted';
  }
  if (CONTINUING_VOICE_ACTIONS.has(action)) {
    setVoiceListeningTarget('');
    return 'done';
  }
  if (target) {
    setVoiceSessionStateByTarget((current) => ({ ...current, [target]: VOICE_IDLE }));
  }
  return 'done';
}

export function createSpeechRecognitionRuntime({
  SpeechRecognition,
  setError,
  setPromptText,
  setText,
  showVoiceStatus,
  voiceTargetRef,
  voiceActionRef,
  voiceStatusTimersRef,
  voiceFinalTranscriptRef,
  voiceInterimTranscriptRef,
  recognitionStartingRef,
  setVoiceListeningTarget,
  setVoiceSessionStateByTarget,
  VOICE_IDLE,
  VOICE_PAUSED,
  VOICE_RECORDING,
}) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = true;

  const restartRecognition = (target) => {
    showVoiceStatus(target, '录音识别中', 'active', 0);
    setVoiceSessionStateByTarget((current) => ({
      ...current,
      [target]: VOICE_RECORDING,
    }));
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nest-voice-restart', { detail: target }));
      }
    }, 0);
    setVoiceListeningTarget('');
  };

  recognition.onstart = () => {
    recognitionStartingRef.current = false;
    setError('');
    voiceFinalTranscriptRef.current = '';
    voiceInterimTranscriptRef.current = '';
    const target = voiceTargetRef.current;
    if (target) {
      setVoiceSessionStateByTarget((current) => ({
        ...current,
        [target]: VOICE_RECORDING,
      }));
      showVoiceStatus(target, '录音识别中', 'active', 0);
    }
  };

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const segment = event.results[i][0]?.transcript || '';
      if (event.results[i].isFinal) final += segment;
      else interim += segment;
    }
    if (final) {
      voiceFinalTranscriptRef.current = `${voiceFinalTranscriptRef.current} ${final}`.trim();
    }
    voiceInterimTranscriptRef.current = interim.trim();
  };

  recognition.onerror = (event) => {
    const target = voiceTargetRef.current;
    recognitionStartingRef.current = false;
    if (event.error === 'aborted' && voiceActionRef.current === 'pause') {
      return;
    }
    if (event.error === 'no-speech' && target) {
      showVoiceStatus(target, getSpeechRecognitionErrorMessage(event.error), 'error', 2400);
    }
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      const message = getSpeechRecognitionErrorMessage(event.error);
      setError(message);
      if (target) {
        showVoiceStatus(target, message, 'error', 2600);
        setVoiceSessionStateByTarget((current) => ({
          ...current,
          [target]: VOICE_IDLE,
        }));
      }
    }
    setVoiceListeningTarget('');
    voiceActionRef.current = '';
  };

  recognition.onend = () => {
    recognitionStartingRef.current = false;
    const target = voiceTargetRef.current;
    const action = voiceActionRef.current;
    const transcript = `${voiceFinalTranscriptRef.current} ${voiceInterimTranscriptRef.current}`.trim();
    if (action !== 'restart') {
      appendVoiceTranscript({ transcript, target, setPromptText, setText });
    }
    voiceFinalTranscriptRef.current = '';
    voiceInterimTranscriptRef.current = '';
    const result = applyVoiceEndAction({
      action,
      target,
      restartRecognition,
      setVoiceListeningTarget,
      setVoiceSessionStateByTarget,
      showVoiceStatus,
      VOICE_IDLE,
      VOICE_PAUSED,
    });
    if (result === 'restarted') {
      voiceActionRef.current = '';
      voiceTargetRef.current = '';
      return;
    }
    voiceTargetRef.current = '';
    voiceActionRef.current = '';
    setVoiceListeningTarget('');
  };

  const cleanup = () => {
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.stop();
    } catch {
      // ignore cleanup errors
    }
    Object.values(voiceStatusTimersRef.current).forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
    voiceStatusTimersRef.current = {};
  };

  return { recognition, cleanup };
}
