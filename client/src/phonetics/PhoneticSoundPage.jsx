import { useEffect, useState } from "react";

import { recordPhoneticsProgress } from "./phoneticsProgressClient.js";
import PhoneticTopBar from "./PhoneticTopBar.jsx";
import PageHero from "../components/shared/PageHero.jsx";
import useDictionaryAudio from "../hooks/useDictionaryAudio.js";
import usePhonemeAudio from "../hooks/usePhonemeAudio.js";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./phonetics.css";

const VOWELS_MONO = [
  { letter: "Aa", sounds: [
    { ipa: "/ɑː/", word: "car",  hl: "ar", zh: "长a" },
    { ipa: "/ʌ/",  word: "cup",  hl: "u",  zh: "短u音" },
    { ipa: "/æ/",  word: "cat",  hl: "a",  zh: "短a" },
  ]},
  { letter: "Ee", sounds: [
    { ipa: "/ɜː/", word: "bird", hl: "ir", zh: "长er" },
    { ipa: "/ə/",  word: "sofa", hl: "a",  zh: "弱读音" },
    { ipa: "/e/",  word: "bed",  hl: "e",  zh: "短e" },
  ]},
  { letter: "Ii", sounds: [
    { ipa: "/iː/", word: "see",  hl: "ee", zh: "长i" },
    { ipa: "/ɪ/",  word: "sit",  hl: "i",  zh: "短i" },
  ]},
  { letter: "Oo", sounds: [
    { ipa: "/ɔː/", word: "saw",  hl: "aw", zh: "长o" },
    { ipa: "/ɒ/",  word: "hot",  hl: "o",  zh: "短o" },
  ]},
  { letter: "Uu", sounds: [
    { ipa: "/uː/", word: "blue", hl: "ue", zh: "长u" },
    { ipa: "/ʊ/",  word: "book", hl: "oo", zh: "短u" },
  ]},
];

const VOWELS_DI = [
  { ending: "+ɪ", sounds: [
    { ipa: "/eɪ/", word: "day", hl: "ay", zh: "字母a音" },
    { ipa: "/aɪ/", word: "my",  hl: "y",  zh: "字母i音" },
    { ipa: "/ɔɪ/", word: "boy", hl: "oy", zh: "oi音" },
  ]},
  { ending: "+ʊ", sounds: [
    { ipa: "/əʊ/", word: "go",  hl: "o",   zh: "字母o音" },
    { ipa: "/aʊ/", word: "now", hl: "ow",  zh: "ao音" },
  ]},
  { ending: "+ə", sounds: [
    { ipa: "/ɪə/", word: "ear",  hl: "ear", zh: "ear音" },
    { ipa: "/eə/", word: "air",  hl: "air", zh: "air音" },
    { ipa: "/ʊə/", word: "tour", hl: "our", zh: "oor音" },
  ]},
];

const CONSONANT_PAIRS = [
  { voiceless: "/p/", voiced: "/b/", wvl: "pen",    wvd: "big",    hlVl: "p",  hlVd: "b"   },
  { voiceless: "/t/", voiced: "/d/", wvl: "top",    wvd: "dog",    hlVl: "t",  hlVd: "d"   },
  { voiceless: "/k/", voiced: "/g/", wvl: "cat",    wvd: "get",    hlVl: "c",  hlVd: "g"   },
  { voiceless: "/f/", voiced: "/v/", wvl: "fat",    wvd: "van",    hlVl: "f",  hlVd: "v"   },
  { voiceless: "/s/", voiced: "/z/", wvl: "see",    wvd: "zoo",    hlVl: "s",  hlVd: "z"   },
  { voiceless: "/θ/", voiced: "/ð/", wvl: "think",  wvd: "this",   hlVl: "th", hlVd: "th"  },
  { voiceless: "/ʃ/", voiced: "/ʒ/", wvl: "ship",   wvd: "vision", hlVl: "sh", hlVd: "si"  },
  { voiceless: "/tʃ/",voiced: "/dʒ/",wvl: "chin",   wvd: "judge",  hlVl: "ch", hlVd: "j"   },
];

