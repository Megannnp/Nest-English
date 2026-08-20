export default function GrammarAnalysisCard({ options, answer, optionsAnalysis, explanation }) {
  const hasPerOption = optionsAnalysis && Object.keys(optionsAnalysis).length > 0;
  return (
    <div className="gm-analysis-card">
      <div className="gm-analysis-card__title">题目解析</div>
      {options && hasPerOption ? (
        <div className="gm-analysis-card__options">
          {options.map((opt) => {
            const letter = opt[0];
            const isAns = letter === answer;
            const analysis = optionsAnalysis[letter];
            return (
              <div key={letter} className={`gm-analysis-opt${isAns ? " gm-analysis-opt--correct" : " gm-analysis-opt--wrong"}`}>
                <span className={isAns ? "" : "gm-analysis-opt__text--strike"}>{isAns ? "✓ " : ""}{opt}</span>
                {analysis && <span className="gm-analysis-opt__reason">{analysis}</span>}
              </div>
            );
          })}
        </div>
      ) : null}
      {explanation && (
        <div className="gm-analysis-card__explanation">{explanation}</div>
      )}
      <div className="gm-analysis-card__footer">
        <span className="gm-analysis-card__footer-main">选项逐条析</span>
        <span className="gm-analysis-card__footer-sub">错误原因 · 难词解释 · 语法规则</span>
      </div>
    </div>
  );
}
