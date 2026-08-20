import { describe, expect, it } from "vitest";

import { RP_PHONEME_BY_KEY, RP_PHONEME_CATALOG } from "./rpPhonemeCatalog.js";

describe("RP phoneme catalog", () => {
  it("uses recorded root audio for consonants with reported drift", () => {
    expect(RP_PHONEME_BY_KEY.p.file).toBe("/audio/phonemes/p.mp3");
    expect(RP_PHONEME_BY_KEY.b.file).toBe("/audio/phonemes/b.mp3");
    expect(RP_PHONEME_BY_KEY["tʃ"].file).toBe("/audio/phonemes/ch.mp3");
    expect(RP_PHONEME_BY_KEY.h.file).toBe("/audio/phonemes/h.mp3");
    expect(RP_PHONEME_BY_KEY.m.file).toBe("/audio/phonemes/m.mp3");
    expect(RP_PHONEME_BY_KEY.n.file).toBe("/audio/phonemes/n.mp3");
  });

  it("keeps one unique audio file per phoneme row", () => {
    expect(new Set(RP_PHONEME_CATALOG.map((item) => item.file)).size).toBe(RP_PHONEME_CATALOG.length);
  });
});
