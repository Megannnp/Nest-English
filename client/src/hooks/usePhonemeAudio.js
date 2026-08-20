import { useCallback, useRef, useState } from "react";

import { RP_PHONEME_BY_KEY, normalizeIpaKey } from "../phonetics/rpPhonemeCatalog.js";

const MISSING = new Set();

function playLocalAudio(path) {
  return new Promise(resolve => {
    if (!path || MISSING.has(path)) {
      resolve(false);
      return;
    }

    const audio = new Audio(path);
    audio.onended = () => resolve(true);
    audio.onerror = () => {
      MISSING.add(path);
      resolve(false);
    };
    audio.play().catch(() => {
      MISSING.add(path);
      resolve(false);
    });
  });
}

export default function usePhonemeAudio() {
  const [playingKey, setPlayingKey] = useState(null);
  const keyRef = useRef(null);

  const stop = useCallback(() => {
    keyRef.current = null;
    setPlayingKey(null);
  }, []);

  const play = useCallback(async (key, ipa) => {
    if (keyRef.current === key) {
      stop();
      return false;
    }

    stop();
    keyRef.current = key;
    setPlayingKey(key);

    const item = RP_PHONEME_BY_KEY[normalizeIpaKey(ipa)];
    const played = await playLocalAudio(item?.file);

    if (keyRef.current === key) {
      keyRef.current = null;
      setPlayingKey(null);
    }

    return played;
  }, [stop]);

  return { playingKey, play, stop };
}
