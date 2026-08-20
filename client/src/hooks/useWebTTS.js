import { useCallback, useEffect, useRef, useState } from "react";

const supported = typeof window !== "undefined" && "speechSynthesis" in window;

// Voice preference order: British English first. This hook is used by the
// phonetics pages, where RP-style pronunciation is the teaching target.
const VOICE_PREFS = [
  v => v.lang === "en-GB" && /daniel|kate|serena|susan|karen/i.test(v.name),
  v => v.lang === "en-GB" && v.localService,
  v => v.lang === "en-GB",
  v => v.lang === "en-US",
  v => v.lang.startsWith("en"),
];

let cachedVoice = null;

function getBestEnVoice() {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const test of VOICE_PREFS) {
    const found = voices.find(test);
    if (found) { cachedVoice = found; return found; }
  }
  return voices[0] ?? null;
}

export default function useWebTTS() {
  const [playingKey, setPlayingKey] = useState(null);
  const [unsupported, setUnsupported] = useState(!supported);
  const keyRef = useRef(null);

  // Reset voice cache when voices change (async load on Chrome)
  useEffect(() => {
    if (!supported) return;
    const onVoicesChanged = () => { cachedVoice = null; };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
  }, []);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    keyRef.current = null;
    setPlayingKey(null);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback((key, text, rate = 0.85) => {
    if (!supported || !String(text ?? "").trim()) return Promise.resolve(false);

    if (keyRef.current === key) {
      stop();
      return Promise.resolve(false);
    }

    stop();
    keyRef.current = key;
    setPlayingKey(key);

    const utter = new SpeechSynthesisUtterance(String(text).trim());
    utter.lang = "en-GB";
    utter.rate = rate;

    const voice = getBestEnVoice();
    if (voice) utter.voice = voice;

    utter.onend = () => {
      if (keyRef.current === key) {
        keyRef.current = null;
        setPlayingKey(null);
      }
    };
    utter.onerror = (e) => {
      if (e.error !== "interrupted") setUnsupported(true);
      if (keyRef.current === key) {
        keyRef.current = null;
        setPlayingKey(null);
      }
    };

    window.speechSynthesis.speak(utter);
    return Promise.resolve(true);
  }, [stop]);

  return { playingKey, loadingKey: null, play, stop, unsupported, isSupported: supported };
}
