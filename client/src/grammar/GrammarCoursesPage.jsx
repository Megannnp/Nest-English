import { useState, useMemo, useEffect, useRef } from "react";

import GrammarAnalysisCard from "./GrammarAnalysisCard.jsx";
import { GRAMMAR_COURSE_CONTENT } from "./grammarCourseContent.js";
import GrammarTopBar from "./GrammarTopBar.jsx";
import { GRAMMAR_TREE as GRAMMAR_TREE_STRUCTURE } from "./grammarTree.js";
import GrammarTreeMap from "./grammarTreeMap.jsx";
import { grammarAPI } from "../api/index.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./grammar.css";

// The tree ships structure only; lesson bodies and quizzes live in a separate
// module so the other grammar pages never pull in the ~116KB content payload.
// This page is the one consumer that needs both, so it merges them by node id.
function withCourseContent(nodes) {
  return nodes.map((node) => {
    if (node.children?.length) {
      return { ...node, children: withCourseContent(node.children) };
    }
    const lesson = GRAMMAR_COURSE_CONTENT[node.id];
    return lesson ? { ...node, ...lesson } : node;
  });
}

const GRAMMAR_TREE = withCourseContent(GRAMMAR_TREE_STRUCTURE);

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
      <div className="gc-quiz">
        <div className="gc-quiz__result">
          <span className="gc-quiz__result-score">{correct} / {quiz.length} 正确</span>
          <button type="button" className="gc-quiz__btn gc-quiz__btn--ghost" onClick={handleRedo}>重做一遍</button>
        </div>
      </div>
    );
  }

  return (
    <div className="gc-quiz">
      <div className="gc-quiz__header">
        <span className="gc-quiz__label">随堂小测</span>
        <span className="gc-quiz__count">{currentIndex + 1} / {quiz.length}</span>
      </div>
      <div className="gc-quiz__progress">
        {quiz.map((q, i) => (
          <div key={i} className={`gc-quiz__dot ${answers[q.id] === q.answer ? "correct" : ""} ${answers[q.id] && answers[q.id] !== q.answer ? "wrong" : ""} ${i === currentIndex ? "current" : ""} ${i < currentIndex ? "done" : ""}`} />
        ))}
      </div>
      <p className="gc-quiz__question">{current.question}</p>
      <div className="gc-quiz__options">
        {current.options.map(opt => {
          const letter = opt[0];
          const selected = answers[current.id] === letter;
          const isAnswer = currentAnswered && letter === current.answer;
          const isWrong = currentAnswered && selected && letter !== current.answer;
          return (
            <button key={opt} type="button"
              className={`gc-quiz__option ${selected ? "selected" : ""} ${isAnswer ? "answer" : ""} ${isWrong ? "wrong" : ""}`}
              onClick={() => handleAnswer(current.id, letter)}
              disabled={currentAnswered}
            >{opt}</button>
          );
        })}
      </div>
      {currentAnswered && (
        <GrammarAnalysisCard
          options={current.options}
          answer={current.answer}
          optionsAnalysis={current.optionsAnalysis}
          explanation={current.explanation}
        />
      )}
      {currentAnswered && (
        <div className="gc-quiz__actions">
          <button type="button" className="gc-quiz__btn gc-quiz__btn--primary" aria-label={isLast ? "查看结果" : "下一题"} onClick={handleNext}>
            {isLast ? "查看结果" : "下一题 →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── 查找节点及其所有祖先 id ──────────────────────────────────
function findAncestors(nodes, targetId, path = []) {
  for (const node of nodes) {
    if (node.id === targetId) return [...path, node.id];
    if (node.children) {
      const found = findAncestors(node.children, targetId, [...path, node.id]);
      if (found) return found;
    }
  }
  return null;
}

// ── 内容渲染 ──────────────────────────────────────────────────
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
    <div className="gc-content">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        if (line.trim().startsWith("•")) {
          return <p key={i} className="gc-content__bullet">{renderInlineStrong(line)}</p>;
        }
        if (/^\d+\./.test(line.trim())) {
          return <p key={i} className="gc-content__numbered">{renderInlineStrong(line)}</p>;
        }
        return <p key={i} className="gc-content__para">{renderInlineStrong(line)}</p>;
      })}
      {node.video && (
        <div className="gc-content__video">
          <a href={node.video} target="_blank" rel="noopener noreferrer" className="gc-content__video-link">
            ▶ 观看视频讲解
          </a>
        </div>
      )}
    </div>
  );
}

