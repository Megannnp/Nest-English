import { useState, useMemo, useEffect } from "react";

import useVocabContent from "./useVocabContent.js";
import VocabTopBar from "./VocabTopBar.jsx";
import { vocabularyAPI } from "../api/index.js";
import { getPrepExamSystemId } from "../app/prepExamConfig.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./vocab.css";

function VocabAnalysisCard({ options, answer, optionsAnalysis, explanation }) {
  const hasPerOption = optionsAnalysis && Object.keys(optionsAnalysis).length > 0;
  return (
    <div className="gm-analysis-card">
      <div className="gm-analysis-card__title">题目解析</div>
      {options && hasPerOption ? (
        <div className="gm-analysis-card__options">
          {options.map(opt => {
            const letter = opt[0];
            const isAns = letter === answer;
            const analysis = optionsAnalysis[letter];
            return (
              <div key={letter} className={`gm-analysis-opt${isAns ? ' gm-analysis-opt--correct' : ' gm-analysis-opt--wrong'}`}>
                <span className={isAns ? '' : 'gm-analysis-opt__text--strike'}>{isAns ? '✓ ' : ''}{opt}</span>
                {analysis && <span className="gm-analysis-opt__reason">{analysis}</span>}
              </div>
            );
          })}
        </div>
      ) : null}
      {explanation && (
        <div className="gm-analysis-card__explanation">{explanation}</div>
      )}
    </div>
  );
}

function InlineQuiz({ quiz, onDone }) {
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    setAnswers({});
    setCurrentIndex(0);
    setAllDone(false);
  }, [quiz]);

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
    setAnswers({});
    setCurrentIndex(0);
    setAllDone(false);
  }

  if (allDone) {
    return (
      <div className="vc-course-quiz">
        <div className="vc-course-quiz__result">
          <span className="vc-course-quiz__result-score">{correct} / {quiz.length} 正确</span>
          <button type="button" className="vc-course-quiz__btn vc-course-quiz__btn--ghost" onClick={handleRedo}>重做一遍</button>
        </div>
      </div>
    );
  }

  return (
    <div className="vc-course-quiz">
      <div className="vc-course-quiz__header">
        <span className="vc-course-quiz__label">随堂小测</span>
        <span className="vc-course-quiz__count">{currentIndex + 1} / {quiz.length}</span>
      </div>
      <div className="vc-course-quiz__progress">
        {quiz.map((q, i) => (
          <div key={i} className={`vc-course-quiz__dot ${answers[q.id] === q.answer ? "correct" : ""} ${answers[q.id] && answers[q.id] !== q.answer ? "wrong" : ""} ${i === currentIndex ? "current" : ""} ${i < currentIndex ? "done" : ""}`} />
        ))}
      </div>
      <p className="vc-course-quiz__question">{current.question}</p>
      <div className="vc-course-quiz__options">
        {current.options.map(opt => {
          const letter = opt[0];
          const selected = answers[current.id] === letter;
          const isAnswer = currentAnswered && letter === current.answer;
          const isWrong = currentAnswered && selected && letter !== current.answer;
          return (
            <button key={opt} type="button"
              className={`vc-course-quiz__option ${selected ? "selected" : ""} ${isAnswer ? "answer" : ""} ${isWrong ? "wrong" : ""}`}
              onClick={() => handleAnswer(current.id, letter)}
              disabled={currentAnswered}
            >{opt}</button>
          );
        })}
      </div>
      {currentAnswered && (
        <VocabAnalysisCard
          options={current.options}
          answer={current.answer}
          optionsAnalysis={current.optionsAnalysis}
          explanation={current.explanation}
        />
      )}
      {currentAnswered && (
        <div className="vc-course-quiz__actions">
          <button type="button" className="vc-course-quiz__btn vc-course-quiz__btn--primary" aria-label={isLast ? "查看结果" : "下一题"} onClick={handleNext}>
            {isLast ? "查看结果" : "下一题 →"}
          </button>
        </div>
      )}
    </div>
  );
}

function renderInlineStrong(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function ContentPanel({ node }) {
  if (!node.content) return null;
  const lines = node.content.split("\n");
  return (
    <div className="vc-course-content">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        if (line.trim().startsWith("•")) {
          return <p key={i} className="vc-course-content__bullet">{renderInlineStrong(line)}</p>;
        }
        return <p key={i} className="vc-course-content__para">{renderInlineStrong(line)}</p>;
      })}
    </div>
  );
}

function getNodeIcon(hasChildren, hasContent, isOpen) {
  if (hasChildren) return isOpen ? "▾" : "▸";
  if (hasContent) return isOpen ? "−" : "+";
  return "·";
}

function getNodeLabelClass(isOpen, hasChildren, hasContent) {
  const openClass = isOpen ? "is-open" : "";
  const emptyClass = !hasChildren && !hasContent ? "is-empty" : "";
  return `vc-course-node__label ${openClass} ${emptyClass}`;
}

