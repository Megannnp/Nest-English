const RECORDED_AUDIO_BASE = "/audio/phonemes";

const recorded = (file) => `${RECORDED_AUDIO_BASE}/${file}`;

export const RP_PHONEME_CATALOG = [
  { ipa: "/iː/", key: "iː", file: recorded("ii.mp3"), source: "recorded", text: "ee" },
  { ipa: "/ɪ/", key: "ɪ", file: recorded("i.mp3"), source: "recorded", text: "ih" },
  { ipa: "/e/", key: "e", file: recorded("e.mp3"), source: "recorded", text: "eh" },
  { ipa: "/æ/", key: "æ", file: recorded("ae.mp3"), source: "recorded", text: "aah" },
  { ipa: "/ɑː/", key: "ɑː", file: recorded("aa.mp3"), source: "recorded", text: "ah" },
  { ipa: "/ɒ/", key: "ɒ", file: recorded("o.mp3"), source: "recorded", text: "oh" },
  { ipa: "/ɔː/", key: "ɔː", file: recorded("oo.mp3"), source: "recorded", text: "aw" },
  { ipa: "/ʊ/", key: "ʊ", file: recorded("u.mp3"), source: "recorded", text: "uuh" },
  { ipa: "/uː/", key: "uː", file: recorded("uu.mp3"), source: "recorded", text: "oo" },
  { ipa: "/ʌ/", key: "ʌ", file: recorded("uh.mp3"), source: "recorded", text: "uh" },
  { ipa: "/ɜː/", key: "ɜː", file: recorded("er.mp3"), source: "recorded", text: "er" },
  { ipa: "/ə/", key: "ə", file: recorded("schwa.mp3"), source: "recorded", text: "uh" },
  { ipa: "/eɪ/", key: "eɪ", file: recorded("ei.mp3"), source: "recorded", text: "ay" },
  { ipa: "/aɪ/", key: "aɪ", file: recorded("ai.mp3"), source: "recorded", text: "eye" },
  { ipa: "/ɔɪ/", key: "ɔɪ", file: recorded("oi.mp3"), source: "recorded", text: "oy" },
  { ipa: "/əʊ/", key: "əʊ", file: recorded("ou.mp3"), source: "recorded", text: "oh" },
  { ipa: "/aʊ/", key: "aʊ", file: recorded("au.mp3"), source: "recorded", text: "ow" },
  { ipa: "/ɪə/", key: "ɪə", file: recorded("ia.mp3"), source: "recorded", text: "ear" },
  { ipa: "/eə/", key: "eə", file: recorded("ea.mp3"), source: "recorded", text: "air" },
  { ipa: "/ʊə/", key: "ʊə", file: recorded("ua.mp3"), source: "recorded", text: "oor" },

  { ipa: "/p/", key: "p", file: recorded("p.mp3"), source: "recorded", text: "puh" },
  { ipa: "/b/", key: "b", file: recorded("b.mp3"), source: "recorded", text: "buh" },
  { ipa: "/t/", key: "t", file: recorded("t.mp3"), source: "recorded", text: "tuh" },
  { ipa: "/d/", key: "d", file: recorded("d.mp3"), source: "recorded", text: "duh" },
  { ipa: "/k/", key: "k", file: recorded("k.mp3"), source: "recorded", text: "kuh" },
  { ipa: "/g/", key: "g", file: recorded("g.mp3"), source: "recorded", text: "guh" },
  { ipa: "/f/", key: "f", file: recorded("f.mp3"), source: "recorded", text: "fff" },
  { ipa: "/v/", key: "v", file: recorded("v.mp3"), source: "recorded", text: "vvv" },
  { ipa: "/θ/", key: "θ", file: recorded("th.mp3"), source: "recorded", text: "thh" },
  { ipa: "/ð/", key: "ð", file: recorded("dh.mp3"), source: "recorded", text: "thee" },
  { ipa: "/s/", key: "s", file: recorded("s.mp3"), source: "recorded", text: "sss" },
  { ipa: "/z/", key: "z", file: recorded("z.mp3"), source: "recorded", text: "zzz" },
  { ipa: "/ʃ/", key: "ʃ", file: recorded("sh.mp3"), source: "recorded", text: "shh" },
  { ipa: "/ʒ/", key: "ʒ", file: recorded("zh.mp3"), source: "recorded", text: "zhh" },
  { ipa: "/tʃ/", key: "tʃ", file: recorded("ch.mp3"), source: "recorded", text: "chuh" },
  { ipa: "/dʒ/", key: "dʒ", file: recorded("j.mp3"), source: "recorded", text: "juh" },
  { ipa: "/m/", key: "m", file: recorded("m.mp3"), source: "recorded", text: "mmm" },
  { ipa: "/n/", key: "n", file: recorded("n.mp3"), source: "recorded", text: "nnn" },
  { ipa: "/ŋ/", key: "ŋ", file: recorded("ng.mp3"), source: "recorded", text: "ng" },
  { ipa: "/l/", key: "l", file: recorded("l.mp3"), source: "recorded", text: "luh" },
  { ipa: "/r/", key: "r", file: recorded("r.mp3"), source: "recorded", text: "ruh" },
  { ipa: "/j/", key: "j", file: recorded("y.mp3"), source: "recorded", text: "yuh" },
  { ipa: "/w/", key: "w", file: recorded("w.mp3"), source: "recorded", text: "wuh" },
  { ipa: "/h/", key: "h", file: recorded("h.mp3"), source: "recorded", text: "huh" },

  { ipa: "/ts/", key: "ts", file: recorded("ts.mp3"), source: "ai-generated", text: "tsuh", cluster: true },
  { ipa: "/dz/", key: "dz", file: recorded("dz.mp3"), source: "recorded", text: "dzuh", cluster: true },
  { ipa: "/tr/", key: "tr", file: recorded("tr.mp3"), source: "recorded", text: "truh", cluster: true },
  { ipa: "/dr/", key: "dr", file: recorded("dr.mp3"), source: "recorded", text: "druh", cluster: true },
];

export const RP_PHONEME_BY_KEY = Object.fromEntries(RP_PHONEME_CATALOG.map(item => [item.key, item]));

export function normalizeIpaKey(ipa) {
  return String(ipa || "").replace(/\//g, "");
}
