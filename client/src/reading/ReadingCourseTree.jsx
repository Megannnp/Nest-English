import { useState } from "react";

/* ── Per-option analysis card ────────────────────────────── */
function AnalysisCard({ options, answer, optionsAnalysis, explanation }) {
  const hasPerOption = optionsAnalysis && Object.keys(optionsAnalysis).length > 0;
  return (
    <div className="rdc-analysis-card">
      <div className="rdc-analysis-card__title">题目解析</div>
      {options && hasPerOption ? (
        <div className="rdc-analysis-card__options">
          {options.map(opt => {
            const letter = opt[0];
            const isAns = letter === answer;
            const analysis = optionsAnalysis[letter];
            return (
              <div key={letter} className={`rdc-analysis-opt${isAns ? " rdc-analysis-opt--correct" : " rdc-analysis-opt--wrong"}`}>
                <span className={isAns ? "" : "rdc-analysis-opt__strike"}>{isAns ? "✓ " : ""}{opt}</span>
                {analysis && <span className="rdc-analysis-opt__reason">{analysis}</span>}
              </div>
            );
          })}
        </div>
      ) : null}
      {explanation && <div className="rdc-analysis-card__explanation">{explanation}</div>}
    </div>
  );
}

/* ── Per-question quiz ───────────────────────────────────── */
function InlineQuiz({ quiz, onDone }) {
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);

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
      const correctCount = quiz.filter(q => answers[q.id] === q.answer).length;
      setAllDone(true);
      onDone?.({ correct: correctCount, total: quiz.length });
    } else {
      setCurrentIndex(i => i + 1);
    }
  }

  function handleRedo() {
    setAnswers({}); setCurrentIndex(0); setAllDone(false);
  }

  if (allDone) {
    return (
      <div className="rdc-quiz">
        <div className="rdc-quiz__result">
          <span className="rdc-quiz__result-score">{correct} / {quiz.length} 正确</span>
          <button type="button" className="rdc-quiz__btn rdc-quiz__btn--ghost" onClick={handleRedo}>重做一遍</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rdc-quiz">
      <div className="rdc-quiz__header">
        <span className="rdc-quiz__label">随堂小测</span>
        <span className="rdc-quiz__count">{currentIndex + 1} / {quiz.length}</span>
      </div>
      <div className="rdc-quiz__progress">
        {quiz.map((q, i) => (
          <div key={i} className={[
            "rdc-quiz__dot",
            answers[q.id] === q.answer ? "correct" : "",
            answers[q.id] && answers[q.id] !== q.answer ? "wrong" : "",
            i === currentIndex ? "current" : "",
            i < currentIndex ? "done" : "",
          ].join(" ")} />
        ))}
      </div>
      {current.material && (
        <div className="rdc-quiz__material">
          {current.material}
        </div>
      )}
      <p className="rdc-quiz__question">{current.question}</p>
      <div className="rdc-quiz__options">
        {current.options.map(opt => {
          const letter = opt[0];
          const selected = answers[current.id] === letter;
          const isAnswer = currentAnswered && letter === current.answer;
          const isWrong = currentAnswered && selected && letter !== current.answer;
          return (
            <button key={opt} type="button"
              className={["rdc-quiz__option", selected ? "selected" : "", isAnswer ? "answer" : "", isWrong ? "wrong" : ""].join(" ")}
              onClick={() => handleAnswer(current.id, letter)}
              disabled={currentAnswered}
            >{opt}</button>
          );
        })}
      </div>
      {currentAnswered && (
        <AnalysisCard
          options={current.options}
          answer={current.answer}
          optionsAnalysis={current.optionsAnalysis}
          explanation={current.explanation}
        />
      )}
      {currentAnswered && (
        <div className="rdc-quiz__actions">
          <button type="button" className="rdc-quiz__btn rdc-quiz__btn--primary" aria-label={isLast ? "查看结果" : "下一题"} onClick={handleNext}>
            {isLast ? "查看结果" : "下一题 →"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Content renderer ────────────────────────────────────── */
function renderInlineStrong(text) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function ContentPanel({ node }) {
  if (!node.content) return null;
  return (
    <div className="rdc-content">
      {node.content.split("\n").map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        if (line.trim().startsWith("•")) return <p key={i} className="rdc-content__bullet">{renderInlineStrong(line)}</p>;
        if (/^\d+\./.test(line.trim())) return <p key={i} className="rdc-content__numbered">{renderInlineStrong(line)}</p>;
        return <p key={i} className="rdc-content__para">{renderInlineStrong(line)}</p>;
      })}
    </div>
  );
}

/* ── Tree node ───────────────────────────────────────────── */
export function findAncestors(nodes, targetId, path = []) {
  for (const node of nodes) {
    if (node.id === targetId) return [...path, node.id];
    if (node.children) {
      const found = findAncestors(node.children, targetId, [...path, node.id]);
      if (found) return found;
    }
  }
  return null;
}

function getTreeNodeIcon({ hasChildren, hasContent, isOpen }) {
  if (hasChildren) return isOpen ? "▾" : "▸";
  if (hasContent) return isOpen ? "−" : "+";
  return "·";
}

function TreeNodeBody({ activeId, completedIds, depth, expandedIds, hasChildren, hasContent, node, onComplete }) {
  return (
    <div className="rdc-node__body">
      {hasContent && <ContentPanel node={node} />}
      {node.quiz?.length > 0 && (
        <InlineQuiz
          quiz={node.quiz}
          onDone={({ correct, total }) => onComplete?.(node.id, { quizCorrect: correct, quizTotal: total })}
        />
      )}
      {hasChildren && (
        <div className="rdc-node__children">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1}
              activeId={activeId} expandedIds={expandedIds}
              completedIds={completedIds} onComplete={onComplete} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeNode({ node, depth, activeId, expandedIds, completedIds, onComplete }) {
  // null = 跟随 expandedIds（deep-link 展开）；用户点击后以本地状态为准，保证可折叠
  const [open, setOpen] = useState(null);
  const hasChildren = !!(node.children?.length);
  const hasContent = !!node.content;
  const forceOpen = expandedIds?.has(node.id) ?? false;
  const isOpen = open ?? forceOpen;
  const isActive = activeId === node.id;
  const isDone = completedIds?.has(node.id);

  function handleToggle() {
    if (!hasChildren && !hasContent) return;
    const willOpen = !isOpen;
    setOpen(willOpen);
    if (willOpen && !hasChildren && hasContent) onComplete?.(node.id);
  }

  const icon = getTreeNodeIcon({ hasChildren, hasContent, isOpen });

  return (
    <div
      id={`rdc-node-${node.id}`}
      className={[
        "rdc-node",
        `rdc-node--depth-${Math.min(depth, 4)}`,
        isActive ? "rdc-node--active" : "",
        isDone ? "rdc-node--done" : "",
      ].join(" ")}
    >
      <button
        type="button"
        className={`rdc-node__label ${isOpen ? "is-open" : ""} ${!hasChildren && !hasContent ? "is-empty" : ""}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "收起" : "打开"}${node.title}`}
      >
        <span className="rdc-node__icon">{icon}</span>
        <span className="rdc-node__title">{node.title}</span>
        {isDone && <span className="rdc-node__check" aria-label="已完成">✓</span>}
      </button>
      {isOpen && (
        <TreeNodeBody
          activeId={activeId}
          completedIds={completedIds}
          depth={depth}
          expandedIds={expandedIds}
          hasChildren={hasChildren}
          hasContent={hasContent}
          node={node}
          onComplete={onComplete}
        />
      )}
    </div>
  );
}

export function countLeafs(nodes) {
  let n = 0;
  for (const node of nodes) {
    if (node.children?.length) n += countLeafs(node.children);
    else if (node.content) n += 1;
  }
  return n;
}
