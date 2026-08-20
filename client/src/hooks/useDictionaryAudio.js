/* eslint-disable complexity */
import { useCallback, useRef, useState } from "react";

// In-memory cache: word.toLowerCase() → audioUrl | null
const URL_CACHE = new Map();
// Track in-flight fetches to avoid duplicates
const IN_FLIGHT = new Map();

function canUseSpeechSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function shouldUseDictionaryLookup(text) {
  return /^[A-Za-z][A-Za-z'-]*$/.test(String(text || "").trim());
}

async function fetchAudioUrl(word) {
  const key = word.toLowerCase().trim();
  if (URL_CACHE.has(key)) return URL_CACHE.get(key);
  if (IN_FLIGHT.has(key)) return IN_FLIGHT.get(key);

  const promise = (async () => {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`
      );
      if (!res.ok) { URL_CACHE.set(key, null); return null; }
      const data = await res.json();
      const audioCandidates = [];
      for (const entry of data) {
        for (const ph of (entry.phonetics ?? [])) {
          if (ph.audio) {
            audioCandidates.push(ph.audio);
          }
        }
      }
      if (audioCandidates.length) {
        const preferred = audioCandidates.find(url => /(^|[_.-])(uk|gb)([_.-]|\/|$)/i.test(url))
          || audioCandidates.find(url => /\/uk/i.test(url))
          || audioCandidates[0];
        URL_CACHE.set(key, preferred);
        return preferred;
      }
      URL_CACHE.set(key, null);
      return null;
    } catch {
      URL_CACHE.set(key, null);
      return null;
    } finally {
      IN_FLIGHT.delete(key);
    }
  })();

  IN_FLIGHT.set(key, promise);
  return promise;
}

/**
 * Plays word pronunciation from Free Dictionary API (real human recordings).
 * Falls back to browser TTS on failure.
 * Interface matches useWebTTS: play(key, word, rate, audioUrl), playingKey, stop.
 */
export default function useDictionaryAudio() {
  const [playingKey, setPlayingKey] = useState(null);
  const [loadingKey, setLoadingKey] = useState(null);
  const audioRef = useRef(null);
  const keyRef = useRef(null);
  const utterRef = useRef(null);
  const unsupported = !canUseSpeechSynthesis();

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (utterRef.current && canUseSpeechSynthesis()) {
      window.speechSynthesis.cancel();
      utterRef.current = null;
    }
    keyRef.current = null;
    setPlayingKey(null);
    setLoadingKey(null);
  }, []);

  const play = useCallback(async (key, word, rate = 1.0, audioUrl = "") => {
    if (!word?.trim() && !audioUrl) return false;
    if (keyRef.current === key) { stop(); return false; }
    stop();

    keyRef.current = key;
    setLoadingKey(key);

    const url = audioUrl || (shouldUseDictionaryLookup(word) ? await fetchAudioUrl(word) : null);

    // Bail if another play() was called while we were fetching
    if (keyRef.current !== key) return false;

    if (!url) {
      // Fall back to browser TTS
      if (canUseSpeechSynthesis()) {
        setLoadingKey(null);
        setPlayingKey(key);
        const utter = new SpeechSynthesisUtterance(word.trim());
        utterRef.current = utter;
        utter.lang = "en-GB";
        utter.rate = rate;
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang === "en-GB" && /daniel|kate|serena/i.test(v.name))
          || voices.find(v => v.lang === "en-GB")
          || voices.find(v => v.lang.startsWith("en"));
        if (voice) utter.voice = voice;
        utter.onend = utter.onerror = () => {
          if (keyRef.current === key) { keyRef.current = null; utterRef.current = null; setPlayingKey(null); }
        };
        window.speechSynthesis.speak(utter);
        return true;
      }
      keyRef.current = null;
      setLoadingKey(null);
      return false;
    }

    const audio = new Audio(url);
    // Dictionary API audio is recorded at normal speed; 0.75 rate = slow playback
    audio.playbackRate = Math.max(0.5, Math.min(rate, 2.0));
    audioRef.current = audio;

    setLoadingKey(null);
    setPlayingKey(key);

    const done = () => {
      if (keyRef.current === key) { keyRef.current = null; setPlayingKey(null); }
    };
    audio.onended = done;
    audio.onerror = done;

    try {
      await audio.play();
      return true;
    } catch {
      done();
      return false;
    }
  }, [stop]);

  return { playingKey, loadingKey, play, stop, unsupported };
}
