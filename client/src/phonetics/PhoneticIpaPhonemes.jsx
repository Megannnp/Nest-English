import { useMemo } from "react";

import { tokenizeIpa } from "./ipaTokenizer.js";
import usePhonemeAudio from "../hooks/usePhonemeAudio.js";

export default function PhoneticIpaPhonemes({ ipa, idPrefix = "ph-ipa" }) {
  const tokens = useMemo(() => tokenizeIpa(ipa), [ipa]);
  const { playingKey, play } = usePhonemeAudio();

  if (!ipa) return null;

  return (
    <span className="ph-ipa-phonemes">
      <span className="ph-ipa-phonemes__slash">/</span>
      {tokens.map((token, index) => {
        const key = `${idPrefix}-${index}-${token.text}`;
        if (!token.playable) {
          return (
            <span className="ph-ipa-phonemes__mark" key={key}>
              {token.text}
            </span>
          );
        }
        return (
          <button
            type="button"
            className={`ph-ipa-phonemes__btn${playingKey === key ? " is-playing" : ""}`}
            onClick={() => play(key, token.key)}
            title={`听音素 /${token.key}/`}
            key={key}
          >
            {token.text}
          </button>
        );
      })}
      <span className="ph-ipa-phonemes__slash">/</span>
    </span>
  );
}
