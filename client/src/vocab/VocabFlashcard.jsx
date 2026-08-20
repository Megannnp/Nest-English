import { useState } from "react";

export default function VocabFlashcard({ word, onKnow, onReview }) {
  const [flipped, setFlipped] = useState(false);
  if (!word) return null;

  function flip() {
    setFlipped((value) => !value);
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    flip();
  }

  return (
    <div className="vc-flashcard-wrap">
      <button
        type="button"
        className={`vc-flashcard${flipped ? " vc-flashcard--flipped" : ""}`}
        onClick={flip}
        onKeyDown={handleKeyDown}
      >
        <div className="vc-flashcard__inner">
          <div className="vc-flashcard__front">
            <div className="vc-flashcard__hint">点击翻面查看释义</div>
            <div className="vc-flashcard__word">{word.word}</div>
            <div className="vc-flashcard__pos">{word.pos} {word.phonetic}</div>
          </div>
          <div className="vc-flashcard__back">
            <div className="vc-flashcard__zh">{word.zh}</div>
            <div className="vc-flashcard__example">{word.example}</div>
            {word.tip ? <div className="vc-flashcard__tip">💡 {word.tip}</div> : null}
          </div>
        </div>
      </button>
      {flipped && (
        <div className="vc-flashcard__actions">
          <button type="button" className="vc-fc-btn vc-fc-btn--review" onClick={onReview}>再看看 ↩</button>
          <button type="button" className="vc-fc-btn vc-fc-btn--know" onClick={onKnow}>认识了 ✓</button>
        </div>
      )}
    </div>
  );
}
