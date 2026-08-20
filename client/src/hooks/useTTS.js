import { useCallback, useEffect, useRef, useState } from "react";

import { csrfHeaderForOptions, getToken } from "../api/client.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const TTS_ENDPOINT = `${API_BASE_URL}/api/tts`;

export function resolveTTSAudioUrl(url, apiBaseUrl = API_BASE_URL) {
  if (!apiBaseUrl || !url.startsWith("/")) return url;
  return `${apiBaseUrl.replace(/\/$/, "")}${url}`;
}

function buildTTSMessage(status, body = {}) {
  if (status === 401) return "请先登录后使用在线朗读功能。";
  if (status === 409) return body.msg || "句子朗读额度不足，请兑换积分、购买加油包或升级会员。";
  if (status === 503) return body.msg || "语音服务暂时不可用，请稍后重试。";
  return body.msg || `语音服务请求失败（${status}）`;
}

export async function fetchTTSAudioUrl(text, speed) {
  const res = await fetch(TTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...csrfHeaderForOptions({ method: "POST" }),
    },
    body: JSON.stringify({ text, speed }),
    credentials: "include",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(buildTTSMessage(res.status, json));
  if (json.code !== 200 || !json.url) throw new Error(json.msg || "TTS error");

  const audioUrl = resolveTTSAudioUrl(json.url);
  return audioUrl;
}

function playAudioElement(url) {
  const audio = new Audio(url);
  const finished = new Promise((resolve, reject) => {
    audio.onended = () => resolve(true);
    audio.onerror = () => reject(new Error("音频播放失败，请稍后重试。"));
  });
  return { audio, finished };
}

/**
 * Shared TTS playback hook.
 * Sends text to the backend TTS endpoint, then plays the returned MP3 URL.
 *
 * play(key, text, rate)
 *   key  – unique string; calling play() with the same key while playing stops it
 *   text – English text to speak
 *   rate – speed ratio passed to the backend (0.6 = slow, 0.8 = normal, 1.0 = fast)
 */
export default function useTTS() {
  const [playingKey, setPlayingKey] = useState(null);
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const audioRef = useRef(null);
  const keyRef   = useRef(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    keyRef.current = null;
    setPlayingKey(null);
    setLoadingKey(null);
  }, []);

  // cancel on unmount
  useEffect(() => stop, [stop]);

  const play = useCallback(async (key, text, rate = 0.8) => {
    if (!text || !String(text).trim()) return false;

    // toggle off if already playing this key
    if (keyRef.current === key) {
      stop();
      return false;
    }

    stop();
    setError(false);
    setErrorMessage("");
    keyRef.current = key;
    setLoadingKey(key);

    try {
      const url = await fetchTTSAudioUrl(String(text).trim(), rate);

      // aborted while fetching?
      if (keyRef.current !== key) return false;

      const { audio } = playAudioElement(url);
      audioRef.current = audio;

      const cleanup = () => {
        if (keyRef.current !== key) return;
        keyRef.current = null;
        audioRef.current = null;
        setPlayingKey(null);
        setLoadingKey(null);
      };

      audio.onended  = cleanup;
      audio.onerror  = () => {
        setError(true);
        setErrorMessage("音频播放失败，请稍后重试。");
        cleanup();
      };
      await audio.play();

      setLoadingKey(null);
      setPlayingKey(key);
      return true;
    } catch (err) {
      if (keyRef.current === key) {
        keyRef.current = null;
        setPlayingKey(null);
        setLoadingKey(null);
      }
      setError(true);
      setErrorMessage(err?.message || "语音服务暂时不可用，请稍后重试或检查网络连接。");
      return false;
    }
  }, [stop]);

  const playSequence = useCallback(async (key, texts, rate = 0.8) => {
    const chunks = (Array.isArray(texts) ? texts : [texts]).map((item) => String(item || "").trim()).filter(Boolean);
    if (!chunks.length) return false;

    if (keyRef.current === key) {
      stop();
      return false;
    }

    stop();
    setError(false);
    setErrorMessage("");
    keyRef.current = key;
    setLoadingKey(key);

    try {
      for (const chunk of chunks) {
        const url = await fetchTTSAudioUrl(chunk, rate);
        if (keyRef.current !== key) return false;

        const { audio, finished } = playAudioElement(url);
        audioRef.current = audio;
        await audio.play();
        setLoadingKey(null);
        setPlayingKey(key);
        await finished;
      }

      if (keyRef.current === key) {
        keyRef.current = null;
        audioRef.current = null;
        setPlayingKey(null);
        setLoadingKey(null);
      }
      return true;
    } catch (err) {
      if (keyRef.current === key) {
        keyRef.current = null;
        audioRef.current = null;
        setPlayingKey(null);
        setLoadingKey(null);
      }
      setError(true);
      setErrorMessage(err?.message || "语音服务暂时不可用，请稍后重试或检查网络连接。");
      return false;
    }
  }, [stop]);

  return {
    playingKey,
    loadingKey,
    error,
    errorMessage,
    play,
    playSequence,
    stop,
    unsupported: error,
    isSupported: true,
  };
}