function _getNodeIcon(hasChildren, hasContent, isOpen) {
  if (hasChildren) return isOpen ? "▾" : "▸";
  if (hasContent) return isOpen ? "−" : "+";
  return "·";
}

function _getNodeButtonClass(isOpen, hasChildren, hasContent) {
  const openClass = isOpen ? "is-open" : "";
  const emptyClass = !hasChildren && !hasContent ? "is-empty" : "";
  return `gc-node__label ${openClass} ${emptyClass}`;
}

// ── 树节点 ──────────────────────────────────────────────────
function TreeNode({ node, depth, activeId, expandedIds, completedIds, onComplete, onView }) {
  const [open, setOpen] = useState(() => expandedIds?.has(node.id) || false);
  const hasChildren = !!(node.children?.length);
  const hasContent = !!node.content;
  const isActive = activeId === node.id;
  const isOpen = open;
  const isDone = completedIds?.has(node.id);

  useEffect(() => {
    if (expandedIds?.has(node.id)) setOpen(true);
  }, [expandedIds, node.id]);

  function handleToggle() {
    if (!hasChildren && !hasContent) return;
    const willOpen = !isOpen;
    setOpen(willOpen);
    if (willOpen && !hasChildren && hasContent) {
      if (node.quiz?.length) {
        onView?.(node.id);
      } else {
        onComplete?.(node.id);
      }
    }
  }

  return (
    <div
      id={`gc-node-${node.id}`}
      className={`gc-node gc-node--depth-${Math.min(depth, 4)} ${isActive ? "gc-node--active" : ""} ${isDone ? "gc-node--done" : ""}`}
    >
      <button
        type="button"
        className={_getNodeButtonClass(isOpen, hasChildren, hasContent)}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "收起" : "打开"}${node.title}`}
      >
        <span className="gc-node__icon">
          {_getNodeIcon(hasChildren, hasContent, isOpen)}
        </span>
        <span className="gc-node__title">{node.title}</span>
        {isDone && <span className="gc-node__check" aria-label="已完成">✓</span>}
      </button>

      {isOpen && (
        <div className="gc-node__body">
          {hasContent && <ContentPanel node={node} />}
          {node.quiz && node.quiz.length > 0 && (
            <InlineQuiz
              quiz={node.quiz}
              onDone={({ correct, total }) => onComplete?.(node.id, { quizCorrect: correct, quizTotal: total })}
            />
          )}
          {hasChildren && (
            <div className="gc-node__children">
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  activeId={activeId}
                  expandedIds={expandedIds}
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
    if (node.children && node.children.length > 0) {
      count += countLeafNodes(node.children);
    } else if (node.content) {
      count += 1;
    }
  }
  return count;
}

function collectLeafNodeIds(nodes, ids = new Set()) {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      collectLeafNodeIds(node.children, ids);
    } else if (node.content) {
      ids.add(node.id);
    }
  }
  return ids;
}

function readSeedNodeId() {
  try {
    const seed = JSON.parse(sessionStorage.getItem("nestGrammarCoursesSeed") || "{}");
    if (seed.nodeId) {
      sessionStorage.removeItem("nestGrammarCoursesSeed");
      return seed.nodeId;
    }
  } catch {
    // Ignore malformed seed data.
  }
  return null;
}

// ── 主页面 ──────────────────────────────────────────────────
export default function GrammarCoursesPage({
  onNavigate, user, onLoginClick, onRegisterClick,
  activePage = "grammar-courses", onAccountClick,
  hideTopBar = false}) {
  const pageRef = useScrollReveal();
  const scrollTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(scrollTimerRef.current), []);

  const [seedNodeId] = useState(readSeedNodeId);
  const [activeId, setActiveId] = useState(seedNodeId || null);
  const [expandedIds, setExpandedIds] = useState(() => {
    if (!seedNodeId) return new Set();
    const ancestors = findAncestors(GRAMMAR_TREE, seedNodeId) || [seedNodeId];
    return new Set(ancestors);
  });
  const [completedIds, setCompletedIds] = useState(new Set());
  const [syncError, setSyncError] = useState(null);

  const totalLeafs = useMemo(() => countLeafNodes(GRAMMAR_TREE), []);
  const leafNodeIds = useMemo(() => collectLeafNodeIds(GRAMMAR_TREE), []);
  const completedCount = [...completedIds].filter((id) => leafNodeIds.has(id)).length;
  const progressPct = totalLeafs > 0 ? Math.round((completedCount / totalLeafs) * 100) : 0;

  // Load server-side progress and merge with any locally completed nodes.
  useEffect(() => {
    if (!user) return;
    grammarAPI.courseProgress().then(data => {
      if (data?.completedIds?.length) {
        setCompletedIds(prev => new Set([...prev, ...data.completedIds]));
      }
    }).catch(() => {});
  }, [user]);

  // Auto-scroll to seeded node once the page mounts
  useEffect(() => {
    if (!seedNodeId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`gc-node-${seedNodeId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(timer);
  }, [seedNodeId]);

  function saveProgress(payload) {
    grammarAPI.saveCourseProgress(payload).then(() => {
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
      saveProgress({
        nodeId: id,
        status: 'viewed',
        quizCorrect: 0,
        quizTotal: 0,
      });
    }
  }

  function retrySyncError() {
    if (!syncError?.payload) return;
    saveProgress(syncError.payload);
  }

  function handleNodeClick(id) {
    const ancestors = findAncestors(GRAMMAR_TREE, id) || [id];
    setExpandedIds(prev => {
      const next = new Set(prev);
      ancestors.forEach(a => next.add(a));
      return next;
    });
    setActiveId(id);
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const el = document.getElementById(`gc-node-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  }

  return (
    <div className="gm-page" ref={pageRef}>
      {!hideTopBar && (

        <GrammarTopBar
        onLogin={onLoginClick || (() => onNavigate?.("auth"))}
        onRegister={onRegisterClick || (() => onNavigate?.("auth"))}
        user={user}
        onNavigate={onNavigate}
        activePage={activePage}
        onAccountClick={onAccountClick}
      />

      )}

      <main className="gc-page">
        <PageHero
          eyebrow="筑巢语法 · 精讲"
          title="由浅入深，融会贯通。"
          description="展开每个知识点，逐步构建完整的语法体系。"
        />

        {syncError && (
          <div className="gc-sync-error" role="alert">
            <span>{syncError.message}</span>
            <button type="button" onClick={retrySyncError}>重试</button>
            <button type="button" onClick={() => setSyncError(null)} aria-label="关闭提示">×</button>
          </div>
        )}

        {completedCount > 0 && (
          <div className="gc-progress-bar-wrap studio-reveal">
            <div className="gc-progress-bar">
              <div className="gc-progress-bar__fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="gc-progress-bar__label">{completedCount} / {totalLeafs} · {progressPct}%</span>
          </div>
        )}

        <GrammarTreeMap onNodeClick={handleNodeClick} />

        <section className="gc-tree studio-reveal">
          {GRAMMAR_TREE.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              activeId={activeId}
              expandedIds={expandedIds}
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
