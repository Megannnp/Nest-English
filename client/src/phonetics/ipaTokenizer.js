import { RP_PHONEME_CATALOG } from "./rpPhonemeCatalog.js";

const SORTED_KEYS = [...RP_PHONEME_CATALOG]
  .map((item) => item.key)
  .sort((a, b) => b.length - a.length);

function matchAt(text, index) {
  return SORTED_KEYS.find((key) => text.startsWith(key, index)) || null;
}

/**
 * Splits a raw IPA string (no slashes) into phoneme tokens using longest-match
 * against the recorded phoneme catalog. Stress marks, syllable dots, and any
 * other characters that aren't in the catalog are grouped into non-playable
 * text runs rather than dropped.
 */
export function tokenizeIpa(ipa) {
  const text = String(ipa || "").replace(/\//g, "");
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const match = matchAt(text, i);
    if (match) {
      tokens.push({ text: match, key: match, playable: true });
      i += match.length;
      continue;
    }

    let j = i + 1;
    while (j < text.length && !matchAt(text, j)) j += 1;
    tokens.push({ text: text.slice(i, j), key: null, playable: false });
    i = j;
  }

  return tokens;
}