const CONSONANT_CLUSTER_PAIRS = [
  { voiceless: "/ts/", voiced: "/dz/", wvl: "bits",  wvd: "beds",  hlVl: "ts", hlVd: "ds" },
  { voiceless: "/tr/", voiced: "/dr/", wvl: "tree",  wvd: "drink", hlVl: "tr", hlVd: "dr" },
];

const NASALS     = [{ ipa: "/m/", word: "man",  hl: "m"  }, { ipa: "/n/", word: "no",   hl: "n"  }, { ipa: "/ŋ/", word: "sing", hl: "ng" }];
const LIQUIDS    = [{ ipa: "/l/", word: "leg",  hl: "l"  }, { ipa: "/r/", word: "red",  hl: "r"  }];
const SEMIVOWELS = [{ ipa: "/w/", word: "wet",  hl: "w"  }, { ipa: "/j/", word: "yes",  hl: "y"  }];
const GLOTTAL    = { ipa: "/h/", word: "hat",  hl: "h" };


function HighlightedWord({ word, hl }) {
  if (!hl || !word) return word;
  const idx = word.toLowerCase().indexOf(hl.toLowerCase());
  if (idx === -1) return word;
  return (
    <>
      {word.slice(0, idx)}
      <span className="ph-word-hl">{word.slice(idx, idx + hl.length)}</span>
      {word.slice(idx + hl.length)}
    </>
  );
}

function PhonemeCard({ ipa, word, hl, zh, onSpeakPhoneme, onSpeakWord, onComplete, phonemeAudio = true }) {
  const [ipaActive, setIpaActive] = useState(false);
  const [wordActive, setWordActive] = useState(false);

  async function handleIpaClick() {
    const played = phonemeAudio
      ? await onSpeakPhoneme(`ph-ipa-${ipa}`, ipa)
      : await onSpeakWord(`ph-ipa-word-${word}`, word, 0.85);
    if (played) {
      setIpaActive(true);
      onComplete?.({ target: "phoneme", ipa, word });
      setTimeout(() => setIpaActive(false), 900);
    }
  }
  async function handleWordClick(e) {
    e.stopPropagation();
    if (await onSpeakWord(`ph-word-${word}`, word, 0.85)) {
      setWordActive(true);
      onComplete?.({ target: "word", ipa, word });
      setTimeout(() => setWordActive(false), 1200);
    }
  }

  return (
    <div className="ph-phoneme-card">
      <button
        type="button"
        className={`ph-phoneme-card__ipa-btn${ipaActive ? " is-playing" : ""}`}
        onClick={handleIpaClick}
        title={phonemeAudio ? `听 ${ipa} 音素` : `听 ${ipa} 例词 ${word}`}
      >
        {ipa}
      </button>
      <button
        type="button"
        className={`ph-phoneme-card__word-btn${wordActive ? " is-playing" : ""}`}
        onClick={handleWordClick}
        title={`听单词 ${word}`}
      >
        <HighlightedWord word={word} hl={hl} />
      </button>
      {zh && <span className="ph-phoneme-card__zh">{zh}</span>}
    </div>
  );
}

