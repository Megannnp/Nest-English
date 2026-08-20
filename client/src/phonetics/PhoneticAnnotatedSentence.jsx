import { buildAnnotatedText } from "./phoneticAnnotationText.js";

const STRESS_MARK = {
  strong: "●",
  weak: "○",
};

const INTONATION_MARK = {
  rise: "↗",
  fall: "↘",
};

function AnnotatedWord({ token }) {
  const stressMark = STRESS_MARK[token.stress] || "";
  return (
    <span className="ph-annot-word">
      <span className="ph-annot-word__ipa">{token.ipa ? `/${token.ipa}/` : " "}</span>
      <span
        className={`ph-annot-word__text${token.otherFeature ? " ph-annot-word__text--other" : ""}`}
        title={token.otherFeature ? token.otherFeature.note : undefined}
      >
        {token.word}
        {token.dropPlosionEnd ? (
          <sup className="ph-annot-word__plosion" title="失去爆破">̚</sup>
        ) : null}
        {token.trailingPunct}
      </span>
      <span
        className={`ph-annot-word__stress${token.stress !== "none" ? ` ph-annot-word__stress--${token.stress}` : ""}`}
      >
        {stressMark || " "}
      </span>
    </span>
  );
}

export default function PhoneticAnnotatedSentence({ sentence, playingKey, loadingKey, onPlay }) {
  const key = `phonetic-annot-${sentence.text}`;
  const isPlaying = playingKey === key;
  const isLoading = loadingKey === key;

  return (
    <div className="ph-annot-row">
      <button
        type="button"
        className={`ph-annot-play${isPlaying ? " is-playing" : ""}`}
        onClick={() => onPlay(key, sentence.text)}
        disabled={isLoading}
        aria-label={isPlaying ? "停止朗读" : "播放朗读"}
      >
        {isLoading ? "…" : isPlaying ? "■" : "▶"}
      </button>
      <div className="ph-annot-row__body">
        <p className="ph-annot-row__marked-text">{buildAnnotatedText(sentence)}</p>
        <div className="ph-annot-row__words">
          {sentence.tokens.map((token, index) => (
            <span className="ph-annot-word-slot" key={`${token.word}-${index}`}>
              <AnnotatedWord token={token} />
              {token.linkNext ? <span className="ph-annot-link" title="连读">‿</span> : null}
              {token.assimilationNext ? (
                <span
                  className="ph-annot-assimilation"
                  title={`同化：${token.assimilationNext.type} → ${token.assimilationNext.result}`}
                >
                  →
                </span>
              ) : null}
              {token.pauseAfter ? <span className="ph-annot-pause" title="意群停顿">/</span> : null}
              {token.intonationAfter ? (
                <span className="ph-annot-intonation" title="语调走向">
                  {INTONATION_MARK[token.intonationAfter]}
                </span>
              ) : null}
            </span>
          ))}
        </div>
        {sentence.explanations?.length ? (
          <dl className="ph-annot-explain">
            {sentence.explanations.map((item, index) => (
              <div className="ph-annot-explain__item" key={`${item.category}-${index}`}>
                <dt>{item.category}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </div>
  );
}