function TreeNode({ node, depth, completedIds, onComplete, onView }) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!(node.children?.length);
  const hasContent = !!node.content;
  const isDone = completedIds?.has(node.id);

  function handleToggle() {
    if (!hasChildren && !hasContent) return;
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && !hasChildren && hasContent) {
      if (node.quiz?.length) onView?.(node.id);
      else onComplete?.(node.id);
    }
  }

  return (
    <div className={`vc-course-node vc-course-node--depth-${Math.min(depth, 4)} ${isDone ? "vc-course-node--done" : ""}`}>
      <button type="button" className={getNodeLabelClass(open, hasChildren, hasContent)} aria-label={`${open ? "收起" : "打开"}${node.title}`} onClick={handleToggle} aria-expanded={open}>
        <span className="vc-course-node__icon">{getNodeIcon(hasChildren, hasContent, open)}</span>
        <span className="vc-course-node__title">{node.title}</span>
        {isDone && <span className="vc-course-node__check" aria-label="已完成">✓</span>}
      </button>

      {open && (
        <div className="vc-course-node__body">
          {hasContent && <ContentPanel node={node} />}
          {node.quiz?.length > 0 && (
            <InlineQuiz
              quiz={node.quiz}
              onDone={({ correct, total }) => onComplete?.(node.id, { quizCorrect: correct, quizTotal: total })}
            />
          )}
          {hasChildren && (
            <div className="vc-course-node__children">
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  completedIds={completedIds}
                  onComplete={onComplete}
                  onView={onView}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function countLeafNodes(nodes) {
  let count = 0;
  for (const node of nodes) {
    if (node.children?.length > 0) count += countLeafNodes(node.children);
    else if (node.content) count += 1;
  }
  return count;
}

function collectLeafNodeIds(nodes, result = new Set()) {
  for (const node of nodes) {
    if (node.children?.length > 0) collectLeafNodeIds(node.children, result);
    else if (node.content) result.add(node.id);
  }
  return result;
}

export default function VocabCoursesPage({
  onNavigate, user, onLoginClick, onRegisterClick,
  activePage = "vocab-courses", onAccountClick,
  prepExamId = "",
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const systemId = getPrepExamSystemId(prepExamId);
  const { courseTree } = useVocabContent({ systemId });

  const [completedIds, setCompletedIds] = useState(new Set());
  const [syncError, setSyncError] = useState(null);

  const totalLeafs = useMemo(() => countLeafNodes(courseTree), [courseTree]);
  const leafNodeIds = useMemo(() => collectLeafNodeIds(courseTree), [courseTree]);
  const completedCount = [...completedIds].filter((id) => leafNodeIds.has(id)).length;
  const progressPct = totalLeafs > 0 ? Math.min(100, Math.round((completedCount / totalLeafs) * 100)) : 0;

  useEffect(() => {
    if (!user) return;
    vocabularyAPI.courseProgress().then(data => {
      if (data?.completedIds?.length) {
        setCompletedIds(prev => new Set([...prev, ...data.completedIds].filter((id) => leafNodeIds.has(id))));
      }
    }).catch(() => {});
  }, [user, leafNodeIds]);

  function saveProgress(payload) {
    vocabularyAPI.saveCourseProgress(payload).then(() => {
      setSyncError(prev => (prev?.payload?.nodeId === payload.nodeId ? null : prev));
    }).catch(() => {
      setSyncError({ payload, message: "进度保存失败，本次学习记录可能不会被记住。" });
    });
  }

  function handleComplete(id, quizStats = {}) {
    setCompletedIds(prev => {
      if (prev.has(id)) return prev;
      return new Set([...prev, id]);
    });
    if (user) {
      saveProgress({
        nodeId: id,
        status: 'completed',
        quizCorrect: quizStats.quizCorrect ?? 0,
        quizTotal: quizStats.quizTotal ?? 0,
      });
    }
  }

  function handleView(id) {
    if (completedIds.has(id)) return;
    if (user) {
      saveProgress({ nodeId: id, status: 'viewed', quizCorrect: 0, quizTotal: 0 });
    }
  }

  function retrySyncError() {
    if (!syncError?.payload) return;
    saveProgress(syncError.payload);
  }

  return (
    <div className="vc-page" ref={pageRef}>
      {!hideTopBar && (
        <VocabTopBar
          onLogin={onLoginClick || (() => onNavigate?.("auth"))}
          onRegister={onRegisterClick || (() => onNavigate?.("auth"))}
          user={user}
          onNavigate={onNavigate}
          activePage={activePage}
          onAccountClick={onAccountClick}
        />
      )}

      <main className="vc-course-page">
        <PageHero
          eyebrow="筑巢词汇 · 精讲"
          title="不止背单词，更会记单词。"
          description="展开每个知识点，学习词根词缀、语境推断和高效记忆策略。"
        />

        {syncError && (
          <div className="vc-course-sync-error" role="alert">
            <span>{syncError.message}</span>
            <button type="button" onClick={retrySyncError}>重试</button>
            <button type="button" onClick={() => setSyncError(null)} aria-label="关闭提示">×</button>
          </div>
        )}

        {completedCount > 0 && (
          <div className="vc-course-progress-bar-wrap studio-reveal">
            <div className="vc-course-progress-bar">
              <div className="vc-course-progress-bar__fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="vc-course-progress-bar__label">{completedCount} / {totalLeafs} · {progressPct}%</span>
          </div>
        )}

        <section className="vc-course-tree studio-reveal">
          {courseTree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              completedIds={completedIds}
              onComplete={handleComplete}
              onView={handleView}
            />
          ))}
        </section>
      </main>
    </div>
  );
}