function PairCard({ voiceless, voiced, wvl, wvd, hlVl, hlVd, onSpeakPhoneme, onSpeakWord, onComplete, phonemeAudio = true }) {
  const [ipaVlActive, setIpaVlActive] = useState(false);
  const [wordVlActive, setWordVlActive] = useState(false);
  const [ipaVdActive, setIpaVdActive] = useState(false);
  const [wordVdActive, setWordVdActive] = useState(false);

  function mkIpaHandler(ipa, word, setActive) {
    return async () => {
      const played = phonemeAudio
        ? await onSpeakPhoneme(`pair-ipa-${ipa}`, ipa)
        : await onSpeakWord(`pair-ipa-word-${word}`, word, 0.85);
      if (played) {
        onComplete?.({ target: "pair-phoneme", ipa, word, pair: [voiceless, voiced] });
        setActive(true); setTimeout(() => setActive(false), 900);
      }
    };
  }
  function mkWordHandler(word, setActive) {
    return async () => {
      if (await onSpeakWord(`pair-word-${word}`, word, 0.85)) {
        onComplete?.({ target: "pair-word", word, pair: [wvl, wvd] });
        setActive(true); setTimeout(() => setActive(false), 1200);
      }
    };
  }

  return (
    <div className="ph-pair-card">
      <div className="ph-pair-side ph-pair-side--vl">
        <button type="button" className={`ph-pair-ipa-btn${ipaVlActive ? " is-playing" : ""}`}
          onClick={mkIpaHandler(voiceless, wvl, setIpaVlActive)} title={phonemeAudio ? `听 ${voiceless} 音素` : `听 ${voiceless} 例词 ${wvl}`}>
          {voiceless}
        </button>
        <button type="button" className={`ph-pair-word-btn${wordVlActive ? " is-playing" : ""}`}
          onClick={mkWordHandler(wvl, setWordVlActive)} title={`听单词 ${wvl}`}>
          <HighlightedWord word={wvl} hl={hlVl} />
        </button>
        <span className="ph-pair-badge ph-pair-badge--vl">清</span>
      </div>
      <span className="ph-pair-dash">–</span>
      <div className="ph-pair-side ph-pair-side--vd">
        <button type="button" className={`ph-pair-ipa-btn${ipaVdActive ? " is-playing" : ""}`}
          onClick={mkIpaHandler(voiced, wvd, setIpaVdActive)} title={phonemeAudio ? `听 ${voiced} 音素` : `听 ${voiced} 例词 ${wvd}`}>
          {voiced}
        </button>
        <button type="button" className={`ph-pair-word-btn${wordVdActive ? " is-playing" : ""}`}
          onClick={mkWordHandler(wvd, setWordVdActive)} title={`听单词 ${wvd}`}>
          <HighlightedWord word={wvd} hl={hlVd} />
        </button>
        <span className="ph-pair-badge ph-pair-badge--vd">浊</span>
      </div>
    </div>
  );
}

