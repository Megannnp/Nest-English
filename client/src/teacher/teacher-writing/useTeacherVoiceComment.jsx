import { useCallback, useEffect, useRef, useState } from "react";

import { createRealtimeAsrSession } from "../../writing/core/realtimeAsrClient.js";

function supportsRealtimeAsr() {
  if (typeof window === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia && window.WebSocket && (window.AudioContext || window.webkitAudioContext));
}

function appendTranscript(baseText, transcript) {
  const cleanBase = String(baseText || "").trim();
  const cleanTranscript = String(transcript || "").trim();
  if (!cleanTranscript) return baseText || "";
  return [cleanBase, cleanTranscript].filter(Boolean).join(cleanBase ? "\n" : "");
}

export function useTeacherVoiceComment(writingId, setComment, setMessage) {
  const sessionRef = useRef(null);
  const sessionIdRef = useRef(0);
  const baseCommentRef = useRef("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const stopCurrentSession = useCallback(({ final = false } = {}) => {
    sessionIdRef.current += 1;
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    if (final) session.stop();
    else session.abort();
  }, []);

  useEffect(() => {
    stopCurrentSession({ final: false });
    baseCommentRef.current = "";
    setIsVoiceListening(false);
  }, [stopCurrentSession, writingId]);

  useEffect(() => {
    setVoiceSupported(supportsRealtimeAsr());
    return () => {
      stopCurrentSession({ final: false });
      setIsVoiceListening(false);
    };
  }, [stopCurrentSession]);

  const startVoiceComment = useCallback(async () => {
    if (!supportsRealtimeAsr()) {
      setVoiceSupported(false);
      setMessage("当前浏览器不支持教师评价语音识别，请改用键盘输入。");
      return;
    }
    if (sessionRef.current) return;
    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;
    setIsVoiceListening(true);
    setMessage("");
    setComment((current) => {
      baseCommentRef.current = current;
      return current;
    });

    try {
      const session = await createRealtimeAsrSession({
        language: "zh-CN",
        onOpen: () => {
          if (sessionIdRef.current !== sessionId) return;
          setMessage("正在录音并实时转写教师评价。");
        },
        onResult: (message) => {
          if (sessionIdRef.current !== sessionId) return;
          const transcript = message.text || message.utteranceText || message.definiteText || "";
          if (transcript) setComment(appendTranscript(baseCommentRef.current, transcript));
        },
        onError: (message) => {
          if (sessionIdRef.current !== sessionId) return;
          setMessage(message || "教师评价语音识别失败，请改用键盘输入。");
          setIsVoiceListening(false);
          sessionRef.current?.abort?.();
          sessionRef.current = null;
        },
        onClose: () => {
          if (sessionIdRef.current !== sessionId) return;
          setMessage("语音内容已转成文字备注，可继续补充或直接保存。");
          setIsVoiceListening(false);
          sessionRef.current = null;
        },
      });
      if (sessionIdRef.current !== sessionId) {
        session.abort?.();
        return;
      }
      sessionRef.current = session;
    } catch {
      if (sessionIdRef.current !== sessionId) return;
      setMessage("语音识别启动失败，请稍后重试。");
      setIsVoiceListening(false);
      sessionRef.current = null;
    }
  }, [setComment, setMessage]);

  const handleToggleVoiceComment = useCallback(() => {
    if (!voiceSupported) return;
    if (isVoiceListening) {
      stopCurrentSession({ final: true });
      setIsVoiceListening(false);
      return;
    }
    void startVoiceComment();
  }, [isVoiceListening, startVoiceComment, stopCurrentSession, voiceSupported]);

  const handleRestartVoiceComment = useCallback(() => {
    setComment("");
    setMessage("");
    if (!voiceSupported) return;
    stopCurrentSession({ final: false });
    window.setTimeout(() => {
      void startVoiceComment();
    }, 60);
  }, [setComment, setMessage, startVoiceComment, stopCurrentSession, voiceSupported]);

  return {
    voiceSupported,
    isVoiceListening,
    handleToggleVoiceComment,
    handleRestartVoiceComment,
  };
}
