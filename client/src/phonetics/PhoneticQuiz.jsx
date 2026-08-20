import { useState, useEffect } from "react";

function PhoneticAnalysisCard({ options, answer, optionsAnalysis, explanation }) {
  const hasPerOption = optionsAnalysis && Object.keys(optionsAnalysis).length > 0;
  return (
    <div className="ph-analysis-card">
      <div className="ph-analysis-card__title">题目解析</div>
      {options && hasPerOption ? (
        <div className="ph-analysis-card__options">
          {options.map(opt => {
            const letter = opt[0];
            const isAns = letter === answer;
            const analysis = optionsAnalysis[letter];
            return (
              <div key={letter} className={`ph-analysis-opt${isAns ? ' ph-analysis-opt--correct' : ' ph-analysis-opt--wrong'}`}>
                <span className={isAns ? '' : 'ph-analysis-opt__text--strike'}>{isAns ? '✓ ' : ''}{opt}</span>
                {analysis && <span className="ph-analysis-opt__reason">{analysis}</span>}
              </div>
            );
          })}
        </div>
      ) : null}
      {explanation && (
        <div className="ph-analysis-card__explanation">{explanation}</div>
      )}
    </div>
  );
}

export default function PhoneticQuiz({ quiz }) {
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    setAnswers({});
    setCurrentIndex(0);
    setAllDone(false);
  }, [quiz]);

  if (!quiz || quiz.length === 0) return null;

  const current = quiz[currentIndex];
  const isLast = currentIndex === quiz.length - 1;
  const currentAnswered = !!answers[current.id];
  const correct = allDone ? quiz.filter(q => answers[q.id] === q.answer).length : 0;

  function handleAnswer(qId, letter) {
    if (answers[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: letter }));
  }

  function handleNext() {
    if (isLast) {
      setAllDone(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }

  function handleRedo() {
    setAnswers({});
    setCurrentIndex(0);
    setAllDone(false);
  }

  if (allDone) {
    return (
      <div className="ph-quiz">
        <div className="ph-quiz__result">
          <span className="ph-quiz__result-score">{correct} / {quiz.length} 正确</span>
          <button type="button" className="ph-quiz__btn ph-quiz__btn--ghost" onClick={handleRedo}>重做一遍</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-quiz">
      <div className="ph-quiz__header">
        <span className="ph-quiz__label">随堂练习</span>
        <span className="ph-quiz__count">{currentIndex + 1} / {quiz.length}</span>
      </div>
      <div className="ph-quiz__progress">
        {quiz.map((q, i) => (
          <div
            key={i}
            className={`ph-quiz__dot ${answers[q.id] === q.answer ? "correct" : ""} ${answers[q.id] && answers[q.id] !== q.answer ? "wrong" : ""} ${i === currentIndex ? "current" : ""} ${i < currentIndex ? "done" : ""}`}
          />
        ))}
      </div>
      <p className="ph-quiz__question">{current.question}</p>
      <div className="ph-quiz__options">
        {current.options.map(opt => {
          const letter = opt[0];
          const selected = answers[current.id] === letter;
          const isAnswer = currentAnswered && letter === current.answer;
          const isWrong = currentAnswered && selected && letter !== current.answer;
          return (
            <button
              key={opt}
              type="button"
              className={`ph-quiz__option ${selected ? "selected" : ""} ${isAnswer ? "answer" : ""} ${isWrong ? "wrong" : ""}`}
              onClick={() => handleAnswer(current.id, letter)}
              disabled={currentAnswered}
            >{opt}</button>
          );
        })}
      </div>
      {currentAnswered && (
        <PhoneticAnalysisCard
          options={current.options}
          answer={current.answer}
          optionsAnalysis={current.optionsAnalysis}
          explanation={current.explanation}
        />
      )}
      {currentAnswered && (
        <div className="ph-quiz__actions">
          <button type="button" className="ph-quiz__btn ph-quiz__btn--primary" aria-label={isLast ? "查看结果" : "下一题"} onClick={handleNext}>
            {isLast ? "查看结果" : "下一题 →"}
          </button>
        </div>
      )}
    </div>
  );
}