export default function PhoneticSoundPage({
  onNavigate, onLoginClick, onRegisterClick, user, onAccountClick,
  activePage = "phonetics-sound",
  hideTopBar = false}) {
  const tts  = usePhonemeAudio();
  const dict = useDictionaryAudio();
  const pageRef = useScrollReveal();
  const [recordError, setRecordError] = useState("");
  useEffect(() => {
    function handleRecordFailed(event) {
      setRecordError(event?.detail || "练习记录保存失败，语音成长页可能暂未更新。");
    }
    window.addEventListener?.("nest:phonetics-record-failed", handleRecordFailed);
    return () => window.removeEventListener?.("nest:phonetics-record-failed", handleRecordFailed);
  }, []);
  const recordSoundPractice = (metadata) => {
    recordPhoneticsProgress(user, {
      activityType: "sound-practice",
      metadata: {
        page: activePage,
        ...metadata,
      },
    });
  };

  return (
    <div className="ph-page" ref={pageRef}>
      {!hideTopBar && (

        <PhoneticTopBar
        onNavigate={onNavigate}
        onLogin={onLoginClick}
        onRegister={onRegisterClick}
        user={user}
        onAccountClick={onAccountClick}
        activePage={activePage}
      />

      )}
      <div className="ph-sound-page">
        <PageHero
          eyebrow="筑巢语音 · 音素"
          title="认准音素，读对单词。"
          description="点击音标听 RP 标准音，点击例词听真实单词录音。"
        />
        {recordError ? (
          <div className="gm-quiz-error-msg" role="alert">
            <p>{recordError}</p>
          </div>
        ) : null}

        <section className="ph-framework-grid ph-sound-category-grid studio-reveal studio-reveal--delay-1">
          <article className="ph-framework-card ph-sound-category-card">
            <section className="ph-sound-section" aria-label="元音音素">
              <div className="ph-sound-section-hd">
                <h2 className="ph-sound-section-title">元音 <span className="ph-sound-count">20</span></h2>
                <p className="ph-sound-section-desc">点击音标听音素发音 · 点击单词听真人示例朗读</p>
              </div>

              <div className="ph-sound-block">
                <h3 className="ph-sound-block-title">单元音 <em>12 个</em></h3>
                <div className="ph-mono-vowels">
                  {VOWELS_MONO.map(group => (
                    <div key={group.letter} className="ph-letter-row">
                      <div className="ph-letter-badge">{group.letter}</div>
                      <div className="ph-letter-sounds">
                        {group.sounds.map(s => <PhonemeCard key={s.ipa} {...s} onSpeakPhoneme={tts.play} onSpeakWord={dict.play} onComplete={recordSoundPractice} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ph-sound-block">
                <h3 className="ph-sound-block-title">双元音 <em>8 个</em></h3>
                <div className="ph-di-vowels">
                  {VOWELS_DI.map(group => (
                    <div key={group.ending} className="ph-di-row">
                      <div className="ph-di-ending">{group.ending}</div>
                      <div className="ph-di-sounds">
                        {group.sounds.map(s => <PhonemeCard key={s.ipa} {...s} onSpeakPhoneme={tts.play} onSpeakWord={dict.play} onComplete={recordSoundPractice} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </article>

          <article className="ph-framework-card ph-sound-category-card">
            <section className="ph-sound-section ph-sound-section--cons" aria-label="辅音音素">
              <div className="ph-sound-section-hd">
                <h2 className="ph-sound-section-title">辅音 <span className="ph-sound-count">24</span></h2>
                <p className="ph-sound-section-desc">点击音标听音素发音 · 点击单词听真人示例朗读</p>
              </div>

              <div className="ph-sound-block">
                <h3 className="ph-sound-block-title">清辅音 · 浊辅音 对照</h3>
                <div className="ph-pair-grid">
                  {CONSONANT_PAIRS.map(p => <PairCard key={p.voiceless} {...p} onSpeakPhoneme={tts.play} onSpeakWord={dict.play} onComplete={recordSoundPractice} />)}
                </div>
              </div>

              <div className="ph-sound-block">
                <h3 className="ph-sound-block-title">辅音连缀例词</h3>
                <div className="ph-pair-grid ph-pair-grid--clusters">
                  {CONSONANT_CLUSTER_PAIRS.map(p => <PairCard key={p.voiceless} {...p} onSpeakPhoneme={tts.play} onSpeakWord={dict.play} onComplete={recordSoundPractice} />)}
                </div>
              </div>

              <div className="ph-sound-block">
                <h3 className="ph-sound-block-title">其他浊辅音</h3>
                <div className="ph-other-cons">
                  <div className="ph-other-group">
                    <span className="ph-other-label">鼻音</span>
                    <div className="ph-other-sounds">
                      {NASALS.map(s => <PhonemeCard key={s.ipa} {...s} onSpeakPhoneme={tts.play} onSpeakWord={dict.play} onComplete={recordSoundPractice} />)}
                    </div>
                  </div>
                  <div className="ph-other-group">
                    <span className="ph-other-label">流音</span>
                    <div className="ph-other-sounds">
                      {LIQUIDS.map(s => <PhonemeCard key={s.ipa} {...s} onSpeakPhoneme={tts.play} onSpeakWord={dict.play} onComplete={recordSoundPractice} />)}
                    </div>
                  </div>
                  <div className="ph-other-group">
                    <span className="ph-other-label">半元音</span>
                    <div className="ph-other-sounds">
                      {SEMIVOWELS.map(s => <PhonemeCard key={s.ipa} {...s} onSpeakPhoneme={tts.play} onSpeakWord={dict.play} onComplete={recordSoundPractice} />)}
                    </div>
                  </div>
                  <div className="ph-other-group">
                    <span className="ph-other-label">声门音</span>
                    <div className="ph-other-sounds">
                      <PhonemeCard {...GLOTTAL} onSpeakPhoneme={tts.play} onSpeakWord={dict.play} onComplete={recordSoundPractice} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </article>
        </section>

      </div>
    </div>
  );
}
