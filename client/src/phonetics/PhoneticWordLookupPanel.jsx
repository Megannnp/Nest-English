import { useState } from "react";

import PhoneticIpaPhonemes from "./PhoneticIpaPhonemes.jsx";
import { phoneticsAPI } from "../api/index.js";
import useTTS from "../hooks/useTTS.js";

function SyllableChips({ syllables }) {
  if (!syllables?.length) return null;
  return (
    <div className="ph-word-syllables">
      {syllables.map((syllable, index) => (
        <span
          className={`ph-word-syllables__chip${syllable.stressed ? " ph-word-syllables__chip--stressed" : ""}`}
          key={`${syllable.text}-${index}`}
        >
          <span className="ph-word-syllables__text">{syllable.text}</span>
          {syllable.ipa ? <span className="ph-word-syllables__ipa">{syllable.ipa}</span> : null}
        </span>
      ))}
    </div>
  );
}

function PhraseCard({ phrase, playingKey, loadingKey, onPlay, index }) {
  const key = `phonetic-word-phrase-${index}-${phrase.phrase}`;
  const isPlaying = playingKey === key;
  const isLoading = loadingKey === key;

  return (
    <div className="ph-word-phrase">
      <div className="ph-word-phrase__head">
        <button
          type="button"
          className={`ph-annot-play${isPlaying ? " is-playing" : ""}`}
          onClick={() => onPlay(key, phrase.phrase)}
          disabled={isLoading}
          aria-label={isPlaying ? "停止朗读" : "播放朗读"}
        >
          {isLoading ? "…" : isPlaying ? "■" : "▶"}
        </button>
        <span className="ph-word-phrase__text">{phrase.phrase}</span>
      </div>
      {phrase.ipa ? <PhoneticIpaPhonemes ipa={phrase.ipa} idPrefix={`phrase-${index}`} /> : null}
      {phrase.teaching ? <p className="ph-word-phrase__teaching">{phrase.teaching}</p> : null}
    </div>
  );
}

function WordLookupResult({ result, playingKey, loadingKey, unsupported, ttsErrorMessage, onPlay }) {
  const wordKey = "phonetic-word-main";
  return (
    <div className="ph-word-result" aria-live="polite">
      {result.correction ? (
        <div className="ph-word-correction" role="status">
          <b>拼写提示：</b>"{result.correction.original}" {result.correction.note}
        </div>
      ) : null}
      {unsupported ? (
        <div className="ph-annot-tts-warning" role="status">
          {ttsErrorMessage || "语音服务暂时不可用，请稍后重试或检查网络连接。"}
        </div>
      ) : null}

      <div className="ph-word-headline">
        <button
          type="button"
          className={`ph-annot-play${playingKey === wordKey ? " is-playing" : ""}`}
          onClick={() => onPlay(wordKey, result.word)}
          disabled={loadingKey === wordKey}
          aria-label={playingKey === wordKey ? "停止朗读" : "播放朗读"}
        >
          {loadingKey === wordKey ? "…" : playingKey === wordKey ? "■" : "▶"}
        </button>
        <span className="ph-word-headline__text">{result.word}</span>
        <PhoneticIpaPhonemes ipa={result.ipa} idPrefix="word" />
      </div>

      <SyllableChips syllables={result.syllables} />
      {result.syllableTeaching ? <p className="ph-word-teaching">{result.syllableTeaching}</p> : null}

      {result.definitions?.length ? (
        <ul className="ph-word-definitions">
          {result.definitions.map((definition, index) => (
            <li key={`${definition.pos}-${index}`}>
              {definition.pos ? <b>{definition.pos}</b> : null} {definition.meaning}
            </li>
          ))}
        </ul>
      ) : null}

      {result.phrases?.length ? (
        <div className="ph-word-phrases">
          {result.phrases.map((phrase, index) => (
            <PhraseCard
              key={`${phrase.phrase}-${index}`}
              phrase={phrase}
              index={index}
              playingKey={playingKey}
              loadingKey={loadingKey}
              onPlay={onPlay}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function PhoneticWordLookupPanel() {
  const [word, setWord] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { play, playingKey, loadingKey, unsupported, errorMessage: ttsErrorMessage } = useTTS();

  async function handleQuery(event) {
    event.preventDefault();
    if (!word.trim()) return;
    setError("");
    setLoading(true);
    try {
      const data = await phoneticsAPI.analyzeWord({ word: word.trim() });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err?.message || "查词失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ph-annot-panel studio-reveal studio-reveal--delay-2" aria-label="单词与短语语音查询">
      <h2 className="ph-annot-panel__title">单词语音查词</h2>
      <p className="ph-annot-panel__desc">
        输入一个英文单词，AI 生成音标（可逐个音素点读）、音节划分与拼读讲解、释义，以及包含该词的常用短语，单词和短语都可以点击播放朗读。
      </p>
      <form className="ph-annot-form" onSubmit={handleQuery}>
        <label className="ph-annot-form__label" htmlFor="ph-word-input">
          英文单词
        </label>
        <input
          id="ph-word-input"
          className="ph-word-input"
          type="text"
          value={word}
          onChange={(event) => setWord(event.target.value)}
          placeholder="输入一个英文单词，例如：elephant"
          maxLength={60}
        />
        {error ? <div className="ph-annot-form__error" role="alert">{error}</div> : null}
        <div className="ph-annot-form__actions">
            <button type="submit" className="ph-annot-form__submit" aria-label={loading ? "查询中" : "查询"} disabled={loading || !word.trim()}>
            {loading ? "查询中…" : "查询"}
          </button>
        </div>
      </form>

      {result ? (
        <WordLookupResult
          result={result}
          playingKey={playingKey}
          loadingKey={loadingKey}
          unsupported={unsupported}
          ttsErrorMessage={ttsErrorMessage}
          onPlay={play}
        />
      ) : null}
    </section>
  );
}
