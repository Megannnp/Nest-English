import { useCallback, useEffect, useRef, useState } from "react";

import { createRealtimeAsrSession } from "./realtimeAsrClient.js";

const VOICE_IDLE = "idle";
const VOICE_RECORDING = "recording";
const VOICE_PAUSED = "paused";

function appendTranscript(baseText, transcript) {
  const cleanBase = String(baseText || "").trim();
  const cleanTranscript = String(transcript || "").trim();
  if (!cleanTranscript) return baseText || "";
  return [cleanBase, cleanTranscript].filter(Boolean).join(cleanBase ? "\n" : "");
}

function supportsRealtimeAsr() {
  if (typeof window === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia && window.WebSocket && (window.AudioContext || window.webkitAudioContext));
}

export function useWritingVoiceInput({
  draftState,
  setError,
  setPromptText,
  setText,
  setWritingTitle,
}) {
  const sessionRef = useRef(null);
  const voiceTargetRef = useRef("");
  const voiceActionRef = useRef("");
  const baseTextRef = useRef("");
  const voiceStatusTimersRef = useRef({});
  const startingRef = useRef(false);
  const sessionIdRef = useRef(0);

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListeningTarget, setVoiceListeningTarget] = useState("");
  const [voiceStatusByTarget, setVoiceStatusByTarget] = useState({
    prompt: { text: "", tone: "" },
    writing: { text: "", tone: "" },
  });
  const [voiceSessionStateByTarget, setVoiceSessionStateByTarget] = useState({
    prompt: VOICE_IDLE,
    writing: VOICE_IDLE,
  });

  const showVoiceStatus = useCallback((target, text, tone = "muted", timeout = 1800) => {
    setVoiceStatusByTarget((current) => ({
      ...current,
      [target]: { text, tone },
    }));

    if (voiceStatusTimersRef.current[target]) {
      clearTimeout(voiceStatusTimersRef.current[target]);
      voiceStatusTimersRef.current[target] = null;
    }

    if (timeout > 0) {
      voiceStatusTimersRef.current[target] = setTimeout(() => {
        setVoiceStatusByTarget((current) => ({
          ...current,
          [target]: { text: "", tone: "" },
        }));
        voiceStatusTimersRef.current[target] = null;
      }, timeout);
    }
  }, []);

  const setSessionState = useCallback((target, state) => {
    setVoiceSessionStateByTarget((current) => ({
      ...current,
      [target]: state,
    }));
  }, []);

  const applyTranscript = useCallback((target, transcript) => {
    const nextText = appendTranscript(baseTextRef.current, transcript);
    if (target === "prompt") {
      setPromptText(nextText);
    } else {
      setText(nextText);
    }
  }, [setPromptText, setText]);

  const stopCurrentSession = useCallback(({ final = false } = {}) => {
    sessionIdRef.current += 1;
    // Disarm any in-flight startRealtimeAsr() call too, so restart/pause/finish can start a fresh
    // session immediately instead of silently no-op'ing while the previous one is still connecting.
    // The stale attempt's own sessionId check will abort it once createRealtimeAsrSession() resolves.
    startingRef.current = false;
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    if (final) session.stop();
    else session.abort();
  }, []);

  const startRealtimeAsr = useCallback(async (target) => {
    if (!target || startingRef.current || sessionRef.current) return false;
    if (!supportsRealtimeAsr()) {
      setVoiceSupported(false);
      setError("当前浏览器不支持实时语音识别，请改用键盘输入或图片识别。");
      return false;
    }

    startingRef.current = true;
    voiceTargetRef.current = target;
    voiceActionRef.current = "start";
    baseTextRef.current = target === "prompt" ? (draftState.promptText || "") : (draftState.text || "");
    setVoiceListeningTarget(target);
    setSessionState(target, VOICE_RECORDING);
    showVoiceStatus(target, "正在连接实时语音识别", "active", 0);
    setError("");
    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;

    try {
      const session = await createRealtimeAsrSession({
        language: "en-US",
        onOpen: () => {
          if (sessionIdRef.current !== sessionId) return;
          startingRef.current = false;
          showVoiceStatus(target, "录音识别中", "active", 0);
        },
        onResult: (message) => {
          if (sessionIdRef.current !== sessionId) return;
          const transcript = message.text || message.utteranceText || message.definiteText || "";
          if (transcript) applyTranscript(target, transcript);
          if (message.definite) showVoiceStatus(target, "已识别到分句", "active", 1200);
        },
        onError: (message) => {
          if (sessionIdRef.current !== sessionId) return;
          startingRef.current = false;
          setError(message || "语音识别失败，请稍后重试。");
          showVoiceStatus(target, message || "语音识别失败", "error", 2600);
          setSessionState(target, VOICE_IDLE);
          setVoiceListeningTarget("");
          sessionRef.current?.abort?.();
          sessionRef.current = null;
        },
        onClose: () => {
          if (sessionIdRef.current !== sessionId) return;
          startingRef.current = false;
          const action = voiceActionRef.current;
          if (action === "pause") {
            setSessionState(target, VOICE_PAUSED);
            showVoiceStatus(target, "录音已暂停", "muted", 0);
          } else if (action === "complete") {
            setSessionState(target, VOICE_IDLE);
            showVoiceStatus(target, "录音已完成", "muted", 1800);
          }
          setVoiceListeningTarget("");
          voiceTargetRef.current = "";
          voiceActionRef.current = "";
          sessionRef.current = null;
        },
      });
      if (sessionIdRef.current !== sessionId) {
        session.abort?.();
        return false;
      }
      sessionRef.current = session;
      return true;
    } catch (error) {
      if (sessionIdRef.current !== sessionId) return false;
      startingRef.current = false;
      sessionRef.current = null;
      voiceTargetRef.current = "";
      voiceActionRef.current = "";
      setVoiceListeningTarget("");
      setSessionState(target, VOICE_IDLE);
      setError(error.message || "语音识别启动失败，请稍后重试。");
      showVoiceStatus(target, "语音识别启动失败", "error", 2600);
      return false;
    }
  }, [applyTranscript, draftState.promptText, draftState.text, setError, setSessionState, showVoiceStatus]);

  useEffect(() => {
    setVoiceSupported(supportsRealtimeAsr());
    return () => {
      stopCurrentSession({ final: false });
      Object.values(voiceStatusTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      voiceStatusTimersRef.current = {};
    };
  }, [stopCurrentSession]);

  const toggleVoiceInput = async (target) => {
    if (!voiceSupported) {
      setError("当前浏览器不支持实时语音识别，请改用键盘输入或图片识别。");
      return;
    }
    const currentState = voiceSessionStateByTarget[target];
    if (currentState === VOICE_RECORDING && voiceListeningTarget === target) {
      voiceActionRef.current = "pause";
      stopCurrentSession({ final: true });
      setVoiceListeningTarget("");
      setSessionState(target, VOICE_PAUSED);
      showVoiceStatus(target, "录音已暂停", "muted", 0);
      return;
    }
    if (voiceListeningTarget && voiceListeningTarget !== target) return;
    await startRealtimeAsr(target);
  };

  const restartVoiceInput = async (target) => {
    if (target === "prompt") {
      setPromptText("");
      if (draftState.writingTitle) {
        setWritingTitle("");
      }
    } else {
      setText("");
    }
    setError("");
    voiceActionRef.current = "restart";
    stopCurrentSession({ final: false });
    baseTextRef.current = "";
    await startRealtimeAsr(target);
  };

  const finishVoiceInput = async (target) => {
    if (voiceListeningTarget === target || sessionRef.current) {
      voiceActionRef.current = "complete";
      stopCurrentSession({ final: true });
      setVoiceListeningTarget("");
      setSessionState(target, VOICE_IDLE);
      showVoiceStatus(target, "录音已完成", "muted", 1800);
      return;
    }
    setSessionState(target, VOICE_IDLE);
    showVoiceStatus(target, "录音已完成", "muted", 1800);
  };

  return {
    state: {
      voiceSupported,
      voiceListeningTarget,
      voiceStatusByTarget,
      voiceSessionStateByTarget,
    },
    actions: {
      toggleVoiceInput,
      restartVoiceInput,
      finishVoiceInput,
    },
  };
}
